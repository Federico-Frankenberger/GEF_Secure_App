package com.gef.gefsecureapp.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

/** Cubre C7 (auditoria docs/20-08-26/AUDITORIA_END_TO_END.md): isAssetOwner() era fail-open
 *  -- cualquier rol que no fuera exactamente "ASSET_OWNER" veia todo sin restriccion. */
class CurrentUserTest {

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void isAssetOwner_falseParaLosTresRolesConocidosSinRestriccion() {
        for (String role : new String[]{"ADMIN", "SECURITY_ANALYST", "AUDITOR"}) {
            TestAuth.loginAs(1L, "user", role);
            assertThat(CurrentUser.isAssetOwner()).as("rol %s", role).isFalse();
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    void isAssetOwner_trueParaAssetOwner() {
        TestAuth.loginAs(1L, "owner.demo", "ASSET_OWNER");
        assertThat(CurrentUser.isAssetOwner()).isTrue();
    }

    @Test
    void isAssetOwner_failClosed_rolDesconocidoSeTrataComoAssetOwner() {
        TestAuth.loginAs(1L, "raro", "Asset_Owner"); // typo de mayusculas -- no matchea la constante exacta
        assertThat(CurrentUser.isAssetOwner()).isTrue();
    }

    @Test
    void isAssetOwner_failClosed_rolNuloSeTrataComoAssetOwner() {
        TestAuth.loginAs(1L, "raro", null);
        assertThat(CurrentUser.isAssetOwner()).isTrue();
    }
}
