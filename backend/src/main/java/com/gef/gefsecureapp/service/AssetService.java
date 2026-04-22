package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.AssetDTO;
import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.AssetMapper;
import com.gef.gefsecureapp.model.Asset;
import com.gef.gefsecureapp.model.Environment;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.EnvironmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssetService {

    private final AssetRepository assetRepository;
    private final AssetMapper assetMapper;
    private final EnvironmentRepository environmentRepository;

    @Transactional(readOnly = true)
    public List<AssetDTO.Response> findAll() {
        return assetRepository.findAll().stream()
                .map(assetMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AssetDTO.Response> search(String query) {
        return assetRepository
                .findByNameContainingIgnoreCaseOrSoftwareContainingIgnoreCase(query, query)
                .stream()
                .map(assetMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssetDTO.Response findById(Long id) {
        return assetMapper.toResponse(getOrThrow(id));
    }

    @Transactional
    public AssetDTO.Response create(AssetDTO.Request dto) {
        if (dto.getEnvironmentId() != null) {
            assetRepository.findBySoftwareAndVersionAndEnvironment_Id(
                    dto.getSoftware(), dto.getVersion(), dto.getEnvironmentId())
                    .ifPresent(a -> {
                        throw new ConflictException(
                                "Ya existe un activo con software=" + dto.getSoftware() +
                                " version=" + dto.getVersion() +
                                " en el entorno id=" + dto.getEnvironmentId());
                    });
        }
        Asset asset = assetMapper.toEntity(dto);
        resolveEnvironment(dto.getEnvironmentId(), asset);
        asset.setLastScan(LocalDateTime.now());
        return assetMapper.toResponse(assetRepository.save(asset));
    }

    @Transactional
    public AssetDTO.Response update(Long id, AssetDTO.Request dto) {
        Asset existing = getOrThrow(id);
        assetMapper.updateEntity(dto, existing);
        resolveEnvironment(dto.getEnvironmentId(), existing);
        return assetMapper.toResponse(assetRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        if (!assetRepository.existsById(id))
            throw new ResourceNotFoundException("Asset", id);
        assetRepository.deleteById(id);
    }

    @Transactional
    public AssetDTO.Response triggerScan(Long id) {
        Asset asset = getOrThrow(id);
        asset.setLastScan(LocalDateTime.now());
        log.info("Scan triggered for asset id={} software={}", id, asset.getSoftware());
        return assetMapper.toResponse(assetRepository.save(asset));
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
        return assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
    }
}
