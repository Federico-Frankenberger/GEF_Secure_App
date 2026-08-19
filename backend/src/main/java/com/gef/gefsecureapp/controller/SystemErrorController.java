package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.model.SystemError;
import com.gef.gefsecureapp.repository.SystemErrorRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/system-errors")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "System Errors", description = "Log de errores de workflows n8n")
public class SystemErrorController {

    private final SystemErrorRepository systemErrorRepository;

    @GetMapping
    @Operation(summary = "Últimos 50 errores del sistema")
    public ResponseEntity<List<SystemError>> findAll() {
        return ResponseEntity.ok(systemErrorRepository.findTop50ByOrderByErrorDateDesc());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar un error del log")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        systemErrorRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
