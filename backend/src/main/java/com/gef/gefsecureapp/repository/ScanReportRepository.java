package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.ScanReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScanReportRepository extends JpaRepository<ScanReport, Long> {
    Page<ScanReport> findAllByOrderByExecutedAtDesc(Pageable pageable);

    Optional<ScanReport> findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc(
            String targetType, String targetName);

    // Native + cast explicito en cada ocurrencia: sin el cast, PgJDBC no puede
    // inferir el tipo de un bind usado en "param IS NULL" (protocol-level, no
    // es un problema de JPQL) y falla con "could not determine data type of
    // parameter $N" apenas alguno de los filtros opcionales viene en null.
    @Query(value = """
            SELECT * FROM scan_reports r
            WHERE (CAST(:targetType AS varchar)   IS NULL OR r.target_type = :targetType)
              AND (CAST(:targetName AS varchar)   IS NULL OR r.target_name = :targetName)
              AND (CAST(:from AS timestamp)       IS NULL OR r.executed_at >= CAST(:from AS timestamp))
              AND (CAST(:to   AS timestamp)       IS NULL OR r.executed_at <= CAST(:to   AS timestamp))
            ORDER BY r.executed_at DESC
            """, nativeQuery = true)
    List<ScanReport> search(@Param("targetType") String targetType,
                             @Param("targetName") String targetName,
                             @Param("from") LocalDateTime from,
                             @Param("to") LocalDateTime to);
}
