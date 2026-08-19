package com.gef.gefsecureapp.security;

/** Principal del Authentication de Spring Security una vez validado el JWT — evita pegarle a la base para saber quién sos en cada request. */
public record AuthenticatedPrincipal(Long id, String username, String role) {
}
