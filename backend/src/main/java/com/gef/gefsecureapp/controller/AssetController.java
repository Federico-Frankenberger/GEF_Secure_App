package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.AssetDTO;
import com.gef.gefsecureapp.dto.UserAssetAssignmentDTO;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.service.AssetService;
import com.gef.gefsecureapp.service.N8nWebhookService;
import com.gef.gefsecureapp.service.ScanService;
import com.gef.gefsecureapp.service.UserAssetAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
@Tag(name = "Assets", description = "Gestión de activos reales: servidores, aplicaciones, VMs, contenedores")
public class AssetController {

    private final AssetService assetService;
    private final UserAssetAssignmentService assignmentService;
    private final N8nWebhookService webhookService;
    private final ScanService scanService;

    @GetMapping
    @Operation(summary = "Listar / buscar activos")
    public ResponseEntity<List<AssetDTO.Response>> findAll(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(
                search != null && !search.isBlank() ? assetService.search(search) : assetService.findAll());
    }

    @GetMapping("/deleted")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    @Operation(summary = "Listar activos eliminados logicamente, para restaurar")
    public ResponseEntity<List<AssetDTO.DeletedResponse>> findDeleted() {
        return ResponseEntity.ok(assetService.findDeleted());
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    @Operation(summary = "Restaurar un activo eliminado logicamente y el software borrado en el mismo cascade")
    public ResponseEntity<Void> restore(@PathVariable Long id) {
        assetService.restore(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssetDTO.Response> findById(@PathVariable Long id) {
        return ResponseEntity.ok(assetService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<AssetDTO.Response> create(@Valid @RequestBody AssetDTO.Request dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assetService.create(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<AssetDTO.Response> update(
            @PathVariable Long id, @Valid @RequestBody AssetDTO.Request dto) {
        return ResponseEntity.ok(assetService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        assetService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/scan")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    @Operation(summary = "Disparar escaneo de todos los componentes de un activo (host) vía n8n")
    public ResponseEntity<Void> triggerScan(@PathVariable Long id) {
        AssetDTO.Response asset = assetService.findById(id);
        ScanReport scan = scanService.start("HOST", asset.getName(), null, null, id);
        webhookService.triggerScanForAssetHost(asset.getName(), asset.getEnvironmentName(), scan.getId());
        return ResponseEntity.accepted().build();
    }

    // ── Flujo inyector (§11.16): activo de prueba con software real y vulnerable ──

    @PostMapping("/inject-test-data")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Crear un activo de prueba con 5 componentes de software real y vulnerable, para probar escaneos")
    public ResponseEntity<Void> injectTestData() {
        webhookService.triggerAssetInjection();
        return ResponseEntity.accepted().build();
    }

    // ── Asignaciones (scope de ASSET_OWNER) — solo ADMIN administra quién ve qué ──

    @GetMapping("/{id}/assignments")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar usuarios asignados a un activo")
    public ResponseEntity<List<UserAssetAssignmentDTO.Response>> findAssignments(@PathVariable Long id) {
        return ResponseEntity.ok(assignmentService.findByAsset(id));
    }

    @PostMapping("/{id}/assignments")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Asignar un usuario (ASSET_OWNER) a un activo")
    public ResponseEntity<UserAssetAssignmentDTO.Response> assign(
            @PathVariable Long id, @Valid @RequestBody UserAssetAssignmentDTO.Request dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.assign(id, dto));
    }

    @DeleteMapping("/{id}/assignments/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Quitar la asignación de un usuario a un activo")
    public ResponseEntity<Void> unassign(@PathVariable Long id, @PathVariable Long userId) {
        assignmentService.unassign(id, userId);
        return ResponseEntity.noContent().build();
    }
}
