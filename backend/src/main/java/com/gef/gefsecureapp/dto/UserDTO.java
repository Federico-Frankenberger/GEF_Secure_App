package com.gef.gefsecureapp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

public class UserDTO {

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

        @Size(max = 20)
        private String role;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String username;
        private String fullName;
        private String email;
        private String role;
        private LocalDateTime createdAt;
    }
}
