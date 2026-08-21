package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.model.AssetType;
import com.gef.gefsecureapp.repository.AssetTypeRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/asset-types")
@RequiredArgsConstructor
@Tag(name = "Asset Types", description = "Catálogo administrable de tipos de host")
public class AssetTypeController {

    private final AssetTypeRepository repository;

    @GetMapping
    @Operation(summary = "Listar tipos de host")
    public ResponseEntity<List<AssetType>> findAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AssetType> create(@Valid @RequestBody AssetType dto) {
        dto.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AssetType> update(@PathVariable Long id, @Valid @RequestBody AssetType dto) {
        AssetType existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetType", id));
        existing.setName(dto.getName());
        return ResponseEntity.ok(repository.save(existing));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id))
            throw new ResourceNotFoundException("AssetType", id);
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
