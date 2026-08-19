package com.gef.gefsecureapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// Se excluye UserDetailsServiceAutoConfiguration: la autenticacion es manual via
// JWT (JwtAuthenticationFilter + AuthService), no se usa el AuthenticationManager
// de Spring Security, asi que el usuario en memoria autogenerado (con password
// aleatoria en cada arranque) es ruido sin proposito real.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class BackendApplication {
	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}
}
