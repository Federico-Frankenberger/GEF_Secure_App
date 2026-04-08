package com.gef.gefsecureapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

public class AssetDTO {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Request {
        @NotBlank(message = "El nombre es requerido")
        @Size(max = 255)
        private String name;

        @NotBlank(message = "El software es requerido")
        @Size(max = 255)
        private String software;

        @Size(max = 50)
        private String ecosystem;

        @Size(max = 50)
        private String version;

        @Size(max = 20)
        private String criticality;

        private String description;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String name;
        private String software;
        private String ecosystem;
        private String version;
        private String criticality;
        private LocalDateTime lastScan;
        private String description;
    }
}
