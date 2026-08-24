package com.gef.gefsecureapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

public class UserAssetAssignmentDTO {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        @NotNull(message = "El userId es requerido")
        private Long userId;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private Long userId;
        private String username;
        private String userFullName;
        private Long assetId;
        // Centro de Administración (docs/bitacora/23-08-26): agregado para la vista
        // por-usuario ("Usuarios y Accesos" en Configuración) -- antes esta respuesta
        // solo se consumía desde el flujo por-activo, donde el nombre del activo ya se
        // conocía de antemano (no hacía falta repetirlo acá).
        private String assetName;
        private LocalDateTime assignedAt;
    }
}
