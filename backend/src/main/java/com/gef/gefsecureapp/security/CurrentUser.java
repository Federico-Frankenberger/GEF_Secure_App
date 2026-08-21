package com.gef.gefsecureapp.security;

import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Set;

/** Acceso al usuario autenticado de la request actual, sin inyectar SecurityContextHolder en cada service. */
public final class CurrentUser {

    // C7 (docs/20-08-26/AUDITORIA_END_TO_END.md): antes isAssetOwner() era fail-open
    // ("si no es exactamente ASSET_OWNER, ve todo") -- se invierte a fail-closed: solo
    // estos 3 roles conocidos ven sin restriccion, cualquier otro valor (incluido uno
    // corrupto/nulo/no reconocido) se trata como el mas restrictivo.
    private static final Set<String> UNRESTRICTED_ROLES = Set.of("ADMIN", "SECURITY_ANALYST", "AUDITOR");

    private CurrentUser() {}

    public static AuthenticatedPrincipal get() {
        return (AuthenticatedPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public static boolean isAssetOwner() {
        String role = get().role();
        return role == null || !UNRESTRICTED_ROLES.contains(role);
    }
}
