package com.gef.gefsecureapp.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Cubre A3/CFG-02/CFG-03 (auditoria docs/20-08-26/AUDITORIA_END_TO_END.md). */
class SecretsValidatorTest {

    private SecretsValidator validatorWithProfile(String... profiles) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profiles);
        return new SecretsValidator(env);
    }

    @Test
    void sinPerfilProd_secretosVacios_noRompeElArranque() {
        SecretsValidator validator = validatorWithProfile(); // sin perfiles, como el docker-compose actual
        ReflectionTestUtils.setField(validator, "jwtSecret", "");
        ReflectionTestUtils.setField(validator, "internalToken", "");

        assertThatCode(validator::validate).doesNotThrowAnyException();
    }

    @Test
    void conPerfilProd_secretosVacios_rompeElArranque() {
        SecretsValidator validator = validatorWithProfile("prod");
        ReflectionTestUtils.setField(validator, "jwtSecret", "");
        ReflectionTestUtils.setField(validator, "internalToken", "algo-real");

        assertThatThrownBy(validator::validate).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void conPerfilProd_secretosConElDefaultDeEjemplo_rompeElArranque() {
        SecretsValidator validator = validatorWithProfile("prod");
        ReflectionTestUtils.setField(validator, "jwtSecret", "dev-only-insecure-jwt-secret-please-override-in-prod-32chars-min");
        ReflectionTestUtils.setField(validator, "internalToken", "algo-real");

        assertThatThrownBy(validator::validate).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void conPerfilProd_secretosConfiguradosDeVerdad_noRompeElArranque() {
        SecretsValidator validator = validatorWithProfile("prod");
        ReflectionTestUtils.setField(validator, "jwtSecret", "un-secreto-generado-de-verdad-32-caracteres-o-mas");
        ReflectionTestUtils.setField(validator, "internalToken", "un-token-interno-real");

        assertThatCode(validator::validate).doesNotThrowAnyException();
    }
}
