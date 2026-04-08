package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.UserDTO;
import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.UserMapper;
import com.gef.gefsecureapp.model.User;
import com.gef.gefsecureapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

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
        user.setCreatedAt(LocalDateTime.now());
        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public UserDTO.Response update(Long id, UserDTO.Request dto) {
        User existing = getOrThrow(id);
        userMapper.updateEntity(dto, existing);
        return userMapper.toResponse(userRepository.save(existing));
    }

    @Transactional
    public void delete(Long id) {
        if (!userRepository.existsById(id))
            throw new ResourceNotFoundException("User", id);
        userRepository.deleteById(id);
    }

    private User getOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }
}
