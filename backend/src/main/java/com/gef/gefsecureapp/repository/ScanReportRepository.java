package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.ScanReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

@Repository
public interface ScanReportRepository extends JpaRepository<ScanReport, Long> {
    // Dashboard ("Estado del sistema"): el mas reciente que termino de verdad.
    // No alcanza con "el mas reciente por executed_at" a secas -- Postgres pone
    // los NULL primero en un ORDER BY ... DESC, asi que un escaneo trabado en
    // RUNNING (executed_at/system_status ambos NULL) le ganaba al ultimo
    // escaneo realmente completado.
    Optional<ScanReport> findFirstByExecutedAtNotNullOrderByExecutedAtDesc();

    // A-NUEVO-2 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): usado por ScanService.start()
    // para rechazar un segundo disparo sobre el mismo target mientras el primero sigue
    // RUNNING -- antes el unico freno era el gating del frontend (deshabilitar el boton
    // durante el polling), que no protege contra dos pestañas, un script, o un reintento
    // de red pegandole directo al endpoint.
    boolean existsByTargetTypeAndTargetNameAndStatus(String targetType, String targetName, String status);

    // C5 (docs/20-08-26/AUDITORIA_END_TO_END.md): es el mismo problema de NULLS FIRST que
    // el de arriba, pero en el metodo que usa el POLLING del frontend tras disparar un
    // escaneo -- si existe cualquier escaneo viejo trabado en RUNNING para este mismo
    // target, esta query (derived, sin tratamiento de NULL) se lo devolvia siempre en vez
    // del escaneo nuevo que ya termino bien. Native + LIMIT 1 porque JPQL no soporta
    // NULLS LAST de forma portable ni LIMIT sin Pageable.
    @Query(value = """
            SELECT * FROM scan_reports r
            WHERE r.target_type = :targetType AND r.target_name = :targetName
            ORDER BY r.executed_at DESC NULLS LAST
            LIMIT 1
            """, nativeQuery = true)
    Optional<ScanReport> findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc(
            @Param("targetType") String targetType, @Param("targetName") String targetName);

    // Native + cast explicito en cada ocurrencia: sin el cast, PgJDBC no puede
    // inferir el tipo de un bind usado en "param IS NULL" (protocol-level, no
    // es un problema de JPQL) y falla con "could not determine data type of
    // parameter $N" apenas alguno de los filtros opcionales viene en null.
    // countQuery explicito porque Spring Data no puede derivar un COUNT de una
    // query nativa con SELECT * automaticamente.
    @Query(value = """
            SELECT * FROM scan_reports r
            WHERE (CAST(:targetType AS varchar)   IS NULL OR r.target_type = :targetType)
              AND (CAST(:targetName AS varchar)   IS NULL OR r.target_name = :targetName)
              AND (CAST(:publicCode AS varchar)   IS NULL OR r.public_code ILIKE CONCAT('%', CAST(:publicCode AS varchar), '%'))
              AND (CAST(:from AS timestamp)       IS NULL OR r.executed_at >= CAST(:from AS timestamp))
              AND (CAST(:to   AS timestamp)       IS NULL OR r.executed_at <= CAST(:to   AS timestamp))
            ORDER BY r.executed_at DESC NULLS LAST
            """,
            countQuery = """
            SELECT count(*) FROM scan_reports r
            WHERE (CAST(:targetType AS varchar)   IS NULL OR r.target_type = :targetType)
              AND (CAST(:targetName AS varchar)   IS NULL OR r.target_name = :targetName)
              AND (CAST(:publicCode AS varchar)   IS NULL OR r.public_code ILIKE CONCAT('%', CAST(:publicCode AS varchar), '%'))
              AND (CAST(:from AS timestamp)       IS NULL OR r.executed_at >= CAST(:from AS timestamp))
              AND (CAST(:to   AS timestamp)       IS NULL OR r.executed_at <= CAST(:to   AS timestamp))
            """,
            nativeQuery = true)
    Page<ScanReport> search(@Param("targetType") String targetType,
                             @Param("targetName") String targetName,
                             @Param("publicCode") String publicCode,
                             @Param("from") LocalDateTime from,
                             @Param("to") LocalDateTime to,
                             Pageable pageable);

