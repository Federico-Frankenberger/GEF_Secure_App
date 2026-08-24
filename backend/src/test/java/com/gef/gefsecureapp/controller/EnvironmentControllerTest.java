package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.EnvironmentRepository;
import com.gef.gefsecureapp.service.N8nWebhookService;
import com.gef.gefsecureapp.service.ScanService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** CFG-ENV-DELETE (docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md): antes,
 *  DELETE /api/environments/{id} nunca chequeaba si habia activos usando el entorno --
 *  la FK tiene ON DELETE SET NULL, asi que el borrado siempre tenia exito (204),
 *  desvinculando activos reales en silencio. Reproducido en vivo durante la propia
 *  auditoria (se borro por accidente el entorno real "Producción", desvinculando 2
 *  activos reales) -- confirma que no es un caso teorico. */
@ExtendWith(MockitoExtension.class)
class EnvironmentControllerTest {

    @Mock private EnvironmentRepository environmentRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private N8nWebhookService webhookService;
    @Mock private ScanService scanService;

    @InjectMocks private EnvironmentController controller;

    @Test
    void delete_should_rejectWithConflict_when_environmentHasActiveAssets() {
        when(environmentRepository.existsById(3L)).thenReturn(true);
        when(assetRepository.countByEnvironment_IdAndDeletedAtIsNull(3L)).thenReturn(2L);

        assertThatThrownBy(() -> controller.delete(3L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("2");

        verify(environmentRepository, never()).deleteById(any());
    }

    @Test
    void delete_should_succeed_when_environmentHasNoActiveAssets() {
        when(environmentRepository.existsById(3L)).thenReturn(true);
        when(assetRepository.countByEnvironment_IdAndDeletedAtIsNull(3L)).thenReturn(0L);

        controller.delete(3L);

        verify(environmentRepository).deleteById(3L);
    }

    @Test
    void delete_should_throwNotFound_when_environmentDoesNotExist() {
        when(environmentRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> controller.delete(999L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(assetRepository, never()).countByEnvironment_IdAndDeletedAtIsNull(any());
        verify(environmentRepository, never()).deleteById(any());
    }
}
