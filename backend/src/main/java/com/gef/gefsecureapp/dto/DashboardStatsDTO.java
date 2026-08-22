package com.gef.gefsecureapp.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DashboardStatsDTO {
    private Long totalAssets;
    private Long totalVulnerabilities;
    private Long openVulnerabilities;
    private Long criticalVulnerabilities;
    private Long resolvedThisMonth;
    // Fase 4 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): antes "mttrDays" a secas --
    // medía desde la primera detección hasta la marca MANUAL de RESUELTA, pero se llamaba MTTR
    // sin aclararlo (antipatrón "MTTR nominal", Sección 19 del marco de tracking). Separado de
    // mttrVerifiedDays, que requiere el Componente D (verificación real por rango de versión,
    // Fase 8) y por ahora queda siempre null -- no existe todavía ese dato para calcular.
    private Double mttrDeclaredDays;
    private Double mttrVerifiedDays;
    private String systemStatus;
    private List<Map<String, Object>> severityDistribution;
    private List<Map<String, Object>> statusDistribution;
    private List<Map<String, Object>> trendsLast30Days;
    // Fase 4: aging de lo abierto en buckets 0-30/31-60/61-90/+90 días (Sección 14.5 del marco),
    // y tiempo de gestión promedio agrupado por criticidad -- mismo cálculo de mttrDeclaredDays,
    // desglosado por priority en vez de global.
    private List<Map<String, Object>> agingBuckets;
    private List<Map<String, Object>> mttrByCriticality;
    // Fase 2 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): tasa de recurrencia --
    // reopenedCasesCount = hallazgos que se reabrieron al menos una vez; recurrenceRate =
    // esa cantidad sobre el total de hallazgos persistentes (0.0 si no hay ninguno).
    private Long reopenedCasesCount;
    private Double recurrenceRate;
    // Fase 9 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): KPI #8 de la Sección 4
    // de Brechas_Tracking_Remediacion.md -- recién confiable ahora que assignedToUser es FK.
    private List<Map<String, Object>> byResponsible;
}
