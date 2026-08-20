package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.model.SystemError;
import com.gef.gefsecureapp.repository.SystemErrorRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/system-errors")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "System Errors", description = "Log de errores de workflows n8n")
public class SystemErrorController {

    private final SystemErrorRepository systemErrorRepository;

    @GetMapping
    @Operation(summary = "Log de errores del sistema, paginado")
    public ResponseEntity<Page<SystemError>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(systemErrorRepository.findAllByOrderByErrorDateDesc(PageRequest.of(page, size)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar un error del log")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        systemErrorRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
