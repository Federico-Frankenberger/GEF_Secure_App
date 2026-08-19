package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.SoftwareComponentDTO;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.service.SoftwareComponentService;
import com.gef.gefsecureapp.service.N8nWebhookService;
import com.gef.gefsecureapp.service.ScanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/software-components")
@RequiredArgsConstructor
@Tag(name = "Software Components", description = "Gestión de componentes de software instalados")
public class SoftwareComponentController {

    private final SoftwareComponentService softwareComponentService;
    private final N8nWebhookService webhookService;
    private final ScanService scanService;

    @GetMapping
    @Operation(summary = "Listar / buscar componentes de software")
    public ResponseEntity<List<SoftwareComponentDTO.Response>> findAll(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(
                search != null && !search.isBlank()
                        ? softwareComponentService.search(search)
                        : softwareComponentService.findAll()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<SoftwareComponentDTO.Response> findById(@PathVariable Long id) {
        return ResponseEntity.ok(softwareComponentService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<SoftwareComponentDTO.Response> create(@Valid @RequestBody SoftwareComponentDTO.Request dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(softwareComponentService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<SoftwareComponentDTO.Response> update(
            @PathVariable Long id, @Valid @RequestBody SoftwareComponentDTO.Request dto) {
        return ResponseEntity.ok(softwareComponentService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        softwareComponentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/scan")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    @Operation(summary = "Disparar escaneo de un componente vía n8n")
    public ResponseEntity<SoftwareComponentDTO.Response> triggerScan(@PathVariable Long id) {
        SoftwareComponentDTO.Response updated = softwareComponentService.triggerScan(id);
        ScanReport scan = scanService.start("ACTIVO", updated.getName(), id, null, null);
        webhookService.triggerScanForAsset(updated.getName(), scan.getId());
        return ResponseEntity.ok(updated);
    }
}
