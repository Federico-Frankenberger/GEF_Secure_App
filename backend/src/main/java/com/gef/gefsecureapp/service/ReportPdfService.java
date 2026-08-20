package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.DashboardStatsDTO;
import com.gef.gefsecureapp.dto.GhsaAdvisoryDTO;
import com.gef.gefsecureapp.dto.ScanComparisonDTO;
import com.gef.gefsecureapp.dto.VulnerabilityAuditDTO;
import com.gef.gefsecureapp.exception.GhsaAdvisoryUnavailableException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.VulnerabilityAuditMapper;
import com.gef.gefsecureapp.model.AssetVulnerability;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.repository.AssetVulnerabilityRepository;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;

/** Seccion "Informes": arma los 4 tipos de reporte en PDF (escaneo puntual,
 *  comparativo, resumen ejecutivo, ficha de CVE) con OpenPDF, reutilizando los
 *  mismos datos que ya expone el resto de la API -- no hay logica de negocio
 *  nueva aca, solo presentacion. */
@Service
@RequiredArgsConstructor
public class ReportPdfService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Color HEADER_BG = new Color(0x33, 0x41, 0x55);

    private static final Font TITLE_FONT        = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(0x1e, 0x40, 0xaf));
    private static final Font SUBTITLE_FONT     = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY);
    private static final Font SECTION_FONT      = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.DARK_GRAY);
    private static final Font LABEL_FONT        = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);
    private static final Font BODY_FONT         = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
    private static final Font TABLE_HEADER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
    private static final Font TABLE_CELL_FONT   = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);

    private final ScanReportRepository scanReportRepository;
    private final VulnerabilityAuditService vulnerabilityAuditService;
    private final DashboardService dashboardService;
    private final AssetVulnerabilityRepository assetVulnerabilityRepository;
    private final GhsaAdvisoryService ghsaAdvisoryService;
    private final VulnerabilityAuditMapper vulnerabilityAuditMapper;

    @Transactional(readOnly = true)
    public byte[] generateScanReport(Long scanId) {
        ScanReport scan = scanReportRepository.findById(scanId)
                .orElseThrow(() -> new ResourceNotFoundException("ScanReport", scanId));
        List<VulnerabilityAuditDTO.Response> findings = vulnerabilityAuditService.findByScanReport(scanId);

        return build("Error generando el PDF del escaneo", document -> {
            addTitleBlock(document, "Informe de Escaneo",
                    scan.getPublicCode() + " · " + scan.getTargetType() + " " + scan.getTargetName()
                            + " · " + fmt(scan.getExecutedAt()));

            addSectionHeading(document, "Resumen por severidad");
            document.add(severitySummaryTable(nz(scan.getCriticals()), nz(scan.getHighs()), nz(scan.getMediums()), nz(scan.getLows())));

            addSectionHeading(document, "Hallazgos detallados (" + findings.size() + ")");
            addFindingsOrEmpty(document, findings, "No se registraron hallazgos en este escaneo.");
        });
    }

    @Transactional(readOnly = true)
    public byte[] generateComparisonReport(Long scanAId, Long scanBId) {
        ScanReport scanA = scanReportRepository.findById(scanAId)
                .orElseThrow(() -> new ResourceNotFoundException("ScanReport", scanAId));
        ScanReport scanB = scanReportRepository.findById(scanBId)
                .orElseThrow(() -> new ResourceNotFoundException("ScanReport", scanBId));
        ScanComparisonDTO comparison = vulnerabilityAuditService.compareScans(scanAId, scanBId);

        return build("Error generando el PDF comparativo", document -> {
            addTitleBlock(document, "Informe Comparativo de Escaneos",
                    scanA.getPublicCode() + " (" + fmt(scanA.getExecutedAt()) + ")  →  "
                            + scanB.getPublicCode() + " (" + fmt(scanB.getExecutedAt()) + ")");

            addSectionHeading(document, "Vulnerabilidades nuevas (" + comparison.getNewInB().size() + ")");
            addFindingsOrEmpty(document, comparison.getNewInB(), "Sin elementos.");

            addSectionHeading(document, "Vulnerabilidades resueltas (" + comparison.getResolvedSinceA().size() + ")");
            addFindingsOrEmpty(document, comparison.getResolvedSinceA(), "Sin elementos.");

            addSectionHeading(document, "Vulnerabilidades persistentes (" + comparison.getPersisting().size() + ")");
            addFindingsOrEmpty(document, comparison.getPersisting(), "Sin elementos.");

            addSectionHeading(document, "Cambios de severidad (" + comparison.getSeverityChanges().size() + ")");
            if (comparison.getSeverityChanges().isEmpty()) {
                document.add(new Paragraph("Ningún CVE persistente cambió de severidad.", BODY_FONT));
            } else {
                document.add(severityChangesTable(comparison.getSeverityChanges()));
            }
        });
    }

    @Transactional(readOnly = true)
    public byte[] generateExecutiveReport() {
        DashboardStatsDTO stats = dashboardService.getStats();
        List<AssetVulnerability> topCritical = assetVulnerabilityRepository
                .findTop10ByPriorityAndDetectionStatusOrderByLastDetectedAtDesc("CRITICAL", "OPEN");

        return build("Error generando el resumen ejecutivo", document -> {
            addTitleBlock(document, "Resumen Ejecutivo de Seguridad", "Estado actual de la postura de vulnerabilidades");

            addSectionHeading(document, "Indicadores clave");
            document.add(kpiTable(stats));

            addSectionHeading(document, "Top vulnerabilidades críticas abiertas (" + topCritical.size() + ")");
            addFindingsOrEmpty(document,
                    topCritical.stream().map(vulnerabilityAuditMapper::toResponse).toList(),
                    "No hay vulnerabilidades críticas abiertas actualmente.");
        });
    }

    @Transactional(readOnly = true)
    public byte[] generateCveReport(String identifier) {
        List<AssetVulnerability> matches = assetVulnerabilityRepository
                .findByCveIdIgnoreCaseOrGhsaIdIgnoreCase(identifier, identifier);
        if (matches.isEmpty()) {
            throw new ResourceNotFoundException("No se encontraron activos afectados por " + identifier);
        }
        List<VulnerabilityAuditDTO.Response> affected = matches.stream().map(vulnerabilityAuditMapper::toResponse).toList();
        VulnerabilityAuditDTO.Response first = affected.get(0);

        String ghsaId = matches.stream().map(AssetVulnerability::getGhsaId).filter(Objects::nonNull).findFirst().orElse(null);
        GhsaAdvisoryDTO advisory = null;
        if (ghsaId != null) {
            try {
                advisory = ghsaAdvisoryService.getByGhsaId(ghsaId);
            } catch (GhsaAdvisoryUnavailableException ignored) {
                // La ficha se arma igual, sin descripcion externa -- no bloquea el informe.
            }
        }
        GhsaAdvisoryDTO advisoryFinal = advisory;

        return build("Error generando la ficha de CVE", document -> {
            addTitleBlock(document, "Ficha de Vulnerabilidad",
                    identifier.toUpperCase()
                            + (first.getCvss() != null ? " · CVSS " + first.getCvss() : "")
                            + (first.getPriority() != null ? " · " + first.getPriority() : ""));

            addSectionHeading(document, "Descripción");
            if (advisoryFinal != null && (advisoryFinal.getSummary() != null || advisoryFinal.getDescription() != null)) {
                if (advisoryFinal.getSummary() != null) document.add(new Paragraph(advisoryFinal.getSummary(), BODY_FONT));
                if (advisoryFinal.getDescription() != null) {
                    document.add(Chunk.NEWLINE);
                    document.add(new Paragraph(advisoryFinal.getDescription(), BODY_FONT));
                }
            } else {
                document.add(new Paragraph("No hay una descripción pública disponible para este identificador.", BODY_FONT));
            }

            addSectionHeading(document, "Activos afectados en la organización (" + affected.size() + ")");
            document.add(findingsTable(affected));
        });
    }

    // ── Construcción del documento ────────────────────────────────────────────

    private interface DocumentBody {
        void build(Document document) throws DocumentException;
    }

    private byte[] build(String errorMessage, DocumentBody body) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 54, 36);
        try {
            PdfWriter.getInstance(document, out);
            document.open();
            body.build(document);
            document.close();
        } catch (DocumentException e) {
            throw new IllegalStateException(errorMessage + ": " + e.getMessage(), e);
        }
        return out.toByteArray();
    }

    private void addFindingsOrEmpty(Document document, List<VulnerabilityAuditDTO.Response> findings, String emptyMessage) throws DocumentException {
        if (findings.isEmpty()) {
            document.add(new Paragraph(emptyMessage, BODY_FONT));
        } else {
            document.add(findingsTable(findings));
        }
    }

    private void addTitleBlock(Document document, String title, String subtitle) throws DocumentException {
        Paragraph titleP = new Paragraph(title, TITLE_FONT);
        titleP.setSpacingAfter(4);
        document.add(titleP);

        Paragraph subtitleP = new Paragraph(subtitle, SUBTITLE_FONT);
        subtitleP.setSpacingAfter(2);
        document.add(subtitleP);

        document.add(new Paragraph("Generado el " + LocalDateTime.now().format(FMT) + " · GEF Secure", SUBTITLE_FONT));
        document.add(Chunk.NEWLINE);
    }

    private void addSectionHeading(Document document, String text) throws DocumentException {
        Paragraph p = new Paragraph(text, SECTION_FONT);
        p.setSpacingBefore(14);
        p.setSpacingAfter(6);
        document.add(p);
    }

    private PdfPTable severitySummaryTable(int criticals, int highs, int mediums, int lows) {
        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);
        table.addCell(severityCell("CRÍTICAS", criticals, new Color(0xbd, 0x1e, 0x1e)));
        table.addCell(severityCell("ALTAS", highs, new Color(0xf9, 0x5c, 0x5c)));
        table.addCell(severityCell("MEDIAS", mediums, new Color(0xb8, 0x8a, 0x00)));
        table.addCell(severityCell("BAJAS", lows, new Color(0x44, 0xa0, 0x24)));
        return table;
    }

    private PdfPCell severityCell(String label, int value, Color color) {
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.WHITE);
        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.WHITE);
        Paragraph p = new Paragraph();
        p.add(new Chunk(String.valueOf(value) + "\n", valueFont));
        p.add(new Chunk(label, labelFont));
        p.setAlignment(Element.ALIGN_CENTER);
        PdfPCell cell = new PdfPCell(p);
        cell.setBackgroundColor(color);
        cell.setPadding(10);
        cell.setBorderColor(Color.WHITE);
        return cell;
    }

    private PdfPTable findingsTable(List<VulnerabilityAuditDTO.Response> findings) {
        PdfPTable table = new PdfPTable(new float[]{16, 8, 10, 22, 14, 16, 14});
        table.setWidthPercentage(100);
        table.setHeaderRows(1);
        for (String h : new String[]{"CVE/GHSA", "CVSS", "Prioridad", "Paquete", "Versión", "Activo", "Estado"}) {
            table.addCell(headerCell(h));
        }
        for (VulnerabilityAuditDTO.Response f : findings) {
            table.addCell(cellText(f.getCveId() != null ? f.getCveId() : f.getGhsaId()));
            table.addCell(cellText(f.getCvss()));
            table.addCell(priorityCell(f.getPriority()));
            table.addCell(cellText(f.getSoftware() != null ? f.getSoftware() : f.getComponentName()));
            table.addCell(cellText(f.getInstalledVersion()));
            table.addCell(cellText(f.getAsset()));
            table.addCell(cellText(f.getStatus()));
        }
        return table;
    }

    private PdfPTable severityChangesTable(List<ScanComparisonDTO.SeverityChange> changes) {
        PdfPTable table = new PdfPTable(new float[]{30, 20, 20});
        table.setWidthPercentage(60);
        table.setHeaderRows(1);
        for (String h : new String[]{"CVE", "Antes", "Después"}) {
            table.addCell(headerCell(h));
        }
        for (ScanComparisonDTO.SeverityChange c : changes) {
            table.addCell(cellText(c.getCveId()));
            table.addCell(priorityCell(c.getPriorityBefore()));
            table.addCell(priorityCell(c.getPriorityAfter()));
        }
        return table;
    }

    private PdfPTable kpiTable(DashboardStatsDTO stats) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(70);
        table.setWidths(new float[]{60, 40});
        addKpiRow(table, "Total de activos monitoreados", String.valueOf(stats.getTotalAssets()));
        addKpiRow(table, "Vulnerabilidades totales", String.valueOf(stats.getTotalVulnerabilities()));
        addKpiRow(table, "Abiertas", String.valueOf(stats.getOpenVulnerabilities()));
        addKpiRow(table, "Críticas", String.valueOf(stats.getCriticalVulnerabilities()));
        addKpiRow(table, "Resueltas este mes", String.valueOf(stats.getResolvedThisMonth()));
        addKpiRow(table, "MTTR (tiempo medio de resolución)", formatMttr(stats.getMttrDays()));
        return table;
    }

    private void addKpiRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, LABEL_FONT));
        labelCell.setPadding(5);
        labelCell.setBorderColor(Color.LIGHT_GRAY);
        PdfPCell valueCell = new PdfPCell(new Phrase(value, BODY_FONT));
        valueCell.setPadding(5);
        valueCell.setBorderColor(Color.LIGHT_GRAY);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private PdfPCell headerCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, TABLE_HEADER_FONT));
        cell.setBackgroundColor(HEADER_BG);
        cell.setPadding(5);
        return cell;
    }

    private PdfPCell cellText(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "—", TABLE_CELL_FONT));
        cell.setPadding(4);
        return cell;
    }

    private PdfPCell priorityCell(String priority) {
        PdfPCell cell = new PdfPCell(new Phrase(priority != null ? priority : "—",
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, severityColor(priority))));
        cell.setPadding(4);
        return cell;
    }

    private Color severityColor(String priority) {
        if (priority == null) return Color.GRAY;
        return switch (priority.toUpperCase()) {
            case "CRITICAL" -> new Color(0xbd, 0x1e, 0x1e);
            case "HIGH" -> new Color(0xf9, 0x5c, 0x5c);
            case "MEDIUM" -> new Color(0xb8, 0x8a, 0x00);
            case "LOW" -> new Color(0x44, 0xa0, 0x24);
            default -> Color.GRAY;
        };
    }

    private int nz(Integer v) {
        return v == null ? 0 : v;
    }

    private String fmt(LocalDateTime dt) {
        return dt == null ? "—" : dt.format(FMT);
    }

    private String formatMttr(Double days) {
        if (days == null) return "—";
        return days < 1 ? Math.round(days * 24) + " horas" : String.format("%.1f días", days);
    }
}
