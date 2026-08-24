package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.model.Ecosystem;
import com.gef.gefsecureapp.repository.EcosystemRepository;
import com.gef.gefsecureapp.repository.SoftwareComponentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/** CFG-CATALOG-DELETE (docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md): borrar un
 *  Ecosistema en uso no avisaba del impacto -- SoftwareComponent.ecosystem es texto libre
 *  sin FK real, asi que el borrado del catalogo siempre tenia exito, y los componentes que
 *  lo usaban empezaban a mostrar el badge "no reconocido" sin que el ADMIN se enterara. */
@ExtendWith(MockitoExtension.class)
class EcosystemControllerTest {

    @Mock private EcosystemRepository repository;
    @Mock private SoftwareComponentRepository softwareComponentRepository;

    @InjectMocks private EcosystemController controller;

    @Test
    void delete_should_rejectWithConflict_when_ecosystemInUse() {
        Ecosystem npm = Ecosystem.builder().id(5L).name("npm").build();
        when(repository.findById(5L)).thenReturn(Optional.of(npm));
        when(softwareComponentRepository.countByEcosystemIgnoreCaseAndDeletedAtIsNull("npm")).thenReturn(3L);

        assertThatThrownBy(() -> controller.delete(5L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("3");

        verify(repository, never()).deleteById(any());
    }

    @Test
    void delete_should_succeed_when_ecosystemNotInUse() {
        Ecosystem unused = Ecosystem.builder().id(6L).name("rubygems").build();
        when(repository.findById(6L)).thenReturn(Optional.of(unused));
        when(softwareComponentRepository.countByEcosystemIgnoreCaseAndDeletedAtIsNull("rubygems")).thenReturn(0L);

        controller.delete(6L);

        verify(repository).deleteById(6L);
    }

    @Test
    void delete_should_throwNotFound_when_ecosystemDoesNotExist() {
        when(repository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.delete(999L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(softwareComponentRepository, never()).countByEcosystemIgnoreCaseAndDeletedAtIsNull(any());
    }
}
