package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.AssetDTO;
import com.gef.gefsecureapp.service.AssetService;
import com.gef.gefsecureapp.service.N8nWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
@Tag(name = "Assets", description = "Gestión de activos de software")
public class AssetController {

    private final AssetService assetService;
    private final N8nWebhookService webhookService;

    @GetMapping
    @Operation(summary = "Listar / buscar activos")
    public ResponseEntity<List<AssetDTO.Response>> findAll(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(
                search != null && !search.isBlank()
                        ? assetService.search(search)
                        : assetService.findAll()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssetDTO.Response> findById(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.findById(id));
    }

    @PostMapping
    public ResponseEntity<AssetDTO.Response> create(@Valid @RequestBody AssetDTO.Request dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assetService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AssetDTO.Response> update(
            @PathVariable Long id, @Valid @RequestBody AssetDTO.Request dto) {
        return ResponseEntity.ok(assetService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        assetService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/scan")
    @Operation(summary = "Disparar escaneo de un activo vía n8n")
    public ResponseEntity<AssetDTO.Response> triggerScan(@PathVariable Long id) {
        AssetDTO.Response updated = assetService.triggerScan(id);
        webhookService.triggerScanForAsset(updated.getName());
        return ResponseEntity.ok(updated);
    }
}
