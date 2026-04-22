package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;
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

    @Column(name = "environment_breakdown", columnDefinition = "jsonb")
    private String environmentBreakdown;

    @Column(name = "target_type", length = 20)
    private String targetType;

    @Column(name = "target_name", length = 100)
    private String targetName;
}
