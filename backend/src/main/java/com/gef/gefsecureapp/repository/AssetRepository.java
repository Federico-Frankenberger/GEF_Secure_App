package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {
    List<Asset> findByNameContainingIgnoreCase(String name);

    Optional<Asset> findByNameAndEnvironment_Id(String name, Long environmentId);

    List<Asset> findByDeletedAtIsNull();

    List<Asset> findByNameContainingIgnoreCaseAndDeletedAtIsNull(String name);

    List<Asset> findByDeletedAtIsNotNull();

    Optional<Asset> findByNameAndEnvironment_IdAndDeletedAtIsNull(String name, Long environmentId);
}
