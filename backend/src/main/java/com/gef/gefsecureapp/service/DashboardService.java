package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.DashboardStatsDTO;
import com.gef.gefsecureapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
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

    @Transactional(readOnly = true)
    public DashboardStatsDTO getStats() {

        // "Total Activos" sigue contando componentes de software (no hosts):
        // decision tomada al pasar a Fase 2 para no mostrar 0 apenas se migre,
        // ya que todavia no hay hosts cargados.
        long totalAssets    = softwareComponentRepository.count();
        // Etapa 4: cuenta vulnerabilidades persistentes (AssetVulnerability),
        // no detecciones individuales -- un CVE re-detectado en 5 escaneos
        // cuenta una sola vez, no cinco.
        long totalVulns     = vulnRepository.count();
        long openVulns      = vulnRepository.countByTriageStatus("DETECTADA")
                            + vulnRepository.countByTriageStatus("EN_ANALISIS");
        long criticals      = vulnRepository.countByPriority("CRITICAL");

        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        long resolvedThisMonth     = vulnRepository.countResolvedBetween(startOfMonth, LocalDateTime.now());

        // MTTR real (primera detección → resolución por el analista), null si aún no hay resueltas
        Double mttrDays = vulnRepository.findAverageMttrDays();

        String systemStatus = scanReportRepository
                .findAllByOrderByExecutedAtDesc(PageRequest.of(0, 1))
                .stream().findFirst()
                .map(r -> r.getSystemStatus())
                .orElse("DESCONOCIDO");

        // Severidad para PieChart
        List<Map<String, Object>> severityDist = new ArrayList<>();
        for (Object[] row : vulnRepository.countGroupedByPriority()) {
            severityDist.add(Map.of("name", row[0], "value", row[1]));
        }

        // Status para BarChart
        List<Map<String, Object>> statusDist = new ArrayList<>();
        for (Object[] row : vulnRepository.countGroupedByTriageStatus()) {
            statusDist.add(Map.of("name", row[0], "value", row[1]));
        }

        // Tendencia 30 días para AreaChart -- detectadas = nuevas (first_detected_at),
        // no re-detecciones del mismo CVE en escaneos posteriores.
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        Map<String, Map<String, Object>> trendMap = new LinkedHashMap<>();
        for (Object[] row : vulnRepository.countDailyDetections(since)) {
            String day = row[0].toString();
            trendMap.computeIfAbsent(day, k -> new LinkedHashMap<>(
                    Map.of("date", day, "detectadas", 0L, "resueltas", 0L)));
            trendMap.get(day).put("detectadas", row[1]);
        }
        for (Object[] row : vulnRepository.countDailyResolutions(since)) {
            String day = row[0].toString();
            trendMap.computeIfAbsent(day, k -> new LinkedHashMap<>(
                    Map.of("date", day, "detectadas", 0L, "resueltas", 0L)));
            trendMap.get(day).put("resueltas", row[1]);
        }

        return DashboardStatsDTO.builder()
                .totalAssets(totalAssets)
                .totalVulnerabilities(totalVulns)
                .openVulnerabilities(openVulns)
                .criticalVulnerabilities(criticals)
                .resolvedThisMonth(resolvedThisMonth)
                .mttrDays(mttrDays)
                .systemStatus(systemStatus)
                .severityDistribution(severityDist)
                .statusDistribution(statusDist)
                .trendsLast30Days(new ArrayList<>(trendMap.values()))
                .build();
    }
}
