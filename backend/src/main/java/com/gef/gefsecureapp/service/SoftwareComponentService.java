package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.SoftwareComponentDTO;
import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.InvalidEcosystemException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.SoftwareComponentMapper;
import com.gef.gefsecureapp.model.Asset;
import com.gef.gefsecureapp.model.SoftwareComponent;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.EcosystemRepository;
import com.gef.gefsecureapp.repository.SoftwareCatalogRepository;
import com.gef.gefsecureapp.repository.SoftwareComponentRepository;
import com.gef.gefsecureapp.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class SoftwareComponentService {

    private final SoftwareComponentRepository softwareComponentRepository;
    private final SoftwareComponentMapper softwareComponentMapper;
    private final SoftwareCatalogRepository softwareCatalogRepository;
    private final AssetRepository assetRepository;
    private final UserAssetAssignmentService userAssetAssignmentService;
    private final EcosystemRepository ecosystemRepository;

    @Transactional(readOnly = true)
    public List<SoftwareComponentDTO.Response> findAll() {
        return applyScope(softwareComponentRepository.findByDeletedAtIsNull()).stream()
                .map(softwareComponentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SoftwareComponentDTO.Response> search(String query) {
        return applyScope(softwareComponentRepository.searchActive(query))
                .stream()
                .map(softwareComponentMapper::toResponse)
                .toList();
    }

    /** ASSET_OWNER solo ve componentes cuyo host esta en su scope; sin host asignado queda invisible para ese rol. */
    private List<SoftwareComponent> applyScope(List<SoftwareComponent> components) {
        if (!CurrentUser.isAssetOwner()) return components;
        Set<Long> scope = userAssetAssignmentService.assignedAssetIds(CurrentUser.get().id());
        return components.stream()
                .filter(c -> c.getAsset() != null && scope.contains(c.getAsset().getId()))
                .toList();
    }

    @Transactional(readOnly = true)
    public SoftwareComponentDTO.Response findById(Long id) {
        return softwareComponentMapper.toResponse(getOrThrow(id));
    }

    @Transactional
    public SoftwareComponentDTO.Response create(SoftwareComponentDTO.Request dto) {
        normalize(dto);
        SoftwareComponent component = softwareComponentMapper.toEntity(dto);
        resolveAsset(dto.getAssetId(), component);

        // DB-05 (docs/20-08-26/AUDITORIA_END_TO_END.md): antes comparaba por
        // software+version+entorno completo (colisionaba entre dos ACTIVOS distintos
        // del mismo entorno, y no corria si el activo no tenia entorno asignado). Ahora
        // usa el mismo criterio que el UNIQUE real de la base (init/16-unique-component-
        // per-asset.sql): asset+software+ecosystem+version -- decision confirmada: dos
        // versiones del mismo paquete en el mismo activo son filas separadas, no un
        // upsert (a diferencia de la importacion SBOM, que si actualiza en el lugar,
        // ver InventoryService).
        softwareComponentRepository.findByAsset_IdAndSoftwareAndEcosystemAndVersionAndDeletedAtIsNull(
                dto.getAssetId(), dto.getSoftware(), dto.getEcosystem(), dto.getVersion())
                .ifPresent(a -> { throw duplicateConflict(dto); });

        resolveCatalogAndPurl(dto, component);
        component.setLastScan(LocalDateTime.now());
        try {
            return softwareComponentMapper.toResponse(softwareComponentRepository.save(component));
        } catch (DataIntegrityViolationException e) {
            // Red de seguridad final contra la condicion de carrera del chequeo de
            // arriba (SELECT seguido de INSERT, sin lock) -- si dos requests casi
            // simultaneas pasan el chequeo antes de que cualquiera confirme, es el
            // UNIQUE de la base el que realmente lo impide.
            throw duplicateConflict(dto);
        }
    }

    private ConflictException duplicateConflict(SoftwareComponentDTO.Request dto) {
        return new ConflictException("Ya existe este componente (software=" + dto.getSoftware() +
                ", ecosystem=" + dto.getEcosystem() + ", version=" + dto.getVersion() + ") en este activo");
    }

    @Transactional
    public SoftwareComponentDTO.Response update(Long id, SoftwareComponentDTO.Request dto) {
        normalize(dto);
        SoftwareComponent existing = getOrThrow(id);
        softwareComponentMapper.updateEntity(dto, existing);
        resolveAsset(dto.getAssetId(), existing);
        resolveCatalogAndPurl(dto, existing);
        return softwareComponentMapper.toResponse(softwareComponentRepository.save(existing));
    }

    /** Trim + lowercase — así "Express JS" y " express " colapsan al mismo valor comparado por GitHub Advisory. */
    private void normalize(SoftwareComponentDTO.Request dto) {
        if (dto.getSoftware() != null) dto.setSoftware(dto.getSoftware().trim().toLowerCase());
        if (dto.getEcosystem() != null) dto.setEcosystem(dto.getEcosystem().trim().toLowerCase());
        // ECO-CATALOGO (docs/20-08-26/AUDITORIA_END_TO_END_2.md): un ecosystem que no existe
        // en public.ecosystems nunca va a poder matchear contra GitHub Advisory -- antes se
        // persistia igual (confirmado en vivo con componentes reales cargados como "docker"/
        // "rust" en vez de "cargo"), un falso negativo permanente y silencioso.
        if (dto.getEcosystem() != null && !ecosystemRepository.existsByNameIgnoreCase(dto.getEcosystem()))
            throw new InvalidEcosystemException(dto.getEcosystem());
    }

    private void resolveCatalogAndPurl(SoftwareComponentDTO.Request dto, SoftwareComponent component) {
        boolean catalogued = softwareCatalogRepository
                .findByPackageNameAndEcosystem(dto.getSoftware(), dto.getEcosystem())
                .isPresent();
        component.setCatalogued(catalogued);

        String version = dto.getVersion();
        component.setPurl(version == null || version.isBlank()
                ? null
                : "pkg:%s/%s@%s".formatted(dto.getEcosystem(), dto.getSoftware(), version));
    }

    /** Borrado logico individual: preserva el historial de vulnerabilidades del componente.
     *  No se expone restauracion individual en esta pasada -- solo se restaura via su activo,
     *  cuando el componente se borro en el mismo cascade que el host (ver AssetService.restore). */
    @Transactional
    public void delete(Long id) {
        SoftwareComponent component = softwareComponentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SoftwareComponent", id));
        component.setDeletedAt(LocalDateTime.now());
        softwareComponentRepository.save(component);
    }

    @Transactional
    public SoftwareComponentDTO.Response triggerScan(Long id) {
        SoftwareComponent component = getOrThrow(id);
        component.setLastScan(LocalDateTime.now());
        log.info("Scan triggered for component id={} software={}", id, component.getSoftware());
        return softwareComponentMapper.toResponse(softwareComponentRepository.save(component));
    }

    /** El software siempre pertenece a un activo -- assetId es @NotNull en el DTO, esto solo resuelve la referencia. */
    private Asset resolveAsset(Long assetId, SoftwareComponent component) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", assetId));
        component.setAsset(asset);
        return asset;
    }

    private SoftwareComponent getOrThrow(Long id) {
        SoftwareComponent component = softwareComponentRepository.findById(id)
                .filter(c -> c.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("SoftwareComponent", id));
        assertInScope(component);
        return component;
    }

    private void assertInScope(SoftwareComponent component) {
        if (!CurrentUser.isAssetOwner()) return;
        Set<Long> scope = userAssetAssignmentService.assignedAssetIds(CurrentUser.get().id());
        if (component.getAsset() == null || !scope.contains(component.getAsset().getId()))
            throw new ResourceNotFoundException("SoftwareComponent", component.getId());
    }
}
