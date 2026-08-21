package com.gef.gefsecureapp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gef.gefsecureapp.dto.AssetDTO;
import com.gef.gefsecureapp.dto.InventoryDTO;
import com.gef.gefsecureapp.dto.SoftwareComponentDTO;
import com.gef.gefsecureapp.exception.InvalidInventoryFileException;
import com.gef.gefsecureapp.model.SoftwareComponent;
import com.gef.gefsecureapp.repository.SoftwareComponentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InventoryServiceTest {

    @Mock private SoftwareComponentRepository softwareComponentRepository;
    @Mock private SoftwareComponentService softwareComponentService;
    @Mock private AssetService assetService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private InventoryService inventoryService() {
        return new InventoryService(softwareComponentRepository, softwareComponentService, assetService, objectMapper);
    }

    private MultipartFile cycloneDxWithSpringBootStarterWeb() {
        String json = """
                {
                  "components": [
                    {
                      "type": "library",
                      "name": "spring-boot-starter-web",
                      "version": "3.1.0",
                      "purl": "pkg:maven/org.springframework.boot/spring-boot-starter-web@3.1.0"
                    },
                    {
                      "type": "library",
                      "name": "algo-raro",
                      "version": "1.0.0",
                      "purl": "pkg:conan/algo-raro@1.0.0"
                    }
                  ]
                }
                """;
        return new MockMultipartFile("file", "sbom.json", "application/json", json.getBytes());
    }

    @Test
    @DisplayName("preview() clasifica un componente nuevo como NUEVO y uno con purl desconocido como NO_RECONOCIDO, sin persistir nada")
    void preview_should_classifyItems_without_persisting() {
        when(assetService.findById(1L)).thenReturn(AssetDTO.Response.builder().id(1L).name("Spring Boot Backend").build());
        when(softwareComponentRepository.findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull(
                eq(1L), eq("org.springframework.boot:spring-boot-starter-web"), eq("maven")))
                .thenReturn(Optional.empty());

        InventoryDTO.Summary summary = inventoryService().preview(1L, cycloneDxWithSpringBootStarterWeb());

        assertThat(summary.getTotal()).isEqualTo(2);
        assertThat(summary.getNuevos()).isEqualTo(1);
        assertThat(summary.getNoReconocidos()).isEqualTo(1);
        verify(softwareComponentService, never()).create(any());
        verify(softwareComponentService, never()).update(any(), any());
    }

    @Test
    @DisplayName("importInventory() crea el componente nuevo reconocido via purl")
    void importInventory_should_createNewComponent() {
        when(assetService.findById(1L)).thenReturn(AssetDTO.Response.builder().id(1L).build());
        when(softwareComponentRepository.findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull(
                eq(1L), eq("org.springframework.boot:spring-boot-starter-web"), eq("maven")))
                .thenReturn(Optional.empty());

        InventoryDTO.Summary summary = inventoryService().importInventory(1L, cycloneDxWithSpringBootStarterWeb());

        assertThat(summary.getNuevos()).isEqualTo(1);
        verify(softwareComponentService).create(argThat((SoftwareComponentDTO.Request req) ->
                req.getSoftware().equals("org.springframework.boot:spring-boot-starter-web")
                        && req.getEcosystem().equals("maven")
                        && req.getVersion().equals("3.1.0")
                        && req.getAssetId().equals(1L)
                        // el nombre corto (ultimo segmento) evita duplicar la coordenada completa
                        // en dos columnas de la tabla del frontend
                        && req.getName().equals("spring-boot-starter-web 3.1.0")));
    }

    @Test
    @DisplayName("importInventory() actualiza la version cuando el componente ya existe con otra version")
    void importInventory_should_updateExistingComponent_when_versionChanged() {
        SoftwareComponent existing = SoftwareComponent.builder().id(99L).version("2.0.0").build();
        when(assetService.findById(1L)).thenReturn(AssetDTO.Response.builder().id(1L).build());
        when(softwareComponentRepository.findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull(
                eq(1L), eq("org.springframework.boot:spring-boot-starter-web"), eq("maven")))
                .thenReturn(Optional.of(existing));

        InventoryDTO.Summary summary = inventoryService().importInventory(1L, cycloneDxWithSpringBootStarterWeb());

        assertThat(summary.getActualizados()).isEqualTo(1);
        verify(softwareComponentService).update(eq(99L), any(SoftwareComponentDTO.Request.class));
    }

    @Test
    @DisplayName("importInventory() no toca nada cuando la version ya es la misma")
    void importInventory_should_skipUnchangedComponent() {
        SoftwareComponent existing = SoftwareComponent.builder().id(99L).version("3.1.0").build();
        when(assetService.findById(1L)).thenReturn(AssetDTO.Response.builder().id(1L).build());
        when(softwareComponentRepository.findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull(
                eq(1L), eq("org.springframework.boot:spring-boot-starter-web"), eq("maven")))
                .thenReturn(Optional.of(existing));

        InventoryDTO.Summary summary = inventoryService().importInventory(1L, cycloneDxWithSpringBootStarterWeb());

        assertThat(summary.getSinCambios()).isEqualTo(1);
        verify(softwareComponentService, never()).create(any());
        verify(softwareComponentService, never()).update(any(), any());
    }

    private MultipartFile cycloneDxWithDuplicatePurl(String versionA, String versionB) {
        String json = """
                {
                  "components": [
                    {
                      "type": "library",
                      "name": "spring-boot-starter-web",
                      "version": "%s",
                      "purl": "pkg:maven/org.springframework.boot/spring-boot-starter-web@%s"
                    },
                    {
                      "type": "library",
                      "name": "spring-boot-starter-web",
                      "version": "%s",
                      "purl": "pkg:maven/org.springframework.boot/spring-boot-starter-web@%s"
                    }
                  ]
                }
                """.formatted(versionA, versionA, versionB, versionB);
        return new MockMultipartFile("file", "sbom.json", "application/json", json.getBytes());
    }

    @Test
    @DisplayName("M5: preview() detecta un purl repetido con la misma version dentro del mismo SBOM como SIN_CAMBIOS, no como dos NUEVOs")
    void preview_should_dedupe_repeatedPurl_sameVersion() {
        when(assetService.findById(1L)).thenReturn(AssetDTO.Response.builder().id(1L).build());
        when(softwareComponentRepository.findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull(
                eq(1L), eq("org.springframework.boot:spring-boot-starter-web"), eq("maven")))
                .thenReturn(Optional.empty());

        InventoryDTO.Summary summary = inventoryService().preview(1L, cycloneDxWithDuplicatePurl("3.1.0", "3.1.0"));

        assertThat(summary.getTotal()).isEqualTo(2);
        assertThat(summary.getNuevos()).isEqualTo(1);
        assertThat(summary.getSinCambios()).isEqualTo(1);
    }

    @Test
    @DisplayName("M5: preview() detecta un purl repetido con distinta version dentro del mismo SBOM como ACTUALIZADO, no como dos NUEVOs")
    void preview_should_dedupe_repeatedPurl_differentVersion() {
        when(assetService.findById(1L)).thenReturn(AssetDTO.Response.builder().id(1L).build());
        when(softwareComponentRepository.findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull(
                eq(1L), eq("org.springframework.boot:spring-boot-starter-web"), eq("maven")))
                .thenReturn(Optional.empty());

        InventoryDTO.Summary summary = inventoryService().preview(1L, cycloneDxWithDuplicatePurl("3.1.0", "3.2.0"));

        assertThat(summary.getTotal()).isEqualTo(2);
        assertThat(summary.getNuevos()).isEqualTo(1);
        assertThat(summary.getActualizados()).isEqualTo(1);
    }

    @Test
    @DisplayName("preview() rechaza un archivo vacio con InvalidInventoryFileException")
    void preview_should_reject_emptyFile() {
        when(assetService.findById(1L)).thenReturn(AssetDTO.Response.builder().id(1L).build());
        MultipartFile empty = new MockMultipartFile("file", "sbom.json", "application/json", new byte[0]);

        assertThatThrownBy(() -> inventoryService().preview(1L, empty))
                .isInstanceOf(InvalidInventoryFileException.class);
    }
}
