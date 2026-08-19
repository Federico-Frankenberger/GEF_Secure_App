package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.UserAssetAssignmentDTO;
import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.model.Asset;
import com.gef.gefsecureapp.model.User;
import com.gef.gefsecureapp.model.UserAssetAssignment;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.UserAssetAssignmentRepository;
import com.gef.gefsecureapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserAssetAssignmentService {

    private final UserAssetAssignmentRepository assignmentRepository;
    private final AssetRepository assetRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<UserAssetAssignmentDTO.Response> findByAsset(Long assetId) {
        if (!assetRepository.existsById(assetId))
            throw new ResourceNotFoundException("Asset", assetId);
        return assignmentRepository.findByAsset_Id(assetId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public UserAssetAssignmentDTO.Response assign(Long assetId, UserAssetAssignmentDTO.Request dto) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", assetId));
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", dto.getUserId()));

        assignmentRepository.findByAsset_IdAndUser_Id(assetId, dto.getUserId())
                .ifPresent(a -> {
                    throw new ConflictException(
                            "El usuario id=" + dto.getUserId() + " ya está asignado al activo id=" + assetId);
                });

        UserAssetAssignment assignment = UserAssetAssignment.builder()
                .asset(asset)
                .user(user)
                .assignedAt(LocalDateTime.now())
                .build();
        return toResponse(assignmentRepository.save(assignment));
    }

    @Transactional
    public void unassign(Long assetId, Long userId) {
        UserAssetAssignment assignment = assignmentRepository.findByAsset_IdAndUser_Id(assetId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("UserAssetAssignment", userId));
        assignmentRepository.delete(assignment);
    }

    /** Usado por el scope-filtering de AssetService/SoftwareComponentService/VulnerabilityAuditService. */
    @Transactional(readOnly = true)
    public Set<Long> assignedAssetIds(Long userId) {
        return assignmentRepository.findByUser_Id(userId).stream()
                .map(a -> a.getAsset().getId())
                .collect(Collectors.toSet());
    }

    private UserAssetAssignmentDTO.Response toResponse(UserAssetAssignment a) {
        return UserAssetAssignmentDTO.Response.builder()
                .id(a.getId())
                .userId(a.getUser().getId())
                .username(a.getUser().getUsername())
                .userFullName(a.getUser().getFullName())
                .assetId(a.getAsset().getId())
                .assignedAt(a.getAssignedAt())
                .build();
    }
}
