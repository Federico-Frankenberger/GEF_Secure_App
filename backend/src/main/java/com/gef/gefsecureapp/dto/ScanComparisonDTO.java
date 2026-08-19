package com.gef.gefsecureapp.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/** Comparacion entre dos escaneos (Etapa 5 de la trazabilidad de escaneos, §11.8).
 *  Construido sobre VulnerabilityAuditService.findByScanReport, no sobre la FK
 *  scan_id cruda -- ver nota de diseño en el service. */
@Getter @Builder
public class ScanComparisonDTO {
    private Long scanAId;
    private Long scanBId;
    private List<VulnerabilityAuditDTO.Response> newInB;
    private List<VulnerabilityAuditDTO.Response> resolvedSinceA;
    private List<VulnerabilityAuditDTO.Response> persisting;
    private List<SeverityChange> severityChanges;

    @Getter @Builder
    public static class SeverityChange {
        private String cveId;
        private String priorityBefore;
        private String priorityAfter;
    }
}
