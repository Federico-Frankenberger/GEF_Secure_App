package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.AssetDTO;
import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.AssetMapper;
import com.gef.gefsecureapp.model.Asset;
import com.gef.gefsecureapp.model.Environment;
import com.gef.gefsecureapp.model.SoftwareComponent;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.EnvironmentRepository;
import com.gef.gefsecureapp.repository.SoftwareComponentRepository;
import com.gef.gefsecureapp.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AssetService {

    private static final String DEFAULT_ASSET_TYPE = "SERVIDOR";

    private final AssetRepository assetRepository;
    private final AssetMapper assetMapper;
    private final EnvironmentRepository environmentRepository;
    private final UserAssetAssignmentService userAssetAssignmentService;
    private final SoftwareComponentRepository softwareComponentRepository;

    @Transactional(readOnly = true)
    public List<AssetDTO.Response> findAll() {
        return applyScope(assetRepository.findByDeletedAtIsNull()).stream().map(assetMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AssetDTO.Response> search(String query) {
        return applyScope(assetRepository.findByNameContainingIgnoreCaseAndDeletedAtIsNull(query)).stream()
                .map(assetMapper::toResponse).toList();
    }

    /** Activos eliminados logicamente, para el panel de restauracion (ADMIN/SECURITY_ANALYST). */
    @Transactional(readOnly = true)
    public List<AssetDTO.DeletedResponse> findDeleted() {
        return assetRepository.findByDeletedAtIsNotNull().stream()
                .map(a -> AssetDTO.DeletedResponse.builder()
                        .id(a.getId())
                        .name(a.getName())
                        .assetType(a.getAssetType())
                        .environmentName(a.getEnvironment() != null ? a.getEnvironment().getName() : null)
                        .deletedAt(a.getDeletedAt())
                        .componentsCount(softwareComponentRepository.countByAsset_IdAndDeletedAt(a.getId(), a.getDeletedAt()))
                        .build())
                .toList();
    }

    /** ASSET_OWNER solo ve los activos que tiene asignados; el resto de los roles ve todo. */
    private List<Asset> applyScope(List<Asset> assets) {
        if (!CurrentUser.isAssetOwner()) return assets;
        Set<Long> scope = userAssetAssignmentService.assignedAssetIds(CurrentUser.get().id());
        return assets.stream().filter(a -> scope.contains(a.getId())).toList();
    }

    @Transactional(readOnly = true)
    public AssetDTO.Response findById(Long id) {
        return assetMapper.toResponse(getOrThrow(id));
    }

    @Transactional
    public AssetDTO.Response create(AssetDTO.Request dto) {
        checkDuplicate(dto.getName(), dto.getEnvironmentId(), null);
        Asset asset = assetMapper.toEntity(dto);
        applyDefaultAssetType(asset);
        resolveEnvironment(dto.getEnvironmentId(), asset);
        asset.setCreatedAt(LocalDateTime.now());
        return assetMapper.toResponse(assetRepository.save(asset));
    }

    @Transactional
    public AssetDTO.Response update(Long id, AssetDTO.Request dto) {
        checkDuplicate(dto.getName(), dto.getEnvironmentId(), id);
        Asset existing = getOrThrow(id);
        assetMapper.updateEntity(dto, existing);
        applyDefaultAssetType(existing);
        resolveEnvironment(dto.getEnvironmentId(), existing);
        return assetMapper.toResponse(assetRepository.save(existing));
    }

    /** Espeja el indice unico parcial (activos no eliminados) con un 409 legible en vez de dejar que lo reviente el driver. */
    private void checkDuplicate(String name, Long environmentId, Long excludingId) {
        if (environmentId == null) return; // el indice parcial no aplica: NULL no colisiona con NULL en Postgres
        assetRepository.findByNameAndEnvironment_IdAndDeletedAtIsNull(name, environmentId)
                .filter(existing -> !existing.getId().equals(excludingId))
                .ifPresent(existing -> {
                    throw new ConflictException(
                            "Ya existe un activo con name=" + name + " en el entorno id=" + environmentId);
                });
    }

    /** Borrado logico en cascada: el activo y su software activo en ese momento quedan marcados
     *  con el mismo deletedAt, sin borrar nada fisicamente (se preserva el historial). */
    @Transactional
    public void delete(Long id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
        LocalDateTime now = LocalDateTime.now();
        asset.setDeletedAt(now);
        assetRepository.save(asset);

        List<SoftwareComponent> activeComponents = softwareComponentRepository.findByAsset_IdAndDeletedAtIsNull(id);
        activeComponents.forEach(c -> c.setDeletedAt(now));
        softwareComponentRepository.saveAll(activeComponents);
    }

    /** Restaura un activo eliminado y, de su software, solo el que se borro en ese mismo cascade
     *  (mismo deletedAt) -- uno eliminado independientemente antes o despues no revive. */
    @Transactional
    public void restore(Long id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
        LocalDateTime cascadeTimestamp = asset.getDeletedAt();
        if (cascadeTimestamp == null)
            throw new ConflictException("El activo id=" + id + " no está eliminado");

        asset.setDeletedAt(null);
        assetRepository.save(asset);

        List<SoftwareComponent> cascaded = softwareComponentRepository.findByAsset_IdAndDeletedAt(id, cascadeTimestamp);
        cascaded.forEach(c -> c.setDeletedAt(null));
        softwareComponentRepository.saveAll(cascaded);
    }

    private void applyDefaultAssetType(Asset asset) {
        if (asset.getAssetType() == null || asset.getAssetType().isBlank())
            asset.setAssetType(DEFAULT_ASSET_TYPE);
    }

    private void resolveEnvironment(Long environmentId, Asset asset) {
        if (environmentId != null) {
            Environment env = environmentRepository.findById(environmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Environment", environmentId));
            asset.setEnvironment(env);
        } else {
            asset.setEnvironment(null);
        }
    }

    private Asset getOrThrow(Long id) {
        Asset asset = assetRepository.findById(id)
                .filter(a -> a.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
        assertInScope(id);
        return asset;
    }

    /** 404 en vez de 403 si esta fuera del scope de ASSET_OWNER: no confirma que el recurso exista. */
    private void assertInScope(Long assetId) {
        if (!CurrentUser.isAssetOwner()) return;
        Set<Long> scope = userAssetAssignmentService.assignedAssetIds(CurrentUser.get().id());
        if (!scope.contains(assetId))
            throw new ResourceNotFoundException("Asset", assetId);
    }
}
