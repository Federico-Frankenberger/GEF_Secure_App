package com.gef.gefsecureapp.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Fase 3 (docs/20-08-26/AUDITORIA_END_TO_END_2.md, normalizacion Maven): antes el alta manual
 *  aceptaba "spring-boot-starter-web" como coordenada Maven valida -- nunca matchea contra
 *  GitHub Advisory (exige "groupId:artifactId"), un falso negativo real confirmado en vivo. */
class SoftwareComponentDTOTest {

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    private SoftwareComponentDTO.Request base(String ecosystem, String software) {
        return SoftwareComponentDTO.Request.builder()
                .name("n").ecosystem(ecosystem).software(software).assetId(1L).build();
    }

    @Test
    void maven_rechazaArtifactIdSueltoSinGroupId() {
        Set<ConstraintViolation<SoftwareComponentDTO.Request>> violations =
                VALIDATOR.validate(base("maven", "spring-boot-starter-web"));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("software"));
    }

    @Test
    void maven_aceptaCoordenadaCompleta() {
        Set<ConstraintViolation<SoftwareComponentDTO.Request>> violations =
                VALIDATOR.validate(base("maven", "org.springframework.boot:spring-boot-starter-web"));
        assertThat(violations).isEmpty();
    }

    @Test
    void composer_rechazaPaqueteSueltoSinVendor() {
        Set<ConstraintViolation<SoftwareComponentDTO.Request>> violations =
                VALIDATOR.validate(base("composer", "contao"));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("software"));
    }

    @Test
    void composer_aceptaVendorSlashPaquete() {
        Set<ConstraintViolation<SoftwareComponentDTO.Request>> violations =
                VALIDATOR.validate(base("composer", "contao/contao"));
        assertThat(violations).isEmpty();
    }

    @Test
    void npm_noExigeNingunFormatoParticular() {
        Set<ConstraintViolation<SoftwareComponentDTO.Request>> violations =
                VALIDATOR.validate(base("npm", "express"));
        assertThat(violations).isEmpty();
    }

    @Test
    void ecosistemaDesconocido_noRompeLaValidacion() {
        Set<ConstraintViolation<SoftwareComponentDTO.Request>> violations =
                VALIDATOR.validate(base("docker", "postgres"));
        assertThat(violations).isEmpty();
    }
}
