package com.gef.gefsecureapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

public class SoftwareComponentDTO {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        @NotBlank(message = "El nombre es requerido")
        @Size(max = 255)
        private String name;

        @NotBlank(message = "El software es requerido")
        @Size(max = 255)
        private String software;

        @NotBlank(message = "El ecosistema es requerido")
        @Size(max = 50)
        private String ecosystem;

        @Size(max = 50)
        private String version;

        @NotNull(message = "El activo es requerido")
        private Long assetId;

        private String description;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String name;
        private String software;
        private String ecosystem;
        private String version;
        private Long environmentId;
        private String environmentName;
        private String businessCriticality;
        private Long assetId;
        private String assetName;
        private LocalDateTime lastScan;
        private String description;
        private boolean catalogued;
        private String purl;
    }
}
