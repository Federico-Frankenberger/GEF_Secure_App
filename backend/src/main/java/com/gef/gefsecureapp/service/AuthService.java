package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.AuthDTO;
import com.gef.gefsecureapp.exception.InvalidCredentialsException;
import com.gef.gefsecureapp.model.User;
import com.gef.gefsecureapp.repository.UserRepository;
import com.gef.gefsecureapp.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String INVALID_CREDENTIALS_MESSAGE = "Usuario o contraseña inválidos";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public AuthDTO.LoginResponse login(AuthDTO.LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE));

        // Mismo mensaje que "usuario inexistente" a proposito: evita que el error
        // delate si el problema fue el username o la contraseña.
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE);
        }

        // Centro de Administración (docs/bitacora/23-08-26): mismo mensaje genérico que
        // arriba, por la misma razón -- si fuera un mensaje distinto ("cuenta
        // desactivada"), alguien probando credenciales robadas se enteraría de que el
        // username SÍ existe (solo que está desactivado), rompiendo el mismo criterio
        // anti-enumeración de más arriba.
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new InvalidCredentialsException(INVALID_CREDENTIALS_MESSAGE);
        }

        String token = jwtService.generateToken(user.getId(), user.getUsername(), user.getRole());
        return AuthDTO.LoginResponse.builder()
                .token(token)
                .username(user.getUsername())
                .fullName(user.getFullName())
                .role(user.getRole())
                .build();
    }
}
