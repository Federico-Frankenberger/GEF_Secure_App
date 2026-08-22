package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Un ciclo de apertura-cierre de un AssetVulnerability (Componente E del marco de
 *  tracking de remediacion, docs/21-08-26/Brechas_Tracking_Remediacion.md). Separado
 *  de AssetVulnerability para que cada reapertura no sobrescriba la duracion del
 *  ciclo anterior -- antes solo existia un unico resolvedAt en AssetVulnerability,
 *  que se pisaba en null en cada reapertura (VulnerabilityAuditService.updateStatus). */
@Entity
@Table(name = "remediation_cycles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RemediationCycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_vulnerability_id", nullable = false)
    private AssetVulnerability assetVulnerability;

    // 1 en la primera deteccion; se incrementa en cada reapertura (mismo criterio
    // que AssetVulnerability.reopenCount, con el que debe quedar siempre en sync).
    @Column(name = "cycle_number", nullable = false)
    private Integer cycleNumber;

    @Column(name = "detected_at", nullable = false)
    private LocalDateTime detectedAt;

    // Se estampa tanto en el cierre manual (Kanban -> RESUELTA) como en el cierre
    // automatico por ausencia -- cual de los dos fue queda en StateTransition, no aca.
    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
