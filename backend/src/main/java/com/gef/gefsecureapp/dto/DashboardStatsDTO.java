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
    private Double mttrDays;
    private String systemStatus;
    private List<Map<String, Object>> severityDistribution;
    private List<Map<String, Object>> statusDistribution;
    private List<Map<String, Object>> trendsLast30Days;
}
