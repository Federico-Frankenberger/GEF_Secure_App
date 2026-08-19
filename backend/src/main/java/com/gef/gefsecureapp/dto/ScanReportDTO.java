package com.gef.gefsecureapp.dto;

import com.gef.gefsecureapp.model.ScanReport;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Builder
public class ScanReportDTO {
    private Long id;
    private String publicCode;
    private LocalDateTime executedAt;
    private Integer totalDetected;
    private Integer criticals;
    private Integer highs;
    private Integer mediums;
    private Integer lows;
    private String systemStatus;
    private String targetType;
    private String targetName;

    public static ScanReportDTO from(ScanReport r) {
        return ScanReportDTO.builder()
                .id(r.getId())
                .publicCode(r.getPublicCode())
                .executedAt(r.getExecutedAt())
                .totalDetected(r.getTotalDetected())
                .criticals(r.getCriticals())
                .highs(r.getHighs())
                .mediums(r.getMediums())
                .lows(r.getLows())
                .systemStatus(r.getSystemStatus())
                .targetType(r.getTargetType())
                .targetName(r.getTargetName())
                .build();
    }
}
