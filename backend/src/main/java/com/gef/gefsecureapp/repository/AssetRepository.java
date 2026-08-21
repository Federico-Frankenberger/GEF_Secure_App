package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {
    List<Asset> findByNameContainingIgnoreCase(String name);

    Optional<Asset> findByNameAndEnvironment_Id(String name, Long environmentId);

    List<Asset> findByDeletedAtIsNull();

    List<Asset> findByNameContainingIgnoreCaseAndDeletedAtIsNull(String name);

    List<Asset> findByDeletedAtIsNotNull();

    Optional<Asset> findByNameAndEnvironment_IdAndDeletedAtIsNull(String name, Long environmentId);

    // DASH-NUEVO (docs/20-08-26/AUDITORIA_END_TO_END_2.md): usados por DashboardService para
    // que "Total Activos" cuente activos reales, no software_components.
    long countByDeletedAtIsNull();

    long countByIdInAndDeletedAtIsNull(Set<Long> ids);
}
