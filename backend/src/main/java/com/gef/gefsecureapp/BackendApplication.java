package com.gef.gefsecureapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

// Se excluye UserDetailsServiceAutoConfiguration: la autenticacion es manual via
// JWT (JwtAuthenticationFilter + AuthService), no se usa el AuthenticationManager
// de Spring Security, asi que el usuario en memoria autogenerado (con password
// aleatoria en cada arranque) es ruido sin proposito real.
// EnableScheduling: requerido por ScanService.closeStaleRunningScans() (watchdog,
// docs/22-08-26/AUDITORIA_END_TO_END.md) -- sin esto @Scheduled no corre nunca.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableScheduling
public class BackendApplication {
	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}
}
