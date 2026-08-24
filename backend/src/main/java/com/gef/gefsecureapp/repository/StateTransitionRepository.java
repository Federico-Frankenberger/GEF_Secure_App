package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.StateTransition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface StateTransitionRepository extends JpaRepository<StateTransition, Long> {

    List<StateTransition> findByRemediationCycle_IdOrderByOccurredAtAsc(Long remediationCycleId);

    // Informes -- pestaña "Remediación" (docs/bitacora/23-08-26): primer método de lectura
    // agregada de este repositorio (antes solo se usaba para escribir/cascada de borrado).
    // Desglose por nivel de evidencia (E0-E6, o NULL en cierres automáticos sin declaración
    // humana -- ver comentario de StateTransition.evidenceLevel) de los cierres del período.
    // Mismo join que findAverageMttrVerifiedDays (AssetVulnerabilityRepository), pero sin
    // filtrar por evidence_level: acá queremos ver TODOS los niveles, no solo E4+.
    @Query(value = """
            SELECT st.evidence_level, COUNT(*)
            FROM state_transitions st
            JOIN remediation_cycles rc ON rc.id = st.remediation_cycle_id
            WHERE st.to_state IN ('RESUELTA', 'RESOLVED') AND st.occurred_at >= :since
            GROUP BY st.evidence_level
            """, nativeQuery = true)
    List<Object[]> countGroupedByEvidenceLevelSince(@Param("since") LocalDateTime since);

    @Query(value = """
            SELECT st.evidence_level, COUNT(*)
            FROM state_transitions st
            JOIN remediation_cycles rc ON rc.id = st.remediation_cycle_id
            JOIN asset_vulnerabilities av ON av.id = rc.asset_vulnerability_id
            JOIN software_components sc ON sc.id = av.software_component_id
            WHERE st.to_state IN ('RESUELTA', 'RESOLVED') AND st.occurred_at >= :since
              AND sc.asset_id IN (:assetIds)
            GROUP BY st.evidence_level
            """, nativeQuery = true)
    List<Object[]> countGroupedByEvidenceLevelSince(@Param("since") LocalDateTime since, @Param("assetIds") Collection<Long> assetIds);

    // Fix 5 (docs/bitacora/24-08-26/plan_fix_bucle_reapertura_vulnerabilidades.md): reemplaza
    // el conteo lifetime sobre asset_vulnerabilities.reopen_count (que solo se incrementa en
    // la reapertura AUTOMATICA por escaneo -- nunca en la manual del Kanban, subestimando la
    // recurrencia real) por transiciones reales fromState='RESUELTA', sin filtrar por
    // actor_type: cuenta tanto ESCANER (REAPERTURA_ESCANEO) como HUMANO (KANBAN_MANUAL).
    // Variante SIN ventana (lifetime) -- usada por el Dashboard general, que ya reporta el
    // resto de sus KPIs (totalVulnerabilities, openVulnerabilities, etc.) como snapshot total,
    // no acotado a un periodo.
    @Query(value = """
            SELECT COUNT(*) FROM state_transitions st WHERE st.from_state = 'RESUELTA'
            """, nativeQuery = true)
    long countReopened();

    @Query(value = """
            SELECT COUNT(*)
            FROM state_transitions st
            JOIN remediation_cycles rc ON rc.id = st.remediation_cycle_id
            JOIN asset_vulnerabilities av ON av.id = rc.asset_vulnerability_id
            JOIN software_components sc ON sc.id = av.software_component_id
            WHERE st.from_state = 'RESUELTA' AND sc.asset_id IN (:assetIds)
            """, nativeQuery = true)
    long countReopened(@Param("assetIds") Collection<Long> assetIds);

    // Variante CON ventana `since` -- usada por Informes -> Remediacion (RemediationAnalysisDTO),
    // donde reopenedCasesCount debe respetar el periodo elegido igual que sus metricas
    // hermanas del mismo DTO (outcomeBreakdown, evidenceLevelBreakdown).
    @Query(value = """
            SELECT COUNT(*) FROM state_transitions st
            WHERE st.from_state = 'RESUELTA' AND st.occurred_at >= :since
            """, nativeQuery = true)
    long countReopenedSince(@Param("since") LocalDateTime since);

    @Query(value = """
            SELECT COUNT(*)
            FROM state_transitions st
            JOIN remediation_cycles rc ON rc.id = st.remediation_cycle_id
            JOIN asset_vulnerabilities av ON av.id = rc.asset_vulnerability_id
            JOIN software_components sc ON sc.id = av.software_component_id
            WHERE st.from_state = 'RESUELTA' AND st.occurred_at >= :since
              AND sc.asset_id IN (:assetIds)
            """, nativeQuery = true)
    long countReopenedSince(@Param("since") LocalDateTime since, @Param("assetIds") Collection<Long> assetIds);
}
