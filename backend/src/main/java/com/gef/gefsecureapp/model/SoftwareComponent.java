package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "software_components")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SoftwareComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 255)
    private String name;

    @Column(length = 255)
    private String software;

    @Column(length = 50)
    private String ecosystem;

    @Column(length = 50)
    private String version;

    @Column(name = "last_scan")
    private LocalDateTime lastScan;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    private boolean catalogued;

    @Column(length = 400)
    private String purl;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // A2/DB-06 (docs/20-08-26/AUDITORIA_END_TO_END.md): LAZY por defecto -- los
    // listados masivos que necesitan el activo ya cargado (Kanban, via
    // AssetVulnerability.softwareComponent) piden JOIN FETCH explicito en su
    // propio repositorio, en vez de forzar el join en cada carga de un
    // SoftwareComponent lo use o no (ej. el chequeo de duplicados de DB-05, que
    // ni siquiera toca el activo).
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;
}
