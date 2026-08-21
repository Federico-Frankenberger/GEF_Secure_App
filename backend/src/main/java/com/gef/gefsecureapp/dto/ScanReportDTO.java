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
    // M-NUEVO-1 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): antes el Historial solo mostraba
    // systemStatus ("✅ ESTABLE"/"⚠️ ACCIÓN REQUERIDA"), un indicador de salud del pipeline,
    // no el estado real del propio ScanReport -- un escaneo FAILED/PARTIALLY_COMPLETED era
    // indistinguible de uno COMPLETED normal en la pantalla, sin ir directo a la base.
    private String status;
    private String errorMessage;

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
                .status(r.getStatus())
                .errorMessage(r.getErrorMessage())
                .build();
    }
}