    // A1 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): variante scopeada de search() para
    // ASSET_OWNER -- mismos filtros, mas la restriccion a escaneos cuyo asset_id (ACTIVO/HOST)
    // o software_component_id (ACTIVO puntual) caiga dentro de sus activos asignados. Un
    // escaneo ENTORNO/GLOBAL (ninguna de las dos columnas resuelve a un unico activo) queda
    // fuera de scope por diseno, igual que ReportPdfService.assertScanInScope.
    @Query(value = """
            SELECT * FROM scan_reports r
            WHERE (CAST(:targetType AS varchar)   IS NULL OR r.target_type = :targetType)
              AND (CAST(:targetName AS varchar)   IS NULL OR r.target_name = :targetName)
              AND (CAST(:publicCode AS varchar)   IS NULL OR r.public_code ILIKE CONCAT('%', CAST(:publicCode AS varchar), '%'))
              AND (CAST(:from AS timestamp)       IS NULL OR r.executed_at >= CAST(:from AS timestamp))
              AND (CAST(:to   AS timestamp)       IS NULL OR r.executed_at <= CAST(:to   AS timestamp))
              AND (
                    r.asset_id IN (:scope)
                    OR r.software_component_id IN (SELECT id FROM software_components WHERE asset_id IN (:scope))
                  )
            ORDER BY r.executed_at DESC NULLS LAST
            """,
            countQuery = """
            SELECT count(*) FROM scan_reports r
            WHERE (CAST(:targetType AS varchar)   IS NULL OR r.target_type = :targetType)
              AND (CAST(:targetName AS varchar)   IS NULL OR r.target_name = :targetName)
              AND (CAST(:publicCode AS varchar)   IS NULL OR r.public_code ILIKE CONCAT('%', CAST(:publicCode AS varchar), '%'))
              AND (CAST(:from AS timestamp)       IS NULL OR r.executed_at >= CAST(:from AS timestamp))
              AND (CAST(:to   AS timestamp)       IS NULL OR r.executed_at <= CAST(:to   AS timestamp))
              AND (
                    r.asset_id IN (:scope)
                    OR r.software_component_id IN (SELECT id FROM software_components WHERE asset_id IN (:scope))
                  )
            """,
            nativeQuery = true)
    Page<ScanReport> searchInScope(@Param("targetType") String targetType,
                                    @Param("targetName") String targetName,
                                    @Param("publicCode") String publicCode,
                                    @Param("from") LocalDateTime from,
                                    @Param("to") LocalDateTime to,
                                    @Param("scope") Set<Long> scope,
                                    Pageable pageable);

    // A1 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): resuelve el asset_id relevante de un
    // escaneo (el propio, o el de su software_component) sin atravesar las relaciones LAZY
    // de la entidad -- ScanController no tiene un @Transactional que mantenga la sesion de
    // Hibernate abierta (A2/DB-06 ya paso SoftwareComponent.asset a LAZY), asi que
    // scan.getSoftwareComponent().getAsset() tira LazyInitializationException ahi.
    @Query(value = """
            SELECT COALESCE(r.asset_id, sc.asset_id)
            FROM scan_reports r
            LEFT JOIN software_components sc ON sc.id = r.software_component_id
            WHERE r.id = :scanId
            """, nativeQuery = true)
    Long resolveAssetId(@Param("scanId") Long scanId);

    // Watchdog (docs/22-08-26/AUDITORIA_END_TO_END.md): sin esto, un ScanReport que se
    // queda trabado en RUNNING (n8n cae, el webhook de cierre nunca llega) queda asi para
    // siempre, sin nada que lo marque como sospechoso -- ver ScanService.closeStaleRunningScans().
    java.util.List<ScanReport> findByStatusAndStartedAtBefore(String status, LocalDateTime cutoff);
}
