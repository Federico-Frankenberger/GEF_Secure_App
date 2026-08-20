package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.service.ReportPdfService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Informes", description = "Exportación de informes en PDF sobre escaneos y vulnerabilidades")
public class ReportController {

    private final ReportPdfService reportPdfService;

    @GetMapping("/scan/{scanId}")
    @Operation(summary = "Informe PDF de un escaneo puntual del historial")
    public ResponseEntity<byte[]> scanReport(@PathVariable Long scanId) {
        return pdf(reportPdfService.generateScanReport(scanId), "informe-escaneo-" + scanId + ".pdf");
    }

    @GetMapping("/comparison")
    @Operation(summary = "Informe PDF comparando dos escaneos del historial")
    public ResponseEntity<byte[]> comparisonReport(@RequestParam Long scanAId, @RequestParam Long scanBId) {
        return pdf(reportPdfService.generateComparisonReport(scanAId, scanBId),
                "informe-comparativo-" + scanAId + "-" + scanBId + ".pdf");
    }

    @GetMapping("/executive")
    @Operation(summary = "Resumen ejecutivo en PDF del estado actual de seguridad")
    public ResponseEntity<byte[]> executiveReport() {
        return pdf(reportPdfService.generateExecutiveReport(), "resumen-ejecutivo.pdf");
    }

    @GetMapping("/cve/{identifier}")
    @Operation(summary = "Ficha PDF de un CVE/GHSA puntual: descripción y activos afectados en toda la organización")
    public ResponseEntity<byte[]> cveReport(@PathVariable String identifier) {
        return pdf(reportPdfService.generateCveReport(identifier), "ficha-" + identifier + ".pdf");
    }

    private ResponseEntity<byte[]> pdf(byte[] content, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        return ResponseEntity.ok().headers(headers).contentType(MediaType.APPLICATION_PDF).body(content);
    }
}
