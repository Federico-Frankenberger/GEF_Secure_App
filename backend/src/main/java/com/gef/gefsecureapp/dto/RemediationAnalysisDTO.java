package com.gef.gefsecureapp.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

/** Pestaña "Remediación" del Centro de Informes (docs/bitacora/23-08-26,
 *  prompt_mejora_informes_gef_secure.md, sección 6): responde "¿estamos resolviendo de
 *  forma eficiente?" -- MTTR/SLA son snapshots de siempre (mismos que ya calcula
 *  DashboardService, reusados tal cual); `outcomeBreakdown`/`evidenceLevelBreakdown` sí
 *  están acotados a `days` porque son agregaciones nuevas sobre datos que hasta ahora
 *  nadie leía para reporting (AssetVulnerability.outcome, StateTransition.evidenceLevel). */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RemediationAnalysisDTO {
    private int days;
    private Double mttrDeclaredDays;
    private Double mttrVerifiedDays;
    // priority/avgDays por fila.
    private List<Map<String, Object>> mttrByCriticality;
    private Long slaOverdueCount;
    private Long slaUpcomingCount;
    private Long slaOnTrackCount;
    // outcome/count por fila -- outcome puede ser null (cierre "plano", sin clasificar VEX).
    private List<Map<String, Object>> outcomeBreakdown;
    // evidenceLevel/count por fila -- evidenceLevel puede ser null (cierre automático sin
    // declaración humana, ver StateTransition.evidenceLevel).
    private List<Map<String, Object>> evidenceLevelBreakdown;
    private Long reopenedCasesCount;
}
