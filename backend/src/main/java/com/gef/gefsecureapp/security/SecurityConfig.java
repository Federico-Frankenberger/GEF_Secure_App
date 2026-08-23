package com.gef.gefsecureapp.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gef.gefsecureapp.exception.GlobalExceptionHandler;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    // Mismo criterio que el CORS que reemplaza (AppConfig, pre-Fase-3): orígenes
    // desde application.properties, sobreescribibles con ALLOWED_ORIGINS.
    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String[] allowedOrigins;

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final LoginRateLimitFilter loginRateLimitFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, AuthenticationEntryPoint unauthorizedEntryPoint) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                // n8n no es un usuario del sistema -- se valida con token compartido
                // dentro del propio controller (WebhookController), no con JWT.
                .requestMatchers("/api/webhook/scan-report").permitAll()
                .requestMatchers("/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                // CFG-06 (docs/20-08-26/AUDITORIA_END_TO_END.md): antes /actuator/** entero
                // era publico -- hoy solo expone health/info (nada sensible), pero si en el
                // futuro se habilita algo mas (env, beans, httptrace) con
                // management.endpoints.web.exposure.include, quedaria publico sin que nadie
                // tuviera que volver a tocar este archivo. Restringido de antemano.
                .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .exceptionHandling(eh -> eh.authenticationEntryPoint(unauthorizedEntryPoint))
            // DT-08 (docs/deuda-tecnica.md): antes de la cadena de auth -- así un intento
            // bloqueado ni siquiera llega a validar credenciales contra la base.
            .addFilterBefore(loginRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * 401 en JSON con el mismo formato que GlobalExceptionHandler, en vez de la pagina/redirect
     * por defecto de Spring Security. Usa el ObjectMapper administrado por Spring (no uno nuevo)
     * para que el timestamp salga como ISO string igual que el resto de los errores de la API —
     * un ObjectMapper armado a mano con "new" no hereda spring.jackson.serialization.write-dates-as-timestamps=false.
     */
    @Bean
    public AuthenticationEntryPoint unauthorizedEntryPoint(ObjectMapper mapper) {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            var body = new GlobalExceptionHandler.ErrorBody(401, "No autenticado");
            response.getWriter().write(mapper.writeValueAsString(body));
        };
    }
}
