package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.AssetDTO;
import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.mapper.AssetMapper;
import com.gef.gefsecureapp.model.Asset;
import com.gef.gefsecureapp.model.Environment;
import com.gef.gefsecureapp.model.SoftwareComponent;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.EnvironmentRepository;
import com.gef.gefsecureapp.repository.SoftwareComponentRepository;
import com.gef.gefsecureapp.security.TestAuth;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    @Mock private AssetRepository assetRepository;
    @Mock private AssetMapper assetMapper;
    @Mock private EnvironmentRepository environmentRepository;
    @Mock private UserAssetAssignmentService userAssetAssignmentService;
    @Mock private SoftwareComponentRepository softwareComponentRepository;

    @InjectMocks private AssetService assetService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("create() rechaza con 409 un nombre duplicado en el mismo entorno, en vez de dejar reventar la constraint de la base")
    void create_should_throwConflict_when_duplicateNameInSameEnvironment() {
        AssetDTO.Request dto = AssetDTO.Request.builder().name("servidor_oficina").environmentId(1L).build();

        when(assetRepository.findByNameAndEnvironment_IdAndDeletedAtIsNull("servidor_oficina", 1L))
                .thenReturn(Optional.of(Asset.builder().id(99L).name("servidor_oficina").build()));

        Assertions.assertThrows(ConflictException.class, () -> assetService.create(dto));
    }

    @Test
    @DisplayName("create() no rechaza el mismo nombre si el entorno es distinto")
    void create_should_allow_when_sameNameDifferentEnvironment() {
        AssetDTO.Request dto = AssetDTO.Request.builder().name("servidor_oficina").environmentId(2L).build();

        when(assetRepository.findByNameAndEnvironment_IdAndDeletedAtIsNull("servidor_oficina", 2L)).thenReturn(Optional.empty());
        when(assetMapper.toEntity(dto)).thenReturn(new Asset());
        when(environmentRepository.findById(2L)).thenReturn(Optional.of(Environment.builder().id(2L).build()));
        when(assetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Assertions.assertDoesNotThrow(() -> assetService.create(dto));
    }

    @Test
    @DisplayName("update() no se rechaza a si mismo al guardar sin cambiar name/environmentId")
    void update_should_notConflictWithItself() {
        TestAuth.loginAs(1L, "fede.frankenberger", "ADMIN");
        Long id = 7L;
        Asset existing = Asset.builder().id(id).name("servidor_oficina").build();
        AssetDTO.Request dto = AssetDTO.Request.builder().name("servidor_oficina").environmentId(1L).build();

        when(assetRepository.findByNameAndEnvironment_IdAndDeletedAtIsNull("servidor_oficina", 1L))
                .thenReturn(Optional.of(existing));
        when(assetRepository.findById(id)).thenReturn(Optional.of(existing));
        when(environmentRepository.findById(1L)).thenReturn(Optional.of(Environment.builder().id(1L).build()));
        when(assetRepository.save(existing)).thenReturn(existing);

        Assertions.assertDoesNotThrow(() -> assetService.update(id, dto));
        assertThat(existing.getName()).isEqualTo("servidor_oficina");
    }

    @Test
    @DisplayName("create() aplica SERVIDOR por defecto cuando no se envia assetType")
    void create_should_applyDefaultAssetType_when_notProvided() {
        AssetDTO.Request dto = AssetDTO.Request.builder().name("host-sin-tipo").build();

        when(assetMapper.toEntity(dto)).thenReturn(new Asset());
        ArgumentCaptor<Asset> captor = ArgumentCaptor.forClass(Asset.class);
        when(assetRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        assetService.create(dto);

        assertThat(captor.getValue().getAssetType()).isEqualTo("SERVIDOR");
    }

    @Test
    @DisplayName("findAll() para ASSET_OWNER devuelve solo los activos asignados")
    void findAll_should_filterByScope_when_userIsAssetOwner() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        Asset assigned = Asset.builder().id(1L).name("servidor_oficina").build();
        Asset notAssigned = Asset.builder().id(2L).name("servidor_otro").build();
        when(assetRepository.findByDeletedAtIsNull()).thenReturn(List.of(assigned, notAssigned));
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(1L));

        assetService.findAll();

        verify(assetMapper).toResponse(assigned);
        verify(assetMapper, never()).toResponse(notAssigned);
    }

    @Test
    @DisplayName("findAll() para ADMIN devuelve todos los activos, sin consultar el scope")
    void findAll_should_notFilter_when_userIsAdmin() {
        TestAuth.loginAs(1L, "fede.frankenberger", "ADMIN");
        Asset a1 = Asset.builder().id(1L).build();
        Asset a2 = Asset.builder().id(2L).build();
        when(assetRepository.findByDeletedAtIsNull()).thenReturn(List.of(a1, a2));

        assetService.findAll();

        verify(assetMapper).toResponse(a1);
        verify(assetMapper).toResponse(a2);
        verifyNoInteractions(userAssetAssignmentService);
    }

    @Test
    @DisplayName("findById() de un activo fuera de scope para ASSET_OWNER da 404 (no confirma que exista)")
    void findById_should_throwNotFound_when_outOfScope_forAssetOwner() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        Asset notAssigned = Asset.builder().id(2L).name("servidor_otro").build();
        when(assetRepository.findById(2L)).thenReturn(Optional.of(notAssigned));
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(1L));

        assertThatThrownBy(() -> assetService.findById(2L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("findById() de un activo dentro de scope para ASSET_OWNER lo devuelve normalmente")
    void findById_should_return_when_inScope_forAssetOwner() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        Asset assigned = Asset.builder().id(1L).name("servidor_oficina").build();
        when(assetRepository.findById(1L)).thenReturn(Optional.of(assigned));
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(1L));

        Assertions.assertDoesNotThrow(() -> assetService.findById(1L));
        verify(assetMapper).toResponse(assigned);
    }

    @Test
    @DisplayName("delete() marca el activo como eliminado y en cascada marca sus componentes activos, sin borrar nada fisicamente")
    void delete_should_softDelete_andCascadeToActiveComponents() {
        Long assetId = 5L;
        Asset asset = Asset.builder().id(assetId).name("host").build();
        SoftwareComponent comp1 = SoftwareComponent.builder().id(100L).asset(asset).build();
        SoftwareComponent comp2 = SoftwareComponent.builder().id(101L).asset(asset).build();

        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(softwareComponentRepository.findByAsset_IdAndDeletedAtIsNull(assetId))
                .thenReturn(List.of(comp1, comp2));

        assetService.delete(assetId);

        assertThat(asset.getDeletedAt()).isNotNull();
        assertThat(comp1.getDeletedAt()).isNotNull();
        assertThat(comp2.getDeletedAt()).isNotNull();
        assertThat(comp1.getDeletedAt()).isEqualTo(asset.getDeletedAt());
        verify(assetRepository).save(asset);
        verify(softwareComponentRepository).saveAll(List.of(comp1, comp2));
        verify(assetRepository, never()).deleteById(any());
        verify(softwareComponentRepository, never()).delete(any());
    }

    @Test
    @DisplayName("delete() no toca un componente que ya estaba eliminado independientemente antes")
    void delete_should_notTouch_componentAlreadyDeletedBefore() {
        Long assetId = 5L;
        Asset asset = Asset.builder().id(assetId).name("host").build();
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        // El componente ya eliminado no forma parte de "activos" del host: no lo devuelve el repo
        when(softwareComponentRepository.findByAsset_IdAndDeletedAtIsNull(assetId)).thenReturn(List.of());

        assetService.delete(assetId);

        verify(softwareComponentRepository).saveAll(List.of());
    }

    @Test
    @DisplayName("restore() revive el activo y solo los componentes borrados en ese mismo cascade")
    void restore_should_restoreAsset_andOnlyComponentsFromSameCascade() {
        Long assetId = 5L;
        LocalDateTime cascadeTime = LocalDateTime.now().minusHours(1);
        Asset asset = Asset.builder().id(assetId).name("host").deletedAt(cascadeTime).build();
        SoftwareComponent fromCascade = SoftwareComponent.builder().id(100L).asset(asset).deletedAt(cascadeTime).build();

        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(softwareComponentRepository.findByAsset_IdAndDeletedAt(assetId, cascadeTime))
                .thenReturn(List.of(fromCascade));

        assetService.restore(assetId);

        assertThat(asset.getDeletedAt()).isNull();
        assertThat(fromCascade.getDeletedAt()).isNull();
        verify(assetRepository).save(asset);
        verify(softwareComponentRepository).saveAll(List.of(fromCascade));
        // El componente borrado independientemente en otro momento nunca se consulta con ese
        // timestamp, asi que nunca puede revivir por accidente al restaurar el host.
    }

    @Test
    @DisplayName("restore() de un activo que no esta eliminado da 409")
    void restore_should_throwConflict_when_assetNotDeleted() {
        Long assetId = 5L;
        Asset asset = Asset.builder().id(assetId).name("host").deletedAt(null).build();
        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));

        assertThatThrownBy(() -> assetService.restore(assetId)).isInstanceOf(ConflictException.class);
        verify(assetRepository, never()).save(any());
    }

    @Test
    @DisplayName("findAll() nunca devuelve activos eliminados logicamente")
    void findAll_should_excludeSoftDeleted() {
        TestAuth.loginAs(1L, "fede.frankenberger", "ADMIN");
        Asset active = Asset.builder().id(1L).build();
        when(assetRepository.findByDeletedAtIsNull()).thenReturn(List.of(active));

        assetService.findAll();

        verify(assetMapper).toResponse(active);
        verify(assetRepository, never()).findAll();
    }
}
