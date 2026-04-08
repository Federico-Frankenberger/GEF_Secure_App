package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.ScanReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ScanReportRepository extends JpaRepository<ScanReport, Long> {
    Page<ScanReport> findAllByOrderByExecutedAtDesc(Pageable pageable);
}
