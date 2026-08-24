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

    // CFG-ENV-DELETE (docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md): antes de
    // borrar un Entorno hay que saber si algun activo lo usa -- la FK tiene
    // ON DELETE SET NULL, asi que el borrado nunca fallaba solo, desvinculando activos
    // reales en silencio (confirmado en vivo durante la propia auditoria).
    long countByEnvironment_IdAndDeletedAtIsNull(Long environmentId);

    // CFG-CATALOG-DELETE (mismo informe): idem para Tipos de Host -- Asset.assetType es
    // texto libre, sin FK real, asi que se compara por nombre (case-insensitive, mismo
    // criterio que el resto del proyecto para estos catalogos).
    long countByAssetTypeIgnoreCaseAndDeletedAtIsNull(String assetType);
}
