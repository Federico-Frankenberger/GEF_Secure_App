package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.UserAssetAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAssetAssignmentRepository extends JpaRepository<UserAssetAssignment, Long> {
    List<UserAssetAssignment> findByAsset_Id(Long assetId);
    List<UserAssetAssignment> findByUser_Id(Long userId);
    Optional<UserAssetAssignment> findByAsset_IdAndUser_Id(Long assetId, Long userId);
}
