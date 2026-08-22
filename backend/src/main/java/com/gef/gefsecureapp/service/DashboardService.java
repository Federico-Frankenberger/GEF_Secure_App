package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.DashboardStatsDTO;
import com.gef.gefsecureapp.repository.*;
import com.gef.gefsecureapp.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SoftwareComponentRepository softwareComponentRepository;
    private final AssetVulnerabilityRepository vulnRepository;
    private final ScanReportRepository scanReportRepository;
    private final UserAssetAssignmentService userAssetAssignmentService;
    private final AssetRepository assetRepository;

    /** C3 (docs/20-08-26/AUDITORIA_END_TO_END.md): el Dashboard no tenia ningun scope --
     *  un ASSET_OWNER veia KPIs de toda la organizacion. null = sin restriccion (mismo
     *  criterio que SoftwareComponentService/AssetService: solo ASSET_OWNER se acota). */
    @Transactional(readOnly = true)
    public DashboardStatsDTO getStats() {
        Set<Long> scope = CurrentUser.isAssetOwner()
                ? userAssetAssignmentService.assignedAssetIds(CurrentUser.get().id())
                : null;

        // DASH-NUEVO (docs/20-08-26/AUDITORIA_END_TO_END_2.md): "Total Activos" contaba
        // software_components (143), no assets reales (18) -- una decision de la Fase 2 de
        // no mostrar 0 antes de que existieran hosts cargados, que ya no aplica hoy que si
        // hay activos reales. scope ya son ids de Asset (no de SoftwareComponent), asi que
        // se cuenta directo contra AssetRepository.
        long totalAssets = scope == null
                ? assetRepository.countByDeletedAtIsNull()
                : assetRepository.countByIdInAndDeletedAtIsNull(scope);
        // Etapa 4: cuenta vulnerabilidades persistentes (AssetVulnerability),
        // no detecciones individuales -- un CVE re-detectado en 5 escaneos
        // cuenta una sola vez, no cinco.
        long totalVulns, openVulns, criticals, resolvedThisMonth, reopenedCasesCount;
        Double mttrDeclaredDays;
        List<Object[]> severityRows, statusRows, detectionsRows, resolutionsRows, agingRows, mttrByPriorityRows, byResponsibleRows;

        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime since = LocalDateTime.now().minusDays(30);

        if (scope == null) {
            totalVulns          = vulnRepository.count();
            openVulns           = vulnRepository.countByTriageStatus("DETECTADA")
                                 + vulnRepository.countByTriageStatus("EN_ANALISIS");
            criticals           = vulnRepository.countByPriority("CRITICAL");
            resolvedThisMonth   = vulnRepository.countResolvedBetween(startOfMonth, LocalDateTime.now());
            mttrDeclaredDays    = vulnRepository.findAverageMttrDeclaredDays();
            severityRows        = vulnRepository.countGroupedByPriority();
            statusRows          = vulnRepository.countGroupedByTriageStatus();
            detectionsRows      = vulnRepository.countDailyDetections(since);
            resolutionsRows     = vulnRepository.countDailyResolutions(since);
            reopenedCasesCount  = vulnRepository.countByReopenCountGreaterThan(0);
            agingRows           = vulnRepository.countAgingBuckets();
            mttrByPriorityRows  = vulnRepository.findAverageMttrDeclaredDaysByPriority();
            byResponsibleRows   = vulnRepository.countOpenGroupedByAssignedUser();
        } else {
            totalVulns          = scope.isEmpty() ? 0 : vulnRepository.countBySoftwareComponent_Asset_IdIn(scope);
            openVulns           = scope.isEmpty() ? 0 : vulnRepository.countByTriageStatusAndSoftwareComponent_Asset_IdIn("DETECTADA", scope)
                                 + vulnRepository.countByTriageStatusAndSoftwareComponent_Asset_IdIn("EN_ANALISIS", scope);
            criticals           = scope.isEmpty() ? 0 : vulnRepository.countByPriorityAndSoftwareComponent_Asset_IdIn("CRITICAL", scope);
            resolvedThisMonth   = scope.isEmpty() ? 0 : vulnRepository.countResolvedBetween(startOfMonth, LocalDateTime.now(), scope);
            mttrDeclaredDays    = scope.isEmpty() ? null : vulnRepository.findAverageMttrDeclaredDays(scope);
            severityRows        = scope.isEmpty() ? List.of() : vulnRepository.countGroupedByPriority(scope);
            statusRows          = scope.isEmpty() ? List.of() : vulnRepository.countGroupedByTriageStatus(scope);
            detectionsRows      = scope.isEmpty() ? List.of() : vulnRepository.countDailyDetections(since, scope);
            resolutionsRows     = scope.isEmpty() ? List.of() : vulnRepository.countDailyResolutions(since, scope);
            reopenedCasesCount  = scope.isEmpty() ? 0 : vulnRepository.countByReopenCountGreaterThanAndSoftwareComponent_Asset_IdIn(0, scope);
            agingRows           = scope.isEmpty() ? List.of() : vulnRepository.countAgingBuckets(scope);
            mttrByPriorityRows  = scope.isEmpty() ? List.of() : vulnRepository.findAverageMttrDeclaredDaysByPriority(scope);
            byResponsibleRows   = scope.isEmpty() ? List.of() : vulnRepository.countOpenGroupedByAssignedUser(scope);
        }

        // Para ASSET_OWNER, el "systemStatus" del ultimo scan no se puede resolver
        // directamente (la mayoria de los ScanReport son GLOBAL/ENTORNO sin un unico
        // asset asociado) -- se deriva del propio conteo scopeado de criticas en vez
        // de filtrar ScanReport, evitando fugar el estado de escaneos ajenos.
        String systemStatus = scope == null
                ? scanReportRepository.findFirstByExecutedAtNotNullOrderByExecutedAtDesc()
                        .map(r -> r.getSystemStatus())
                        .orElse("DESCONOCIDO")
                : (criticals > 0 ? "⚠️ ACCIÓN REQUERIDA" : "✅ ESTABLE");

        // Severidad para PieChart
        List<Map<String, Object>> severityDist = new ArrayList<>();
        for (Object[] row : severityRows) {
            severityDist.add(Map.of("name", row[0], "value", row[1]));
        }

        // Status para BarChart
        List<Map<String, Object>> statusDist = new ArrayList<>();
        for (Object[] row : statusRows) {
            statusDist.add(Map.of("name", row[0], "value", row[1]));
        }

        // Tendencia 30 días para AreaChart -- detectadas = nuevas (first_detected_at),
        // no re-detecciones del mismo CVE en escaneos posteriores.
        Map<String, Map<String, Object>> trendMap = new LinkedHashMap<>();
        for (Object[] row : detectionsRows) {
            String day = row[0].toString();
            trendMap.computeIfAbsent(day, k -> new LinkedHashMap<>(
                    Map.of("date", day, "detectadas", 0L, "resueltas", 0L)));
            trendMap.get(day).put("detectadas", row[1]);
        }
        for (Object[] row : resolutionsRows) {
            String day = row[0].toString();
            trendMap.computeIfAbsent(day, k -> new LinkedHashMap<>(
                    Map.of("date", day, "detectadas", 0L, "resueltas", 0L)));
            trendMap.get(day).put("resueltas", row[1]);
        }

        // Fase 2 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): tasa de recurrencia
        // sobre el total de hallazgos persistentes -- 0.0 sin dividir por cero si no hay ninguno.
        double recurrenceRate = totalVulns == 0 ? 0.0 : (double) reopenedCasesCount / totalVulns;

        // Fase 4: aging (bucket, count) y MTTR declarado por criticidad (priority, avgDays).
        List<Map<String, Object>> agingBuckets = new ArrayList<>();
        for (Object[] row : agingRows) {
            agingBuckets.add(Map.of("bucket", row[0], "count", row[1]));
        }
        List<Map<String, Object>> mttrByCriticality = new ArrayList<>();
        for (Object[] row : mttrByPriorityRows) {
            mttrByCriticality.add(Map.of("priority", row[0], "avgDays", row[1]));
        }

        // Fase 9: por responsable (name, count) -- solo abiertas y con assignedToUser real.
        List<Map<String, Object>> byResponsible = new ArrayList<>();
        for (Object[] row : byResponsibleRows) {
            byResponsible.add(Map.of("name", row[0], "value", row[1]));
        }

        return DashboardStatsDTO.builder()
                .totalAssets(totalAssets)
                .totalVulnerabilities(totalVulns)
                .openVulnerabilities(openVulns)
                .criticalVulnerabilities(criticals)
                .resolvedThisMonth(resolvedThisMonth)
                .mttrDeclaredDays(mttrDeclaredDays)
                .mttrVerifiedDays(null) // Fase 8: requiere el Componente D (verificacion real)
                .systemStatus(systemStatus)
                .severityDistribution(severityDist)
                .statusDistribution(statusDist)
                .trendsLast30Days(new ArrayList<>(trendMap.values()))
                .agingBuckets(agingBuckets)
                .mttrByCriticality(mttrByCriticality)
                .reopenedCasesCount(reopenedCasesCount)
                .recurrenceRate(recurrenceRate)
                .byResponsible(byResponsible)
                .build();
    }
}
