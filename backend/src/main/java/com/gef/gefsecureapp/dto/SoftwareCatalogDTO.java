package com.gef.gefsecureapp.dto;

import lombok.*;

public class SoftwareCatalogDTO {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private Long id;
        private String packageName;
        private String ecosystem;
        private String displayName;
    }
}
