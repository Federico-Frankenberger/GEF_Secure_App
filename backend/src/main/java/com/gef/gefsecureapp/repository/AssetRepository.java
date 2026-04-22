package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {

    List<Asset> findByNameContainingIgnoreCaseOrSoftwareContainingIgnoreCase(
            String name, String software);

    Optional<Asset> findBySoftwareAndVersionAndEnvironment_Id(
            String software, String version, Long environmentId);

    @Query("SELECT a.ecosystem, COUNT(a) FROM Asset a GROUP BY a.ecosystem")
    List<Object[]> countByEcosystem();
}
