package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.SoftwareComponentDTO;
import com.gef.gefsecureapp.mapper.SoftwareComponentMapper;
import com.gef.gefsecureapp.model.Asset;
import com.gef.gefsecureapp.model.Environment;
import com.gef.gefsecureapp.model.SoftwareCatalog;
import com.gef.gefsecureapp.model.SoftwareComponent;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.SoftwareCatalogRepository;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.repository.SoftwareComponentRepository;
import com.gef.gefsecureapp.security.TestAuth;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SoftwareComponentServiceTest {

    @Mock private SoftwareComponentRepository softwareComponentRepository;
    @Mock private SoftwareComponentMapper softwareComponentMapper;
    @Mock private SoftwareCatalogRepository softwareCatalogRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private UserAssetAssignmentService userAssetAssignmentService;

    @InjectMocks private SoftwareComponentService softwareComponentService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest(name = "\"{0}\" / \"{1}\" normaliza a express/npm")
    @DisplayName("create() normaliza software y ecosystem a minuscula y sin espacios antes de guardar")
    @CsvSource({
            "EXPRESS, NPM",
            "' express ', ' npm '",
            "Express, Npm",
    })
    void create_should_normalizeSoftwareAndEcosystem_beforeSaving(String rawSoftware, String rawEcosystem) {
        SoftwareComponentDTO.Request dto = SoftwareComponentDTO.Request.builder()
                .name("Gateway")
                .software(rawSoftware)
                .ecosystem(rawEcosystem)
                .version("4.18.2")
                .assetId(9L)
                .build();

        when(softwareComponentMapper.toEntity(dto)).thenReturn(new SoftwareComponent());
        when(softwareCatalogRepository.findByPackageNameAndEcosystem("express", "npm"))
                .thenReturn(Optional.empty());
        when(assetRepository.findById(9L)).thenReturn(Optional.of(Asset.builder().id(9L).build()));
        when(softwareComponentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        softwareComponentService.create(dto);

        assertThat(dto.getSoftware()).isEqualTo("express");
        assertThat(dto.getEcosystem()).isEqualTo("npm");
    }

    @Test
    @DisplayName("create() marca catalogued=true y arma el purl cuando el paquete existe en el catalogo")
    void create_should_markCataloguedAndBuildPurl_when_packageInCatalog() {
        SoftwareComponentDTO.Request dto = SoftwareComponentDTO.Request.builder()
                .name("Gateway")
                .software("EXPRESS")
                .ecosystem("NPM")
                .version("4.18.2")
                .assetId(9L)
                .build();

        when(softwareComponentMapper.toEntity(dto)).thenReturn(new SoftwareComponent());
        when(softwareCatalogRepository.findByPackageNameAndEcosystem("express", "npm"))
                .thenReturn(Optional.of(SoftwareCatalog.builder().packageName("express").ecosystem("npm").build()));
        when(assetRepository.findById(9L)).thenReturn(Optional.of(Asset.builder().id(9L).build()));
        ArgumentCaptor<SoftwareComponent> captor = ArgumentCaptor.forClass(SoftwareComponent.class);
        when(softwareComponentRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        softwareComponentService.create(dto);

        SoftwareComponent saved = captor.getValue();
        assertThat(saved.isCatalogued()).isTrue();
        assertThat(saved.getPurl()).isEqualTo("pkg:npm/express@4.18.2");
    }

    @Test
    @DisplayName("create() marca catalogued=false y omite el purl cuando el paquete no esta en el catalogo o no hay version")
    void create_should_markCataloguedFalse_and_skipPurl_when_packageUnknownOrNoVersion() {
        SoftwareComponentDTO.Request dto = SoftwareComponentDTO.Request.builder()
                .name("Interno")
                .software("paquete-interno-xyz")
                .ecosystem("npm")
                .assetId(9L)
                .build(); // sin version

        when(softwareComponentMapper.toEntity(dto)).thenReturn(new SoftwareComponent());
        when(softwareCatalogRepository.findByPackageNameAndEcosystem("paquete-interno-xyz", "npm"))
                .thenReturn(Optional.empty());
        when(assetRepository.findById(9L)).thenReturn(Optional.of(Asset.builder().id(9L).build()));
        ArgumentCaptor<SoftwareComponent> captor = ArgumentCaptor.forClass(SoftwareComponent.class);
        when(softwareComponentRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        softwareComponentService.create(dto);

        SoftwareComponent saved = captor.getValue();
        assertThat(saved.isCatalogued()).isFalse();
        assertThat(saved.getPurl()).isNull();
    }

    @Test
    @DisplayName("create() detecta duplicado aunque el software venga con otra capitalizacion que el ya guardado")
    void create_should_throwConflict_when_duplicateExists_withDifferentCasing() {
        SoftwareComponentDTO.Request dto = SoftwareComponentDTO.Request.builder()
                .name("Otro Gateway")
                .software("EXPRESS")
                .ecosystem("NPM")
                .version("4.18.2")
                .assetId(9L)
                .build();

        Environment env = Environment.builder().id(1L).build();
        Asset asset = Asset.builder().id(9L).environment(env).build();
        when(softwareComponentMapper.toEntity(dto)).thenReturn(new SoftwareComponent());
        when(assetRepository.findById(9L)).thenReturn(Optional.of(asset));
        when(softwareComponentRepository.findBySoftwareAndVersionAndAsset_Environment_IdAndDeletedAtIsNull("express", "4.18.2", 1L))
                .thenReturn(Optional.of(new SoftwareComponent()));

        org.junit.jupiter.api.Assertions.assertThrows(
                com.gef.gefsecureapp.exception.ConflictException.class,
                () -> softwareComponentService.create(dto));
    }

    @Test
    @DisplayName("update() tambien normaliza y recalcula catalogued/purl")
    void update_should_normalizeAndResolveCatalogAndPurl() {
        TestAuth.loginAs(1L, "fede.frankenberger", "ADMIN");
        Long id = 5L;
        SoftwareComponent existing = new SoftwareComponent();
        SoftwareComponentDTO.Request dto = SoftwareComponentDTO.Request.builder()
                .name("Gateway")
                .software("EXPRESS")
                .ecosystem("NPM")
                .version("4.18.2")
                .assetId(9L)
                .build();

        when(softwareComponentRepository.findById(id)).thenReturn(Optional.of(existing));
        when(softwareCatalogRepository.findByPackageNameAndEcosystem("express", "npm"))
                .thenReturn(Optional.of(SoftwareCatalog.builder().packageName("express").ecosystem("npm").build()));
        when(assetRepository.findById(9L)).thenReturn(Optional.of(Asset.builder().id(9L).build()));
        when(softwareComponentRepository.save(existing)).thenReturn(existing);

        softwareComponentService.update(id, dto);

        assertThat(existing.isCatalogued()).isTrue();
        assertThat(existing.getPurl()).isEqualTo("pkg:npm/express@4.18.2");
        assertThat(dto.getSoftware()).isEqualTo("express");
    }

    @Test
    @DisplayName("create() asigna el host cuando viene assetId")
    void create_should_resolveAsset_when_assetIdProvided() {
        SoftwareComponentDTO.Request dto = SoftwareComponentDTO.Request.builder()
                .name("Gateway")
                .software("express")
                .ecosystem("npm")
                .assetId(9L)
                .build();
        Asset host = Asset.builder().id(9L).name("servidor_oficina").build();

        when(softwareComponentMapper.toEntity(dto)).thenReturn(new SoftwareComponent());
        when(softwareCatalogRepository.findByPackageNameAndEcosystem("express", "npm"))
                .thenReturn(Optional.empty());
        when(assetRepository.findById(9L)).thenReturn(Optional.of(host));
        ArgumentCaptor<SoftwareComponent> captor = ArgumentCaptor.forClass(SoftwareComponent.class);
        when(softwareComponentRepository.save(captor.capture())).thenAnswer(inv -> inv.getArgument(0));

        softwareComponentService.create(dto);

        assertThat(captor.getValue().getAsset()).isEqualTo(host);
    }

    @Test
    @DisplayName("findAll() para ASSET_OWNER devuelve solo componentes cuyo host esta en su scope")
    void findAll_should_filterByScope_when_userIsAssetOwner() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        Asset ownedHost = Asset.builder().id(1L).build();
        Asset otherHost = Asset.builder().id(2L).build();
        SoftwareComponent inScope = SoftwareComponent.builder().id(100L).asset(ownedHost).build();
        SoftwareComponent outOfScope = SoftwareComponent.builder().id(200L).asset(otherHost).build();
        SoftwareComponent noHost = SoftwareComponent.builder().id(300L).asset(null).build();
        when(softwareComponentRepository.findByDeletedAtIsNull()).thenReturn(List.of(inScope, outOfScope, noHost));
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(1L));

        softwareComponentService.findAll();

        verify(softwareComponentMapper).toResponse(inScope);
        verify(softwareComponentMapper, never()).toResponse(outOfScope);
        verify(softwareComponentMapper, never()).toResponse(noHost);
    }

    @Test
    @DisplayName("findAll() para AUDITOR devuelve todos los componentes, sin consultar el scope")
    void findAll_should_notFilter_when_userIsAuditor() {
        TestAuth.loginAs(3L, "auditor.demo", "AUDITOR");
        SoftwareComponent c1 = SoftwareComponent.builder().id(100L).build();
        when(softwareComponentRepository.findByDeletedAtIsNull()).thenReturn(List.of(c1));

        softwareComponentService.findAll();

        verify(softwareComponentMapper).toResponse(c1);
        verifyNoInteractions(userAssetAssignmentService);
    }

    @Test
    @DisplayName("findById() de un componente fuera de scope para ASSET_OWNER da 404")
    void findById_should_throwNotFound_when_outOfScope_forAssetOwner() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        Asset otherHost = Asset.builder().id(2L).build();
        SoftwareComponent outOfScope = SoftwareComponent.builder().id(200L).asset(otherHost).build();
        when(softwareComponentRepository.findById(200L)).thenReturn(Optional.of(outOfScope));
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(1L));

        assertThatThrownBy(() -> softwareComponentService.findById(200L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("delete() marca el componente como eliminado, no lo borra fisicamente")
    void delete_should_softDelete_notPhysicallyRemove() {
        Long id = 100L;
        SoftwareComponent component = SoftwareComponent.builder().id(id).build();
        when(softwareComponentRepository.findById(id)).thenReturn(Optional.of(component));

        softwareComponentService.delete(id);

        assertThat(component.getDeletedAt()).isNotNull();
        verify(softwareComponentRepository).save(component);
        verify(softwareComponentRepository, never()).deleteById(any());
        verify(softwareComponentRepository, never()).delete(any());
    }
}
