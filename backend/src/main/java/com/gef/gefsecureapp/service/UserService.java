package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.UserDTO;
import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.UserMapper;
import com.gef.gefsecureapp.model.User;
import com.gef.gefsecureapp.repository.UserRepository;
import com.gef.gefsecureapp.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserDTO.Response> findAll() {
        return userRepository.findAll().stream().map(userMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public UserDTO.Response findById(Long id) {
        return userMapper.toResponse(getOrThrow(id));
    }

    @Transactional
    public UserDTO.Response create(UserDTO.Request dto) {
        if (userRepository.existsByUsername(dto.getUsername()))
            throw new ConflictException("Ya existe un usuario con username=" + dto.getUsername());
        User user = userMapper.toEntity(dto);
        user.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        user.setCreatedAt(LocalDateTime.now());
        user.setActive(true);
        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public UserDTO.Response update(Long id, UserDTO.Request dto) {
        User existing = getOrThrow(id);
        userMapper.updateEntity(dto, existing);
        if (dto.getPassword() != null && !dto.getPassword().isBlank())
            existing.setPasswordHash(passwordEncoder.encode(dto.getPassword()));
        return userMapper.toResponse(userRepository.save(existing));
    }

    // Centro de Administración (docs/bitacora/23-08-26): acción explícita separada del
    // PUT genérico -- desactivar es la vía segura para "sacar" a alguien sin perder su
    // historial (asignaciones, vulnerabilidades asignadas, auditoría como actor).
    @Transactional
    public UserDTO.Response setActive(Long id, boolean active) {
        if (!active && id.equals(CurrentUser.get().id()))
            throw new ConflictException("No podés desactivar tu propia cuenta.");
        User user = getOrThrow(id);
        user.setActive(active);
        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public void delete(Long id) {
        if (!userRepository.existsById(id))
            throw new ResourceNotFoundException("User", id);
        try {
            userRepository.deleteById(id);
            // Hibernate difiere el DELETE real hasta el flush (por defecto, al terminar
            // la transacción) -- sin este flush explícito, la violación de FK recién
            // aparece DESPUÉS de que este método ya retornó, y el catch de acá nunca la
            // ve (cae al handler genérico de GlobalExceptionHandler en su lugar).
            userRepository.flush();
        } catch (DataIntegrityViolationException e) {
            // asset_vulnerabilities.assigned_to_user_id no tiene ON DELETE (a diferencia
            // de user_asset_assignments, que sí tiene CASCADE) -- a propósito, para no
            // borrar en silencio a quién estaba asignado un hallazgo. Mensaje específico
            // en vez del genérico de GlobalExceptionHandler, que no orienta qué hacer.
            log.warn("No se pudo eliminar el usuario id={}: tiene registros dependientes", id);
            throw new ConflictException(
                    "No se puede eliminar: el usuario tiene vulnerabilidades asignadas. "
                            + "Reasigná esos casos o desactivalo en su lugar.");
        }
    }

    private User getOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }
}
