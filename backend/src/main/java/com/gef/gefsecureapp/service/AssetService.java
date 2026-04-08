package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.AssetDTO;
import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.AssetMapper;
import com.gef.gefsecureapp.model.Asset;
import com.gef.gefsecureapp.repository.AssetRepository;
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
        assetRepository.findBySoftwareAndVersion(dto.getSoftware(), dto.getVersion())
                .ifPresent(a -> {
                    throw new ConflictException(
                            "Ya existe un activo con software=" + dto.getSoftware() +
                            " y version=" + dto.getVersion());
                });
        Asset asset = assetMapper.toEntity(dto);
        asset.setLastScan(LocalDateTime.now());
        return assetMapper.toResponse(assetRepository.save(asset));
    }

    @Transactional
    public AssetDTO.Response update(Long id, AssetDTO.Request dto) {
        Asset existing = getOrThrow(id);
        assetMapper.updateEntity(dto, existing);
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

    private Asset getOrThrow(Long id) {
        return assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
    }
}
