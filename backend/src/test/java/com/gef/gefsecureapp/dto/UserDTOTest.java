package com.gef.gefsecureapp.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Cubre C7 (auditoria docs/20-08-26/AUDITORIA_END_TO_END.md): antes UserDTO.Request.role
 *  solo tenia @Size, sin validar contra el catalogo real de roles. */
class UserDTOTest {

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    private UserDTO.Request base(String role) {
        return UserDTO.Request.builder().username("u1").password("pw").role(role).build();
    }

    @Test
    void role_aceptaLosCuatroRolesValidos() {
        for (String role : new String[]{"ADMIN", "SECURITY_ANALYST", "ASSET_OWNER", "AUDITOR"}) {
            Set<ConstraintViolation<UserDTO.Request>> violations = VALIDATOR.validate(base(role), UserDTO.OnCreate.class);
            assertThat(violations).as("rol %s", role).isEmpty();
        }
    }

    @Test
    void role_rechazaUnValorConTypo() {
        Set<ConstraintViolation<UserDTO.Request>> violations = VALIDATOR.validate(base("Asset_Owner"), UserDTO.OnCreate.class);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("role"));
    }

    @Test
    void role_rechazaNulo() {
        Set<ConstraintViolation<UserDTO.Request>> violations = VALIDATOR.validate(base(null), UserDTO.OnCreate.class);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("role"));
    }

    @Test
    void role_rechazaVacio() {
        Set<ConstraintViolation<UserDTO.Request>> violations = VALIDATOR.validate(base(""), UserDTO.OnCreate.class);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("role"));
    }
}
