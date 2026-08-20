package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.GhsaAdvisoryDTO;
import com.gef.gefsecureapp.service.GhsaAdvisoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ghsa-advisories")
@RequiredArgsConstructor
@Tag(name = "GHSA Advisories", description = "Resumen/descripción real de una advisory de GitHub, cacheada localmente")
public class GhsaAdvisoryController {

    private final GhsaAdvisoryService advisoryService;

    @GetMapping("/{ghsaId}")
    @Operation(summary = "Trae (y cachea) la advisory de GitHub para un GHSA ID")
    public ResponseEntity<GhsaAdvisoryDTO> get(@PathVariable String ghsaId) {
        return ResponseEntity.ok(advisoryService.getByGhsaId(ghsaId));
    }
}
