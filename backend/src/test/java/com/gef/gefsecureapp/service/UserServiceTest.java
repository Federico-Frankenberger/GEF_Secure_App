package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.UserDTO;
import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.UserMapper;
import com.gef.gefsecureapp.model.User;
import com.gef.gefsecureapp.repository.UserRepository;
import com.gef.gefsecureapp.security.TestAuth;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserMapper userMapper;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private UserService service;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    // ── Centro de Administración (docs/bitacora/23-08-26) ─────────────────────────────

    @Test
    @DisplayName("create() siempre nace activo, sin importar lo que venga en el request")
    void create_should_alwaysSetActiveTrue() {
        UserDTO.Request dto = UserDTO.Request.builder()
                .username("nuevo").role("AUDITOR").password("pass1234").build();
        User mapped = User.builder().username("nuevo").role("AUDITOR").build();
        when(userRepository.existsByUsername("nuevo")).thenReturn(false);
        when(userMapper.toEntity(dto)).thenReturn(mapped);
        when(passwordEncoder.encode("pass1234")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userMapper.toResponse(any(User.class))).thenReturn(UserDTO.Response.builder().build());

        service.create(dto);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getActive()).isTrue();
    }

    @Test
    @DisplayName("setActive() rechaza que un ADMIN se desactive a sí mismo")
    void setActive_should_rejectSelfDeactivation() {
        TestAuth.loginAs(10L, "fede.frankenberger", "ADMIN");

        assertThatThrownBy(() -> service.setActive(10L, false))
                .isInstanceOf(ConflictException.class);

        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("setActive() permite que un ADMIN desactive a OTRO usuario")
    void setActive_should_allowDeactivatingAnotherUser() {
        TestAuth.loginAs(10L, "fede.frankenberger", "ADMIN");
        User target = User.builder().id(20L).username("owner.demo").active(true).build();
        when(userRepository.findById(20L)).thenReturn(Optional.of(target));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(userMapper.toResponse(any(User.class))).thenReturn(UserDTO.Response.builder().active(false).build());

        service.setActive(20L, false);

        assertThat(target.getActive()).isFalse();
        verify(userRepository).save(target);
    }

    @Test
    @DisplayName("setActive() con usuario inexistente lanza ResourceNotFoundException")
    void setActive_should_reject_whenUserMissing() {
        TestAuth.loginAs(10L, "fede.frankenberger", "ADMIN");
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setActive(99L, false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("delete() con violación de FK (vulnerabilidades asignadas) da un mensaje claro, no el genérico")
    void delete_should_giveCleanMessage_whenUserHasAssignedVulnerabilities() {
        // Hibernate difiere el DELETE real hasta el flush -- la excepción real aparece
        // ahí, no en deleteById() en sí (ver comentario en UserService.delete()).
        when(userRepository.existsById(30L)).thenReturn(true);
        doThrow(new DataIntegrityViolationException("fk violation"))
                .when(userRepository).flush();

        assertThatThrownBy(() -> service.delete(30L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("vulnerabilidades asignadas");

        verify(userRepository).deleteById(30L);
    }

    @Test
    @DisplayName("delete() sin dependencias funciona normalmente")
    void delete_should_work_whenNoDependencies() {
        when(userRepository.existsById(31L)).thenReturn(true);

        service.delete(31L);

        verify(userRepository).deleteById(31L);
    }

    @Test
    @DisplayName("delete() de un usuario inexistente lanza ResourceNotFoundException")
    void delete_should_reject_whenUserMissing() {
        when(userRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(userRepository, never()).deleteById(any());
    }
}
