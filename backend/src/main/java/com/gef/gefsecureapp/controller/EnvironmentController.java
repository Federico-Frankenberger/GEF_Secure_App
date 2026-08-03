package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.model.Environment;
import com.gef.gefsecureapp.repository.EnvironmentRepository;
import com.gef.gefsecureapp.service.N8nWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/environments")
@RequiredArgsConstructor
@Tag(name = "Environments", description = "Gestión de entornos de infraestructura")
public class EnvironmentController {

    private final EnvironmentRepository environmentRepository;
    private final N8nWebhookService webhookService;

    @GetMapping
    @Operation(summary = "Listar todos los entornos")
    public ResponseEntity<List<Environment>> findAll() {
        return ResponseEntity.ok(environmentRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Environment> findById(@PathVariable Long id) {
        return ResponseEntity.ok(
                environmentRepository.findById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("Environment", id))
        );
    }

    @PostMapping
    public ResponseEntity<Environment> create(@RequestBody Environment env) {
        env.setId(null);
        env.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(environmentRepository.save(env));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Environment> update(@PathVariable Long id, @RequestBody Environment dto) {
        Environment existing = environmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Environment", id));
        existing.setName(dto.getName());
        existing.setBusinessCriticality(dto.getBusinessCriticality());
        existing.setDescription(dto.getDescription());
        return ResponseEntity.ok(environmentRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!environmentRepository.existsById(id))
            throw new ResourceNotFoundException("Environment", id);
        environmentRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/scan")
    @Operation(summary = "Disparar escaneo de todos los activos de un entorno vía n8n")
    public ResponseEntity<Void> triggerScan(@PathVariable Long id) {
        Environment env = environmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Environment", id));
        webhookService.triggerScanForEnvironment(env.getName());
        return ResponseEntity.accepted().build();
    }
}
