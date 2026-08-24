package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.UserAssetAssignmentDTO;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.model.Asset;
import com.gef.gefsecureapp.model.User;
import com.gef.gefsecureapp.model.UserAssetAssignment;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.UserAssetAssignmentRepository;
import com.gef.gefsecureapp.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAssetAssignmentServiceTest {

    @Mock private UserAssetAssignmentRepository assignmentRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private UserAssetAssignmentService service;

    // ── Centro de Administración (docs/bitacora/23-08-26): vista inversa, usuario→activos ──

    @Test
    @DisplayName("findByUser() devuelve los activos asignados con nombre incluido")
    void findByUser_should_returnAssignmentsWithAssetName() {
        User user = User.builder().id(1L).username("owner.demo").fullName("Asset Owner Demo").build();
        Asset asset = Asset.builder().id(5L).name("Servidor Demo").build();
        UserAssetAssignment assignment = UserAssetAssignment.builder()
                .id(100L).user(user).asset(asset).assignedAt(LocalDateTime.now()).build();

        when(userRepository.existsById(1L)).thenReturn(true);
        when(assignmentRepository.findByUser_Id(1L)).thenReturn(List.of(assignment));

        List<UserAssetAssignmentDTO.Response> result = service.findByUser(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAssetId()).isEqualTo(5L);
        assertThat(result.get(0).getAssetName()).isEqualTo("Servidor Demo");
        assertThat(result.get(0).getUsername()).isEqualTo("owner.demo");
    }

    @Test
    @DisplayName("findByUser() con usuario inexistente lanza ResourceNotFoundException")
    void findByUser_should_reject_whenUserMissing() {
        when(userRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.findByUser(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
