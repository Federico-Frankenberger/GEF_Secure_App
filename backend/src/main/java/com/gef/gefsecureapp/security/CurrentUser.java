package com.gef.gefsecureapp.security;

import org.springframework.security.core.context.SecurityContextHolder;

/** Acceso al usuario autenticado de la request actual, sin inyectar SecurityContextHolder en cada service. */
public final class CurrentUser {

    private CurrentUser() {}

    public static AuthenticatedPrincipal get() {
        return (AuthenticatedPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public static boolean isAssetOwner() {
        return "ASSET_OWNER".equals(get().role());
    }
}
