package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.SoftwareCatalogDTO;
import com.gef.gefsecureapp.service.SoftwareCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/software-catalog")
@RequiredArgsConstructor
@Tag(name = "Software Catalog", description = "Catálogo de paquetes derivado de GitHub Advisory, usado para el autocomplete de activos")
public class SoftwareCatalogController {

    private final SoftwareCatalogService catalogService;

    @GetMapping
    @Operation(summary = "Buscar paquetes del catálogo por nombre")
    public ResponseEntity<List<SoftwareCatalogDTO.Response>> search(
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(catalogService.search(search));
    }
}
