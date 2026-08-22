package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Registro de auditoria inmutable de un cambio de estado dentro de un
 *  RemediationCycle (Componente F del marco de tracking de remediacion,
 *  docs/21-08-26/Brechas_Tracking_Remediacion.md, Seccion 3). Cada transicion
 *  agrega una fila nueva; ninguna fila existente se actualiza ni se borra --
 *  a diferencia de AssetVulnerability.updateStatus(), que hoy sobrescribe el
 *  estado en la misma fila sin dejar rastro de la transicion puntual. */
@Entity
@Table(name = "state_transitions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StateTransition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "remediation_cycle_id", nullable = false)
    private RemediationCycle remediationCycle;

    // null en la primera deteccion de un ciclo (no habia estado previo).
    @Column(name = "from_state", length = 30)
    private String fromState;

    @Column(name = "to_state", length = 30, nullable = false)
    private String toState;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    // null cuando actorType no es HUMANO -- un escaneo o una politica automatica
    // no tienen un usuario detras.
    @Column(name = "actor_id")
    private Long actorId;

    // HUMANO | ESCANER | POLITICA
    @Column(name = "actor_type", length = 20, nullable = false)
    private String actorType;

    // Columna "trigger_type", no "trigger": palabra reservada en PostgreSQL.
    @Column(name = "trigger_type", length = 50)
    private String trigger;

    @Column(columnDefinition = "text")
    private String comment;

    // Referencia al respaldo real de un cierre (URL de reporte, commit, PR).
    @Column(name = "evidence_ref", columnDefinition = "text")
    private String evidenceRef;

    // Fase 7 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): escala E0-E6 (Seccion
    // 8.3 del marco de tracking de remediacion) -- que tan fuerte es la prueba de un cierre,
    // no solo si se cerro. Solo se completa en cierres manuales del Kanban (donde una persona
    // puede declarar y respaldar el nivel); las transiciones automaticas (ESCANER/POLITICA)
    // quedan null a proposito -- no son una "declaracion" en el sentido que describe la escala.
    @Column(name = "evidence_level", length = 5)
    private String evidenceLevel;
}
