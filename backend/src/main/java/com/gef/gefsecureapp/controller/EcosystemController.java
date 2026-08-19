package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.model.Ecosystem;
import com.gef.gefsecureapp.repository.EcosystemRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ecosystems")
@RequiredArgsConstructor
@Tag(name = "Ecosystems", description = "Catálogo administrable de ecosistemas de software")
public class EcosystemController {

    private final EcosystemRepository repository;

    @GetMapping
    @Operation(summary = "Listar ecosistemas")
    public ResponseEntity<List<Ecosystem>> findAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Ecosystem> create(@RequestBody Ecosystem dto) {
        dto.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Ecosystem> update(@PathVariable Long id, @RequestBody Ecosystem dto) {
        Ecosystem existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ecosystem", id));
        existing.setName(dto.getName());
        return ResponseEntity.ok(repository.save(existing));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id))
            throw new ResourceNotFoundException("Ecosystem", id);
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
