package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "scan_reports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScanReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "executed_at")
    private LocalDateTime executedAt;

    @Column(name = "total_detected", nullable = false)
    private Integer totalDetected;

    @Column(nullable = false)
    private Integer audited;

    @Column(nullable = false)
    private Integer ignored;

    private Integer criticals;
    private Integer highs;
    private Integer mediums;
    private Integer lows;

    @Column(name = "system_status", length = 50)
    private String systemStatus;

    @Column(name = "report_message", columnDefinition = "text")
    private String reportMessage;

    // JdbcTypeCode explicito -- sin esto Hibernate 6 bindea el String como
    // varchar y Postgres rechaza el INSERT porque la columna es jsonb (nunca
    // se detecto antes porque todo insert de ScanReport via n8n usaba SQL
    // nativo con ::jsonb explicito, bypaseando Hibernate por completo).
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "environment_breakdown", columnDefinition = "jsonb")
    private String environmentBreakdown;

    @Column(name = "target_type", length = 20)
    private String targetType;

    @Column(name = "target_name", length = 100)
    private String targetName;

    @Column(name = "public_code", length = 20, unique = true)
    private String publicCode;

    // PENDING/RUNNING/COMPLETED/FAILED/PARTIALLY_COMPLETED -- distinto de
    // systemStatus, que es un indicador de salud ("ESTABLE"/"ACCION REQUERIDA"),
    // no de ciclo de vida del escaneo.
    @Column(length = 25, nullable = false)
    private String status;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "triggered_by")
    private User triggeredBy;

    // Marca explicita de origen -- triggered_by IS NULL no alcanza: hay filas
    // viejas de datos de prueba con triggered_by sin completar que no son
    // automaticas. Solo ScanService.completeAutomatic() la pone en true.
    @Column(name = "is_automatic_scan", nullable = false)
    private boolean automaticScan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "software_component_id")
    private SoftwareComponent softwareComponent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "environment_id")
    private Environment environment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;
}
