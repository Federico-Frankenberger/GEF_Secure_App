package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.SoftwareComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
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

    Optional<SoftwareComponent> findBySoftwareAndVersionAndAsset_Environment_IdAndDeletedAtIsNull(
            String software, String version, Long environmentId);

    /** Componentes activos de un host, usados para el cascade de borrado logico. */
    List<SoftwareComponent> findByAsset_IdAndDeletedAtIsNull(Long assetId);

    /** Componentes borrados exactamente en el mismo cascade que su host, usados al restaurar. */
    List<SoftwareComponent> findByAsset_IdAndDeletedAt(Long assetId, LocalDateTime deletedAt);

    long countByAsset_IdAndDeletedAt(Long assetId, LocalDateTime deletedAt);
}
