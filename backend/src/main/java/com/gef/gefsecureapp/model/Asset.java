package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "assets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Asset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 150, nullable = false)
    private String name;

    @Column(name = "asset_type", length = 30, nullable = false)
    private String assetType;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "environment_id")
    private Environment environment;

    // Fase 10, opcional (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md), Sección 5 de
    // Brechas_Tracking_Remediacion.md: declarado a mano por el analista, no descubierto por
    // ningun mecanismo de Caja Negra (que queda fuera de alcance). null = no declarado
    // todavia (no se asume "no expuesto" por omision -- Environment.businessCriticality ya
    // cubre buena parte de la señal de exposición; este campo es para el caso puntual de
    // "alcanzable desde internet", una variable distinta).
    private Boolean exposed;
}
