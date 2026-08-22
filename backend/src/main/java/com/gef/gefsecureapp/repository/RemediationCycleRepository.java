package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.RemediationCycle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RemediationCycleRepository extends JpaRepository<RemediationCycle, Long> {

    Optional<RemediationCycle> findTopByAssetVulnerability_IdOrderByCycleNumberDesc(Long assetVulnerabilityId);

    List<RemediationCycle> findByAssetVulnerability_Id(Long assetVulnerabilityId);
}
