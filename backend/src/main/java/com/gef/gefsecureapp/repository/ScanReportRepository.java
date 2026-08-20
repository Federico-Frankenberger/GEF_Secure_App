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

@Repository
public interface ScanReportRepository extends JpaRepository<ScanReport, Long> {
    // Dashboard ("Estado del sistema"): el mas reciente que termino de verdad.
    // No alcanza con "el mas reciente por executed_at" a secas -- Postgres pone
    // los NULL primero en un ORDER BY ... DESC, asi que un escaneo trabado en
    // RUNNING (executed_at/system_status ambos NULL) le ganaba al ultimo
    // escaneo realmente completado.
    Optional<ScanReport> findFirstByExecutedAtNotNullOrderByExecutedAtDesc();

    Optional<ScanReport> findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc(
            String targetType, String targetName);

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
            ORDER BY r.executed_at DESC
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
}
