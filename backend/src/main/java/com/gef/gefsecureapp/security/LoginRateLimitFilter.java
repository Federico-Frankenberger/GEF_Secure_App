package com.gef.gefsecureapp.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gef.gefsecureapp.exception.GlobalExceptionHandler;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/** DT-08 (docs/deuda-tecnica.md): antes ningún endpoint del backend tenía límite de
 *  intentos -- expuesto a fuerza bruta sin freno. Acotado a `/api/auth/login`, el
 *  blanco real de un ataque de fuerza bruta (no tiene sentido limitar el resto de la
 *  API con el mismo criterio, esos ya requieren un JWT válido). Ventana fija en
 *  memoria (no Redis/bucket4j): suficiente para una sola instancia en Docker Compose,
 *  se reinicia con el proceso -- si el proyecto alguna vez corre en más de una
 *  instancia, esto necesitaría un store compartido, no antes. */
@Component
@RequiredArgsConstructor
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final String LOGIN_PATH = "/api/auth/login";
    private static final int MAX_ATTEMPTS = 10;
    private static final long WINDOW_MILLIS = 60_000; // 1 minuto

    private final ObjectMapper objectMapper;
    private final Map<String, Deque<Long>> attemptsByIp = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!isLoginRequest(request)) {
            chain.doFilter(request, response);
            return;
        }

        String ip = clientIp(request);
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = attemptsByIp.computeIfAbsent(ip, k -> new ConcurrentLinkedDeque<>());

        boolean limited;
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MILLIS) {
                timestamps.pollFirst();
            }
            limited = timestamps.size() >= MAX_ATTEMPTS;
            if (!limited) {
                timestamps.addLast(now);
            }
            // Evita que el mapa crezca sin límite con IPs de paso único que ya
            // vaciaron su ventana -- no hay otro mecanismo de limpieza periódica.
            if (timestamps.isEmpty()) {
                attemptsByIp.remove(ip, timestamps);
            }
        }

        if (limited) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            var body = new GlobalExceptionHandler.ErrorBody(429,
                    "Demasiados intentos de inicio de sesión. Esperá un minuto e intentá de nuevo.");
            response.getWriter().write(objectMapper.writeValueAsString(body));
            return;
        }

        chain.doFilter(request, response);
    }

    private boolean isLoginRequest(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod()) && LOGIN_PATH.equals(request.getRequestURI());
    }

    // X-Forwarded-For: relevante si algún día hay un proxy/load balancer adelante
    // (hoy no lo hay en Docker Compose local, pero no cuesta nada resolverlo bien).
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
