package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50, unique = true, nullable = false)
    private String username;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(length = 100)
    private String email;

    @Column(length = 20)
    private String role;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Centro de Administración (docs/bitacora/23-08-26): desactivar en vez de borrar
    // físicamente cuando el usuario tiene historial (asignaciones, vulnerabilidades
    // asignadas, transiciones de estado como actor) -- ver AuthService.login() y
    // UserService.setActive().
    @Column(nullable = false)
    private Boolean active;
}
