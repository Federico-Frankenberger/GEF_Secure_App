package com.gef.gefsecureapp.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** A3/CFG-02/CFG-03 (docs/20-08-26/AUDITORIA_END_TO_END.md): jwt.secret y
 *  n8n.internal-token tienen un default inseguro versionado en application.properties
 *  (para poder levantar el backend local sin configurar nada) — y si la variable de
 *  entorno queda definida pero vacía (pasa hoy con N8N_INTERNAL_TOKEN en el .env de
 *  este proyecto), el placeholder ${VAR:default} tampoco cae al default, ambos lados
 *  simplemente coinciden en "".
 *
 *  Falla el arranque solo cuando el perfil "prod" está activo (opt-in explícito, no
 *  rompe el docker-compose de desarrollo actual, que no declara ningún perfil) y
 *  alguno de los dos secretos está vacío o sigue siendo el default de ejemplo. */
@Component
@Slf4j
public class SecretsValidator {

    private static final String DEFAULT_JWT_SECRET =
            "dev-only-insecure-jwt-secret-please-override-in-prod-32chars-min";
    private static final String DEFAULT_INTERNAL_TOKEN = "dev-only-insecure-internal-token";

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${n8n.internal-token}")
    private String internalToken;

    private final Environment environment;

    public SecretsValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    void validate() {
        boolean isProd = java.util.Arrays.asList(environment.getActiveProfiles()).contains("prod");
        if (!isProd) {
            if (isInsecure(jwtSecret, DEFAULT_JWT_SECRET) || isInsecure(internalToken, DEFAULT_INTERNAL_TOKEN)) {
                log.warn("jwt.secret y/o n8n.internal-token están vacíos o usan el valor de ejemplo -- " +
                        "aceptable solo en desarrollo local. Con el perfil 'prod' activo esto haría fallar el arranque.");
            }
            return;
        }
        if (isInsecure(jwtSecret, DEFAULT_JWT_SECRET)) {
            throw new IllegalStateException(
                    "JWT_SECRET no está configurado (o quedó vacío) con el perfil 'prod' activo. " +
                    "Generalo con: openssl rand -base64 32");
        }
        if (isInsecure(internalToken, DEFAULT_INTERNAL_TOKEN)) {
            throw new IllegalStateException(
                    "N8N_INTERNAL_TOKEN no está configurado (o quedó vacío) con el perfil 'prod' activo. " +
                    "Backend y n8n deben compartir el mismo valor.");
        }
    }

    private boolean isInsecure(String value, String knownDefault) {
        return !StringUtils.hasText(value) || knownDefault.equals(value);
    }
}
