package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.exception.ConflictException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.model.Ecosystem;
import com.gef.gefsecureapp.repository.EcosystemRepository;
import com.gef.gefsecureapp.repository.SoftwareComponentRepository;
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
@RequestMapping("/api/ecosystems")
@RequiredArgsConstructor
@Tag(name = "Ecosystems", description = "Catálogo administrable de ecosistemas de software")
public class EcosystemController {

    private final EcosystemRepository repository;
    private final SoftwareComponentRepository softwareComponentRepository;

    @GetMapping
    @Operation(summary = "Listar ecosistemas")
    public ResponseEntity<List<Ecosystem>> findAll() {
        return ResponseEntity.ok(repository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Ecosystem> create(@Valid @RequestBody Ecosystem dto) {
        dto.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Ecosystem> update(@PathVariable Long id, @Valid @RequestBody Ecosystem dto) {
        Ecosystem existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ecosystem", id));
        existing.setName(dto.getName());
        return ResponseEntity.ok(repository.save(existing));
    }

    // CFG-CATALOG-DELETE (docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md):
    // SoftwareComponent.ecosystem es texto libre (sin FK real) -- antes el borrado
    // siempre tenia exito sin avisar, y los componentes que usaban este ecosistema
    // empezaban a mostrar el badge "no reconocido" (Assets.tsx) sin que el ADMIN se
    // enterara de a cuantos afectaba.
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Ecosystem ecosystem = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ecosystem", id));
        long inUse = softwareComponentRepository.countByEcosystemIgnoreCaseAndDeletedAtIsNull(ecosystem.getName());
        if (inUse > 0) {
            throw new ConflictException(
                    "No se puede eliminar: hay " + inUse + " componente(s) de software usando este ecosistema.");
        }
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
