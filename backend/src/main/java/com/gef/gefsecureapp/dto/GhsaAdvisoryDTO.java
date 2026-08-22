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
    // Fase 8 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md), Componente D.
    private Boolean reviewed;
    private LocalDateTime withdrawnAt;
}
