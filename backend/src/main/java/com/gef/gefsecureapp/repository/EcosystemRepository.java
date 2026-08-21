package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.Ecosystem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EcosystemRepository extends JpaRepository<Ecosystem, Long> {
    // Fase 4 (docs/20-08-26/AUDITORIA_END_TO_END_2.md, ECO-CATALOGO): usado por
    // SoftwareComponentService para rechazar un ecosystem que no exista en este catalogo
    // antes de persistir (alta manual y SBOM) -- ver InvalidEcosystemException.
    boolean existsByNameIgnoreCase(String name);
}
