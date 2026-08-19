package com.gef.gefsecureapp.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long defaultExpirationMinutes;

    public JwtService(@Value("${jwt.secret}") String secret,
                       @Value("${jwt.expiration-minutes}") long defaultExpirationMinutes) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.defaultExpirationMinutes = defaultExpirationMinutes;
    }

    public String generateToken(Long id, String username, String role) {
        return generateToken(id, username, role, defaultExpirationMinutes);
    }

    /** Expiracion explicita — usada por los tests para forzar un token ya vencido (minutos negativos). */
    public String generateToken(Long id, String username, String role, long expirationMinutes) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(username)
                .claim("id", id)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    /** Lanza JwtException (o una subclase: ExpiredJwtException, SignatureException, MalformedJwtException, ...) si el token no es valido. */
    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
