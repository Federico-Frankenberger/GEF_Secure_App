package com.gef.gefsecureapp.security;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

/** Helper de tests: simula lo que JwtAuthenticationFilter deja en el SecurityContext una vez validado un token. */
public final class TestAuth {
    private TestAuth() {}

    public static void loginAs(Long id, String username, String role) {
        var principal = new AuthenticatedPrincipal(id, username, role);
        var auth = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
