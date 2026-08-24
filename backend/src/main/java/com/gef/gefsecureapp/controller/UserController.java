package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.UserAssetAssignmentDTO;
import com.gef.gefsecureapp.dto.UserDTO;
import com.gef.gefsecureapp.service.UserAssetAssignmentService;
import com.gef.gefsecureapp.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Gestión de usuarios y auditores")
public class UserController {

    private final UserService userService;
    private final UserAssetAssignmentService assignmentService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<List<UserDTO.Response>> findAll() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<UserDTO.Response> findById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO.Response> create(
            @Validated(UserDTO.OnCreate.class) @RequestBody UserDTO.Request dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO.Response> update(
            @PathVariable Long id, @Valid @RequestBody UserDTO.Request dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Centro de Administración (docs/bitacora/23-08-26): acción explícita, no un campo
    // más del PUT genérico -- desactivar/reactivar es una decisión administrativa
    // puntual, no una edición de datos del usuario.
    @PatchMapping("/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO.Response> setActive(
            @PathVariable Long id, @Valid @RequestBody UserDTO.ActiveRequest dto) {
        return ResponseEntity.ok(userService.setActive(id, dto.getActive()));
    }

    @GetMapping("/{id}/assignments")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    @Operation(summary = "Activos asignados a un usuario (vista inversa de /api/assets/{id}/assignments)")
    public ResponseEntity<List<UserAssetAssignmentDTO.Response>> assignments(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.findByUser(id));
    }
}
