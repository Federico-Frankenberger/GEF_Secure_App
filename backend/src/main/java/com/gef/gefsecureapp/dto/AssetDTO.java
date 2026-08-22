package com.gef.gefsecureapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

public class AssetDTO {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        @NotBlank(message = "El nombre es requerido")
        @Size(max = 150)
        private String name;

        @Size(max = 30)
        private String assetType;

        private Long environmentId;

        private String description;

        // Fase 10, opcional (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md):
        // declarado a mano, null = no declarado todavia (no se asume "no expuesto").
        private Boolean exposed;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String name;
        private String assetType;
        private Long environmentId;
        private String environmentName;
        private String description;
        private LocalDateTime createdAt;
        private Boolean exposed;
    }

    /** Activo eliminado logicamente, para el panel de restauracion. */
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DeletedResponse {
        private Long id;
        private String name;
        private String assetType;
        private String environmentName;
        private LocalDateTime deletedAt;
        private long componentsCount;
    }
}
