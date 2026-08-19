package com.gef.gefsecureapp.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "unit-test-secret-key-at-least-32-bytes-long-000000";

    private JwtService service() {
        return new JwtService(SECRET, 480);
    }

    @Test
    @DisplayName("genera un token y despues lo parsea recuperando id, username y role")
    void generateToken_and_parseClaims_roundTrip() {
        JwtService jwtService = service();

        String token = jwtService.generateToken(1L, "fede.frankenberger", "ADMIN");
        var claims = jwtService.parseClaims(token);

        assertThat(claims.getSubject()).isEqualTo("fede.frankenberger");
        assertThat(claims.get("role", String.class)).isEqualTo("ADMIN");
        assertThat(claims.get("id", Long.class)).isEqualTo(1L);
    }

    @Test
    @DisplayName("un token vencido falla al parsear con ExpiredJwtException")
    void parseClaims_should_throwExpired_when_tokenExpired() {
        JwtService jwtService = service();

        // Expiracion en el pasado (minutos negativos) para forzar el vencimiento
        String expiredToken = jwtService.generateToken(2L, "auditor.demo", "AUDITOR", -1);

        assertThatThrownBy(() -> jwtService.parseClaims(expiredToken))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    @DisplayName("un token firmado con otra clave falla al parsear con SignatureException")
    void parseClaims_should_throwSignatureException_when_signedWithDifferentSecret() {
        JwtService signer = new JwtService("otra-clave-distinta-de-al-menos-32-bytes-para-firmar", 480);
        String tokenFirmadoConOtraClave = signer.generateToken(1L, "fede.frankenberger", "ADMIN");

        JwtService verifier = service();

        assertThatThrownBy(() -> verifier.parseClaims(tokenFirmadoConOtraClave))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    @DisplayName("un token con texto invalido falla al parsear con JwtException")
    void parseClaims_should_throwJwtException_when_tokenMalformed() {
        JwtService jwtService = service();

        assertThatThrownBy(() -> jwtService.parseClaims("esto-no-es-un-jwt"))
                .isInstanceOf(JwtException.class);
    }
}
