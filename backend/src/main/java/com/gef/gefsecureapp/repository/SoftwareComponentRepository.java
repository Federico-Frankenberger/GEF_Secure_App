package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.SoftwareComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface SoftwareComponentRepository extends JpaRepository<SoftwareComponent, Long> {

    List<SoftwareComponent> findByNameContainingIgnoreCaseOrSoftwareContainingIgnoreCase(
            String name, String software);

    @Query("SELECT a.ecosystem, COUNT(a) FROM SoftwareComponent a GROUP BY a.ecosystem")
    List<Object[]> countByEcosystem();

    List<SoftwareComponent> findByDeletedAtIsNull();

    // Ojo: "OrSoftwareContainingIgnoreCaseAndDeletedAtIsNull" en un derived query name
    // se leeria "name LIKE X OR (software LIKE X AND deletedAt IS NULL)" -- Spring Data
    // no puede expresar (A OR B) AND C sin parentesis, hace falta @Query explicito.
    @Query("""
            SELECT c FROM SoftwareComponent c
            WHERE c.deletedAt IS NULL
              AND (LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(c.software) LIKE LOWER(CONCAT('%', :query, '%')))
            """)
    List<SoftwareComponent> searchActive(@Param("query") String query);

    // DB-05 (docs/20-08-26/AUDITORIA_END_TO_END.md): reemplaza a la variante por-entorno
    // (colisionaba entre activos distintos del mismo entorno) -- mismo criterio que el
    // UNIQUE real de la base (init/16-unique-component-per-asset.sql).
    Optional<SoftwareComponent> findByAsset_IdAndSoftwareAndEcosystemAndVersionAndDeletedAtIsNull(
            Long assetId, String software, String ecosystem, String version);

    /** Clave de upsert para la importacion de inventario (SBOM): un mismo software+ecosistema
     *  no deberia repetirse dos veces dentro del mismo activo. */
    Optional<SoftwareComponent> findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull(
            Long assetId, String software, String ecosystem);

    /** Componentes activos de un host, usados para el cascade de borrado logico. */
    List<SoftwareComponent> findByAsset_IdAndDeletedAtIsNull(Long assetId);

    /** Componentes borrados exactamente en el mismo cascade que su host, usados al restaurar. */
    List<SoftwareComponent> findByAsset_IdAndDeletedAt(Long assetId, LocalDateTime deletedAt);

    long countByAsset_IdAndDeletedAt(Long assetId, LocalDateTime deletedAt);

    // C3 (docs/20-08-26/AUDITORIA_END_TO_END.md): variante scopeada del count() sin filtrar
    // usado por DashboardService para ASSET_OWNER -- mismo criterio que el resto del scope
    // (no filtra deletedAt, igual que el count() unscoped que reemplaza).
    long countByAsset_IdIn(Collection<Long> assetIds);
}
