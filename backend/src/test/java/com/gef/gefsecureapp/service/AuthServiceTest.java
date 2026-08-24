package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.AuthDTO;
import com.gef.gefsecureapp.exception.InvalidCredentialsException;
import com.gef.gefsecureapp.model.User;
import com.gef.gefsecureapp.repository.UserRepository;
import com.gef.gefsecureapp.security.JwtService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;

    @InjectMocks private AuthService authService;

    @Test
    @DisplayName("login() con credenciales correctas devuelve un token y los datos del usuario")
    void login_should_returnToken_when_credentialsAreValid() {
        User user = User.builder()
                .id(1L).username("fede.frankenberger").fullName("Federico Frankenberger")
                .role("ADMIN").passwordHash("hashed").active(true).build();
        AuthDTO.LoginRequest request = AuthDTO.LoginRequest.builder()
                .username("fede.frankenberger").password("GefSecure2026!").build();

        when(userRepository.findByUsername("fede.frankenberger")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("GefSecure2026!", "hashed")).thenReturn(true);
        when(jwtService.generateToken(1L, "fede.frankenberger", "ADMIN")).thenReturn("fake.jwt.token");

        AuthDTO.LoginResponse response = authService.login(request);

        assertThat(response.getToken()).isEqualTo("fake.jwt.token");
        assertThat(response.getUsername()).isEqualTo("fede.frankenberger");
        assertThat(response.getRole()).isEqualTo("ADMIN");
        assertThat(response.getFullName()).isEqualTo("Federico Frankenberger");
    }

    @Test
    @DisplayName("login() con password incorrecta rechaza con InvalidCredentialsException")
    void login_should_throwInvalidCredentials_when_passwordWrong() {
        User user = User.builder().username("fede.frankenberger").passwordHash("hashed").role("ADMIN").build();
        AuthDTO.LoginRequest request = AuthDTO.LoginRequest.builder()
                .username("fede.frankenberger").password("password-incorrecta").build();

        when(userRepository.findByUsername("fede.frankenberger")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password-incorrecta", "hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    @DisplayName("login() con usuario inexistente rechaza con InvalidCredentialsException")
    void login_should_throwInvalidCredentials_when_userNotFound() {
        AuthDTO.LoginRequest request = AuthDTO.LoginRequest.builder()
                .username("no-existe").password("cualquiera").build();

        when(userRepository.findByUsername("no-existe")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    @DisplayName("el mensaje de error es identico entre usuario inexistente y password incorrecta (evita enumeracion de usuarios)")
    void login_should_giveSameMessage_forUnknownUserAndWrongPassword() {
        AuthDTO.LoginRequest unknownUserRequest = AuthDTO.LoginRequest.builder()
                .username("no-existe").password("x").build();
        when(userRepository.findByUsername("no-existe")).thenReturn(Optional.empty());
        String unknownUserMessage = catchMessage(() -> authService.login(unknownUserRequest));

        User user = User.builder().username("fede.frankenberger").passwordHash("hashed").role("ADMIN").build();
        AuthDTO.LoginRequest wrongPasswordRequest = AuthDTO.LoginRequest.builder()
                .username("fede.frankenberger").password("mal").build();
        when(userRepository.findByUsername("fede.frankenberger")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("mal", "hashed")).thenReturn(false);
        String wrongPasswordMessage = catchMessage(() -> authService.login(wrongPasswordRequest));

        assertThat(unknownUserMessage).isEqualTo(wrongPasswordMessage);
    }

    // ── Centro de Administración (docs/bitacora/23-08-26): usuario desactivado ────────

    @Test
    @DisplayName("login() con usuario desactivado rechaza con InvalidCredentialsException")
    void login_should_throwInvalidCredentials_when_userInactive() {
        User user = User.builder()
                .username("fede.frankenberger").passwordHash("hashed").role("ADMIN").active(false).build();
        AuthDTO.LoginRequest request = AuthDTO.LoginRequest.builder()
                .username("fede.frankenberger").password("GefSecure2026!").build();

        when(userRepository.findByUsername("fede.frankenberger")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("GefSecure2026!", "hashed")).thenReturn(true);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    @DisplayName("el mensaje de error de usuario desactivado es identico al de credenciales invalidas (evita enumeracion)")
    void login_should_giveSameMessage_forInactiveUser_asInvalidCredentials() {
        User activeUser = User.builder().username("x").passwordHash("hashed").role("ADMIN").active(true).build();
        AuthDTO.LoginRequest wrongPasswordRequest = AuthDTO.LoginRequest.builder().username("x").password("mal").build();
        when(userRepository.findByUsername("x")).thenReturn(Optional.of(activeUser));
        when(passwordEncoder.matches("mal", "hashed")).thenReturn(false);
        String wrongPasswordMessage = catchMessage(() -> authService.login(wrongPasswordRequest));

        User inactiveUser = User.builder().username("y").passwordHash("hashed").role("ADMIN").active(false).build();
        AuthDTO.LoginRequest inactiveRequest = AuthDTO.LoginRequest.builder().username("y").password("GefSecure2026!").build();
        when(userRepository.findByUsername("y")).thenReturn(Optional.of(inactiveUser));
        when(passwordEncoder.matches("GefSecure2026!", "hashed")).thenReturn(true);
        String inactiveMessage = catchMessage(() -> authService.login(inactiveRequest));

        assertThat(inactiveMessage).isEqualTo(wrongPasswordMessage);
    }

    private String catchMessage(Runnable action) {
        try {
            action.run();
            throw new AssertionError("se esperaba que login() lanzara una excepcion");
        } catch (InvalidCredentialsException ex) {
            return ex.getMessage();
        }
    }
}
