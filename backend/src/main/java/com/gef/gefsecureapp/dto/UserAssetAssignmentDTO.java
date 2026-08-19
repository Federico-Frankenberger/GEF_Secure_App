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
        private LocalDateTime assignedAt;
    }
}
