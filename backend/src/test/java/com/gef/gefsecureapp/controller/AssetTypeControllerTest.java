package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.model.AssetType;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.AssetTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** CFG-CATALOG-DELETE (docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md): mismo
 *  hallazgo que Ecosistema, aplicado a Tipos de Host -- Asset.assetType es texto libre
 *  sin FK real. */
@ExtendWith(MockitoExtension.class)
class AssetTypeControllerTest {

    @Mock private AssetTypeRepository repository;
    @Mock private AssetRepository assetRepository;

    @InjectMocks private AssetTypeController controller;

    @Test
    void delete_should_rejectWithConflict_when_assetTypeInUse() {
        AssetType servidor = AssetType.builder().id(1L).name("SERVIDOR").build();
        when(repository.findById(1L)).thenReturn(Optional.of(servidor));
        when(assetRepository.countByAssetTypeIgnoreCaseAndDeletedAtIsNull("SERVIDOR")).thenReturn(4L);

        assertThatThrownBy(() -> controller.delete(1L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("4");

        verify(repository, never()).deleteById(any());
    }

    @Test
    void delete_should_succeed_when_assetTypeNotInUse() {
        AssetType unused = AssetType.builder().id(2L).name("IOT").build();
        when(repository.findById(2L)).thenReturn(Optional.of(unused));
        when(assetRepository.countByAssetTypeIgnoreCaseAndDeletedAtIsNull("IOT")).thenReturn(0L);

        controller.delete(2L);

        verify(repository).deleteById(2L);
    }

    @Test
    void delete_should_throwNotFound_when_assetTypeDoesNotExist() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.delete(999L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(assetRepository, never()).countByAssetTypeIgnoreCaseAndDeletedAtIsNull(any());
    }
}
