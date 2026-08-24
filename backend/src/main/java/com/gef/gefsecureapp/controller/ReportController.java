package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.CvePreviewDTO;
import com.gef.gefsecureapp.service.ReportPdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Validated
@Tag(name = "Informes", description = "Exportación de informes en PDF sobre escaneos y vulnerabilidades")
public class ReportController {

    private final ReportPdfService reportPdfService;

    // Auditoría de roles (docs/bitacora/23-08-26): esta clase no tenía ningún
    // @PreAuthorize -- cualquier rol autenticado podía generar estos 4 PDFs por API
    // directa, aunque el frontend (Informes.tsx) ya ocultaba la sección para
    // ASSET_OWNER/AUDITOR creyendo (comentario ahora corregido) que el backend
    // replicaba el mismo criterio. AUDITOR se agrega al set permitido a propósito
    // (rol de auditoría, mayormente lectura -- ADR-0006), ASSET_OWNER queda afuera.

    @GetMapping("/scan/{scanId}")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST','AUDITOR')")
    @Operation(summary = "Informe PDF de un escaneo puntual del historial")
    public ResponseEntity<byte[]> scanReport(@PathVariable Long scanId) {
        return pdf(reportPdfService.generateScanReport(scanId), "informe-escaneo-" + scanId + ".pdf");
    }

    @GetMapping("/comparison")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST','AUDITOR')")
    @Operation(summary = "Informe PDF comparando dos escaneos del historial")
    public ResponseEntity<byte[]> comparisonReport(@RequestParam Long scanAId, @RequestParam Long scanBId) {
        return pdf(reportPdfService.generateComparisonReport(scanAId, scanBId),
                "informe-comparativo-" + scanAId + "-" + scanBId + ".pdf");
    }

    @GetMapping("/executive")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST','AUDITOR')")
    @Operation(summary = "Resumen ejecutivo en PDF del estado actual de seguridad")
    public ResponseEntity<byte[]> executiveReport() {
        return pdf(reportPdfService.generateExecutiveReport(), "resumen-ejecutivo.pdf");
    }

    @GetMapping("/cve/{identifier}")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST','AUDITOR')")
    @Operation(summary = "Ficha PDF de un CVE/GHSA puntual: descripción y activos afectados en toda la organización")
    public ResponseEntity<byte[]> cveReport(@PathVariable String identifier) {
        return pdf(reportPdfService.generateCveReport(identifier), "ficha-" + identifier + ".pdf");
    }

    // Centro de Informes (docs/bitacora/23-08-26): preview liviano antes de exportar --
    // sin esto, la pestaña Ficha de CVE/GHSA solo se entera de que no hay coincidencias
    // cuando ya intentó descargar el PDF completo (404 a ciegas).
    @GetMapping("/cve/{identifier}/preview")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST','AUDITOR')")
    @Operation(summary = "Preview de la ficha de CVE/GHSA sin generar el PDF completo")
    public ResponseEntity<CvePreviewDTO> cvePreview(@PathVariable String identifier) {
        return ResponseEntity.ok(reportPdfService.previewCve(identifier));
    }

    // RPT-DAYS-VALIDATION (docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md): antes
    // `days` no se validaba -- un valor no numerico (`abc`) daba 500 generico
    // (MethodArgumentTypeMismatchException sin handler dedicado) y uno negativo (`-5`) se
    // aceptaba sin mas, generando un PDF con una ventana de tiempo invertida/sin sentido.
    @GetMapping("/vulnerabilities")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST','AUDITOR')")
    @Operation(summary = "Informe PDF de la pestaña Vulnerabilidades del Centro de Informes (tendencia/SLA/fuentes)")
    public ResponseEntity<byte[]> vulnerabilitiesReport(@RequestParam(defaultValue = "30") @Min(1) int days) {
        return pdf(reportPdfService.generateVulnerabilityAnalysisReport(days), "informe-vulnerabilidades-" + days + "d.pdf");
    }

    @GetMapping("/remediation")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST','AUDITOR')")
    @Operation(summary = "Informe PDF de la pestaña Remediación del Centro de Informes (MTTR/SLA/VEX/evidencia)")
    public ResponseEntity<byte[]> remediationReport(@RequestParam(defaultValue = "30") @Min(1) int days) {
        return pdf(reportPdfService.generateRemediationReport(days), "informe-remediacion-" + days + "d.pdf");
    }

    private ResponseEntity<byte[]> pdf(byte[] content, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        return ResponseEntity.ok().headers(headers).contentType(MediaType.APPLICATION_PDF).body(content);
    }
}
