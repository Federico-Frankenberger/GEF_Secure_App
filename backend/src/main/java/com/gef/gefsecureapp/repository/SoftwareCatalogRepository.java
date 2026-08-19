package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.SoftwareCatalog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SoftwareCatalogRepository extends JpaRepository<SoftwareCatalog, Long> {

    Optional<SoftwareCatalog> findByPackageNameAndEcosystem(String packageName, String ecosystem);

    @Query("SELECT c FROM SoftwareCatalog c " +
           "WHERE LOWER(c.packageName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "   OR LOWER(c.displayName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY c.packageName ASC")
    List<SoftwareCatalog> search(@Param("query") String query);
}
