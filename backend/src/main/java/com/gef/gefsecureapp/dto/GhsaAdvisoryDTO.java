package com.gef.gefsecureapp.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter @Builder
public class GhsaAdvisoryDTO {
    private String ghsaId;
    private String summary;
    private String description;
    private List<String> references;
    private LocalDateTime cachedAt;
}
