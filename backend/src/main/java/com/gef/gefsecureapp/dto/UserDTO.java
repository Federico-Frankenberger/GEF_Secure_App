package com.gef.gefsecureapp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.groups.Default;
import lombok.*;
import java.time.LocalDateTime;

public class UserDTO {

    /** Grupo de validación para el alta: extiende Default para no perder las demás validaciones (username, email, ...). */
    public interface OnCreate extends Default {}

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        @NotBlank(message = "El username es requerido")
        @Size(max = 50)
        private String username;

        @Size(max = 100)
        private String fullName;

        @Email
        @Size(max = 100)
        private String email;

        // C7 (docs/20-08-26/AUDITORIA_END_TO_END.md): antes solo tenia @Size, sin validar
        // contra el catalogo real de roles -- un typo (ej. "Asset_Owner") ya lo rechazaba
        // el CHECK de la base (init/06-rbac.sql), pero como respuesta 500 cruda en vez de
        // un 400 legible, y NULL pasaba el CHECK sin problema (NULL satisface un CHECK).
        @NotBlank(message = "El rol es requerido")
        @Pattern(regexp = "ADMIN|SECURITY_ANALYST|ASSET_OWNER|AUDITOR", message = "Rol inválido")
        private String role;

        // Obligatoria solo al crear (grupo OnCreate); en el update, en blanco = no cambia el hash existente.
        @NotBlank(message = "La contraseña es requerida", groups = OnCreate.class)
        private String password;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String username;
        private String fullName;
        private String email;
        private String role;
        private LocalDateTime createdAt;
        private Boolean active;
    }

    /** Body de PATCH /api/users/{id}/active -- acción explícita separada del PUT
     *  genérico, no un campo más de un form de edición completa. */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ActiveRequest {
        @NotNull(message = "El campo active es requerido")
        private Boolean active;
    }
}
