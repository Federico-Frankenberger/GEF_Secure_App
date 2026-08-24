package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.CvePreviewDTO;
import com.gef.gefsecureapp.dto.GhsaAdvisoryDTO;
import com.gef.gefsecureapp.dto.RemediationAnalysisDTO;
import com.gef.gefsecureapp.dto.ScanComparisonDTO;
import com.gef.gefsecureapp.dto.VulnerabilityAnalysisDTO;
import com.gef.gefsecureapp.dto.VulnerabilityAuditDTO;
import com.gef.gefsecureapp.dto.VulnerabilitySummaryDTO;
import com.gef.gefsecureapp.exception.GhsaAdvisoryUnavailableException;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.VulnerabilityAuditMapper;
import com.gef.gefsecureapp.model.AssetVulnerability;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.repository.AssetVulnerabilityRepository;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import com.gef.gefsecureapp.security.CurrentUser;
import com.lowagie.text.*;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Seccion "Informes"/Centro de Informes: arma los distintos tipos de reporte en PDF con
 *  OpenPDF, reutilizando los mismos datos que ya expone el resto de la API -- no hay
 *  logica de negocio nueva aca, solo presentacion. */
@Service
@RequiredArgsConstructor
@Slf4j
public class ReportPdfService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Color HEADER_BG = new Color(0x33, 0x41, 0x55);
    // Marca de GEF Secure (brand-600 del frontend, frontend/src/index.css) -- antes el PDF
    // no tenia ningun color de marca, solo el gris/azul generico de las tablas.
    private static final Color BRAND_COLOR = new Color(0x02, 0x84, 0xc7);

    private static final Font TITLE_FONT        = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(0x1e, 0x40, 0xaf));
    private static final Font SUBTITLE_FONT     = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY);
    private static final Font SECTION_FONT      = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.DARK_GRAY);
    private static final Font LABEL_FONT        = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.DARK_GRAY);
    private static final Font BODY_FONT         = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
    private static final Font TABLE_HEADER_FONT = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
    private static final Font TABLE_CELL_FONT   = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);
    private static final Font FOOTER_FONT       = FontFactory.getFont(FontFactory.HELVETICA, 7, Color.GRAY);

    // Logo embebido una sola vez al cargar la clase -- se copia a resources/ en el build
    // (backend/src/main/resources/logo-icon.png) porque el backend no tiene acceso al
    // arbol de fuentes del frontend en runtime (build contexts de Docker separados).
    private static final byte[] LOGO_BYTES = loadLogoBytes();

    private static byte[] loadLogoBytes() {
        try (InputStream in = ReportPdfService.class.getResourceAsStream("/logo-icon.png")) {
            return in == null ? null : in.readAllBytes();
        } catch (IOException e) {
            log.warn("No se pudo cargar el logo para los PDFs de Informes: {}", e.getMessage());
            return null;
        }
    }

    private final ScanReportRepository scanReportRepository;
    private final VulnerabilityAuditService vulnerabilityAuditService;
    private final AssetVulnerabilityRepository assetVulnerabilityRepository;
    private final GhsaAdvisoryService ghsaAdvisoryService;
    private final VulnerabilityAuditMapper vulnerabilityAuditMapper;
    private final UserAssetAssignmentService userAssetAssignmentService;

    /** C2 (docs/20-08-26/AUDITORIA_END_TO_END.md): antes solo los hallazgos detallados
     *  de un escaneo estaban scopeados (via vulnerabilityAuditService) -- la metadata del
     *  propio ScanReport (codigo, target, conteos por severidad) no. Para ASSET_OWNER,
     *  un escaneo ENTORNO/GLOBAL (sin un unico activo asociado) queda fuera de scope por
     *  diseño: no hay forma de acotarlo a "sus" activos sin arriesgar filtrar mal. */
    private void assertScanInScope(ScanReport scan) {
        if (!CurrentUser.isAssetOwner()) return;
        Set<Long> scope = userAssetAssignmentService.assignedAssetIds(CurrentUser.get().id());
        Long relevantAssetId = scan.getAsset() != null ? scan.getAsset().getId()
                : scan.getSoftwareComponent() != null ? scan.getSoftwareComponent().getAsset().getId()
                : null;
        if (relevantAssetId == null || !scope.contains(relevantAssetId)) {
            throw new ResourceNotFoundException("ScanReport", scan.getId());
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateScanReport(Long scanId) {
        ScanReport scan = scanReportRepository.findById(scanId)
                .orElseThrow(() -> new ResourceNotFoundException("ScanReport", scanId));
        assertScanInScope(scan);
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
        assertScanInScope(scanA);
        assertScanInScope(scanB);
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

    // Centro de Informes -- corrección de diseño (docs/bitacora/23-08-26): la primera
    // versión reusaba DashboardStatsDTO acá (Total activos, Vulnerabilidades, Abiertas,
    // Críticas, Resueltas, MTTR) -- exactamente los mismos KPIs que ya muestra el
    // Dashboard, con el mismo cálculo. El usuario lo notó en pantalla: un "resumen
    // ejecutivo" que repite el Dashboard no aporta nada nuevo. Ahora usa EXCLUSIVAMENTE
    // VulnerabilitySummaryDTO -- campos que ya se traían pero nunca se mostraban
    // (exploitedCount, newLast7Days, resolvedLast7Days, affectedAssetsCount) en vez de
    // los que ya están un click más allá en /dashboard.
    @Transactional(readOnly = true)
    public byte[] generateExecutiveReport() {
        VulnerabilitySummaryDTO summary = vulnerabilityAuditService.getSummary();
        List<AssetVulnerability> topCritical = CurrentUser.isAssetOwner()
                ? scopedTop10Critical()
                : assetVulnerabilityRepository.findTop10ByPriorityAndDetectionStatusOrderByLastDetectedAtDesc("CRITICAL", "OPEN");

        return build("Error generando el resumen ejecutivo", document -> {
            addTitleBlock(document, "Resumen Ejecutivo de Seguridad", "Estado actual de la postura de vulnerabilidades");

            addSectionHeading(document, "Indicadores clave");
            document.add(executiveKpiTable(summary));

            addSectionHeading(document, "Top vulnerabilidades críticas abiertas (" + topCritical.size() + ")");
            addFindingsOrEmpty(document,
                    topCritical.stream().map(vulnerabilityAuditMapper::toResponse).toList(),
                    "No hay vulnerabilidades críticas abiertas actualmente.");
        });
    }

    @Transactional(readOnly = true)
    public byte[] generateCveReport(String identifier) {
        List<AssetVulnerability> matches = findCveMatches(identifier);
        if (matches.isEmpty()) {
            throw new ResourceNotFoundException("No se encontraron activos afectados por " + identifier);
        }
        List<VulnerabilityAuditDTO.Response> affected = matches.stream().map(vulnerabilityAuditMapper::toResponse).toList();
        VulnerabilityAuditDTO.Response first = affected.get(0);
        GhsaAdvisoryDTO advisoryFinal = fetchAdvisoryOrNull(matches);

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

    /** Centro de Informes (docs/bitacora/23-08-26): preview liviano para la pestaña Ficha
     *  de CVE/GHSA -- misma búsqueda que generateCveReport, sin armar el PDF. */
    @Transactional(readOnly = true)
    public CvePreviewDTO previewCve(String identifier) {
        List<AssetVulnerability> matches = findCveMatches(identifier);
        if (matches.isEmpty()) {
            return CvePreviewDTO.builder().found(false).affectedAssetsCount(0L).build();
        }
        VulnerabilityAuditDTO.Response first = vulnerabilityAuditMapper.toResponse(matches.get(0));
        GhsaAdvisoryDTO advisory = fetchAdvisoryOrNull(matches);
        return CvePreviewDTO.builder()
                .found(true)
                .affectedAssetsCount((long) matches.size())
                .priority(first.getPriority())
                .cvss(first.getCvss())
                .summary(advisory != null ? advisory.getSummary() : null)
                .build();
    }

    /** Pestaña "Vulnerabilidades" del Centro de Informes: mismos datos que ya calcula
     *  VulnerabilidadesAnalisis.tsx (getAnalysis(days)) -- solo maquetado a PDF, cero
     *  lógica de negocio nueva. */
    @Transactional(readOnly = true)
    public byte[] generateVulnerabilityAnalysisReport(int days) {
        VulnerabilityAnalysisDTO analysis = vulnerabilityAuditService.getAnalysis(days);

        return build("Error generando el informe de vulnerabilidades", document -> {
            addTitleBlock(document, "Informe de Vulnerabilidades",
                    "Últimos " + days + " días · tendencia, cumplimiento de SLA y fuentes de detección");

            addSectionHeading(document, "Cumplimiento de SLA (hallazgos abiertos)");
            document.add(slaTable(analysis.getSlaOverdueCount(), analysis.getSlaUpcomingCount(), analysis.getSlaOnTrackCount()));

            addSectionHeading(document, "Fuentes de detección (hallazgos abiertos)");
            document.add(sourcesTable(analysis.getCisaKevCount(), analysis.getGhsaOnlyCount()));

            addSectionHeading(document, "Tendencia diaria: detectadas vs. resueltas");
            if (analysis.getTrend().isEmpty()) {
                document.add(new Paragraph("Sin actividad de detección/resolución en el período elegido.", BODY_FONT));
            } else {
                document.add(trendTable(analysis.getTrend()));
            }
        });
    }

    /** Pestaña "Remediación" del Centro de Informes: MTTR (mismo cálculo que el
     *  Dashboard), SLA, y los 2 desgloses nuevos (VEX/evidencia) que hasta ahora ningún
     *  endpoint exponía. */
    @Transactional(readOnly = true)
    public byte[] generateRemediationReport(int days) {
        RemediationAnalysisDTO remediation = vulnerabilityAuditService.getRemediationAnalysis(days);

        return build("Error generando el informe de remediación", document -> {
            addTitleBlock(document, "Informe de Remediación",
                    "Últimos " + days + " días · eficiencia de resolución de vulnerabilidades");

            addSectionHeading(document, "MTTR (tiempo medio de resolución)");
            document.add(mttrKpiTable(remediation));

            if (!remediation.getMttrByCriticality().isEmpty()) {
                addSectionHeading(document, "MTTR declarado por criticidad");
                document.add(mttrByCriticalityTable(remediation.getMttrByCriticality()));
            }

            addSectionHeading(document, "Cumplimiento de SLA (hallazgos abiertos)");
            document.add(slaTable(remediation.getSlaOverdueCount(), remediation.getSlaUpcomingCount(), remediation.getSlaOnTrackCount()));

            addSectionHeading(document, "Cierres por tipo de resolución (VEX, período)");
            addBreakdownOrEmpty(document, remediation.getOutcomeBreakdown(), "outcome", "Sin cierres en el período elegido.");

            addSectionHeading(document, "Cierres por nivel de evidencia (período)");
            addBreakdownOrEmpty(document, remediation.getEvidenceLevelBreakdown(), "evidenceLevel", "Sin cierres en el período elegido.");
        });
    }

    private List<AssetVulnerability> findCveMatches(String identifier) {
        return CurrentUser.isAssetOwner()
                ? scopedByCveOrGhsaId(identifier)
                : assetVulnerabilityRepository.findByCveIdIgnoreCaseOrGhsaIdIgnoreCase(identifier, identifier);
    }

    private GhsaAdvisoryDTO fetchAdvisoryOrNull(List<AssetVulnerability> matches) {
        String ghsaId = matches.stream().map(AssetVulnerability::getGhsaId).filter(Objects::nonNull).findFirst().orElse(null);
        if (ghsaId == null) return null;
        try {
            return ghsaAdvisoryService.getByGhsaId(ghsaId);
        } catch (GhsaAdvisoryUnavailableException ignored) {
            // La ficha/preview se arma igual, sin descripcion externa -- no bloquea nada.
            return null;
        }
    }

    private List<AssetVulnerability> scopedTop10Critical() {
        Set<Long> scope = userAssetAssignmentService.assignedAssetIds(CurrentUser.get().id());
        if (scope.isEmpty()) return List.of();
        return assetVulnerabilityRepository
                .findTop10ByPriorityAndDetectionStatusAndSoftwareComponent_Asset_IdInOrderByLastDetectedAtDesc(
                        "CRITICAL", "OPEN", scope);
    }

    private List<AssetVulnerability> scopedByCveOrGhsaId(String identifier) {
        Set<Long> scope = userAssetAssignmentService.assignedAssetIds(CurrentUser.get().id());
        if (scope.isEmpty()) return List.of();
        return assetVulnerabilityRepository.findByCveIdOrGhsaIdIgnoreCaseAndAssetIn(identifier, scope);
    }

    // ── Construcción del documento ────────────────────────────────────────────

    private interface DocumentBody {
        void build(Document document) throws DocumentException;
    }

    private byte[] build(String errorMessage, DocumentBody body) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 54, 46);
        try {
            PdfWriter writer = PdfWriter.getInstance(document, out);
            writer.setPageEvent(new FooterPageEvent());
            document.open();
            body.build(document);
            document.close();
        } catch (DocumentException e) {
            throw new IllegalStateException(errorMessage + ": " + e.getMessage(), e);
        }
        return out.toByteArray();
    }

    /** Pie de página con número de página + quién lo generó -- antes el PDF no tenía
     *  ningún rastro de autoría ni paginación (docs/bitacora/23-08-26). No se agrega el
     *  total de páginas (requiere un PdfTemplate de dos pasadas) para no sumar
     *  complejidad frágil por un detalle menor -- "Página N" ya resuelve la orientación
     *  en documentos largos. */
    private static class FooterPageEvent extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            String generatedBy;
            try {
                generatedBy = "Generado por " + CurrentUser.get().username() + " (" + CurrentUser.get().role() + ") · GEF Secure";
            } catch (Exception e) {
                // Contexto de seguridad no disponible (no debería pasar en un request real,
                // pero un footer roto no puede tirar abajo la generación del PDF entero).
                generatedBy = "GEF Secure";
            }
            String pageLabel = "Página " + writer.getPageNumber();
            float y = document.bottom() - 20;

            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT, new Phrase(generatedBy, FOOTER_FONT),
                    document.left(), y, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT, new Phrase(pageLabel, FOOTER_FONT),
                    document.right(), y, 0);
        }
    }

    private void addFindingsOrEmpty(Document document, List<VulnerabilityAuditDTO.Response> findings, String emptyMessage) throws DocumentException {
        if (findings.isEmpty()) {
            document.add(new Paragraph(emptyMessage, BODY_FONT));
        } else {
            document.add(findingsTable(findings));
        }
    }

    private void addBreakdownOrEmpty(Document document, List<Map<String, Object>> rows, String keyField, String emptyMessage) throws DocumentException {
        if (rows.isEmpty()) {
            document.add(new Paragraph(emptyMessage, BODY_FONT));
        } else {
            document.add(breakdownTable(rows, keyField));
        }
    }

    private void addTitleBlock(Document document, String title, String subtitle) throws DocumentException {
        if (LOGO_BYTES != null) {
            try {
                Image logo = Image.getInstance(LOGO_BYTES);
                logo.scaleToFit(32, 32);
                logo.setAlignment(Image.ALIGN_LEFT);
                document.add(logo);
            } catch (Exception e) {
                log.warn("No se pudo incrustar el logo en el PDF: {}", e.getMessage());
            }
        }

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
        table.addCell(severityCell("CRÍTICAS", criticals, priorityColor("CRITICAL")));
        table.addCell(severityCell("ALTAS", highs, priorityColor("HIGH")));
        table.addCell(severityCell("MEDIAS", mediums, priorityColor("MEDIUM")));
        table.addCell(severityCell("BAJAS", lows, priorityColor("LOW")));
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

    // Corrección de diseño (docs/bitacora/23-08-26): reemplaza al viejo kpiTable(stats,
    // summary), que mostraba Total activos/Vulnerabilidades/Abiertas/Críticas/Resueltas/
    // MTTR -- idéntico a lo que ya muestra el Dashboard. Estos 6 campos SÍ son propios
    // del resumen ejecutivo: exposición, explotación conocida y deltas del período, que
    // el Dashboard no calcula (VulnerabilitySummaryDTO, sección 15 del prompt de
    // Informes: "evitar duplicar el Dashboard").
    private PdfPTable executiveKpiTable(VulnerabilitySummaryDTO summary) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(70);
        table.setWidths(new float[]{60, 40});
        addKpiRow(table, "Activos con exposición (al menos 1 hallazgo abierto)", String.valueOf(summary.getAffectedAssetsCount()));
        addKpiRow(table, "Con explotación conocida", String.valueOf(summary.getExploitedCount()));
        addKpiRow(table, "Nuevas detecciones (últimos 7 días)", String.valueOf(summary.getNewLast7Days()));
        addKpiRow(table, "Resueltas (últimos 7 días)", String.valueOf(summary.getResolvedLast7Days()));
        addKpiRow(table, "Cumplimiento de SLA (abiertas en plazo)", formatSlaPercent(summary));
        addKpiRow(table, "En catálogo CISA KEV", String.valueOf(summary.getCisaKevCount()));
        return table;
    }

    private String formatSlaPercent(VulnerabilitySummaryDTO summary) {
        long open = summary.getOpenCount();
        if (open == 0) return "—";
        long onTrack = Math.max(0, open - summary.getSlaOverdueCount() - summary.getSlaUpcomingCount());
        return String.format("%.0f%%", onTrack * 100.0 / open);
    }

    private PdfPTable slaTable(Long overdue, Long upcoming, Long onTrack) {
        PdfPTable table = new PdfPTable(3);
        table.setWidthPercentage(80);
        table.addCell(severityCell("VENCIDO", overdue.intValue(), priorityColor("CRITICAL")));
        table.addCell(severityCell("PRÓXIMO A VENCER", upcoming.intValue(), priorityColor("MEDIUM")));
        table.addCell(severityCell("EN PLAZO", onTrack.intValue(), priorityColor("LOW")));
        return table;
    }

    private PdfPTable sourcesTable(Long cisaKev, Long ghsaOnly) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(60);
        table.setWidths(new float[]{60, 40});
        addKpiRow(table, "En catálogo CISA KEV (explotación conocida)", String.valueOf(cisaKev));
        addKpiRow(table, "Solo en GitHub Advisories (sin KEV)", String.valueOf(ghsaOnly));
        return table;
    }

    private PdfPTable trendTable(List<Map<String, Object>> trend) {
        PdfPTable table = new PdfPTable(new float[]{30, 35, 35});
        table.setWidthPercentage(70);
        table.setHeaderRows(1);
        for (String h : new String[]{"Fecha", "Detectadas", "Resueltas"}) {
            table.addCell(headerCell(h));
        }
        for (Map<String, Object> row : trend) {
            table.addCell(cellText(String.valueOf(row.get("date"))));
            table.addCell(cellText(String.valueOf(row.get("detectadas"))));
            table.addCell(cellText(String.valueOf(row.get("resueltas"))));
        }
        return table;
    }

    private PdfPTable mttrKpiTable(RemediationAnalysisDTO r) {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(70);
        table.setWidths(new float[]{60, 40});
        addKpiRow(table, "MTTR declarado", formatMttr(r.getMttrDeclaredDays()));
        addKpiRow(table, "MTTR verificado (evidencia técnica E4+)", formatMttr(r.getMttrVerifiedDays()));
        addKpiRow(table, "Casos reabiertos al menos una vez", String.valueOf(r.getReopenedCasesCount()));
        return table;
    }

    private PdfPTable mttrByCriticalityTable(List<Map<String, Object>> rows) {
        PdfPTable table = new PdfPTable(new float[]{50, 50});
        table.setWidthPercentage(60);
        table.setHeaderRows(1);
        table.addCell(headerCell("Prioridad"));
        table.addCell(headerCell("MTTR promedio"));
        for (Map<String, Object> row : rows) {
            String priority = String.valueOf(row.get("priority"));
            table.addCell(priorityCell(priority));
            Object avgDays = row.get("avgDays");
            table.addCell(cellText(avgDays instanceof Number n ? formatMttr(n.doubleValue()) : "—"));
        }
        return table;
    }

    private PdfPTable breakdownTable(List<Map<String, Object>> rows, String keyField) {
        PdfPTable table = new PdfPTable(new float[]{60, 40});
        table.setWidthPercentage(60);
        table.setHeaderRows(1);
        table.addCell(headerCell(keyField.equals("outcome") ? "Tipo de cierre" : "Nivel de evidencia"));
        table.addCell(headerCell("Cantidad"));
        for (Map<String, Object> row : rows) {
            table.addCell(cellText(String.valueOf(row.get(keyField))));
            table.addCell(cellText(String.valueOf(row.get("count"))));
        }
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
                FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, priorityColor(priority))));
        cell.setPadding(4);
        return cell;
    }

    // Reconciliado con SEVERITY_HEX/PRIORITY_BADGE de frontend/src/constants/badges.ts
    // (docs/bitacora/23-08-26): antes esta paleta era propia del PDF y no coincidía ni en
    // tono (HIGH era un rojo salmón, casi indistinguible de CRITICAL, en vez de naranja
    // como en la UI). Misma escala de Tailwind que ya usa el frontend (red/orange/amber/
    // green), pero en el tono "600" en vez de "400": el frontend es de fondo oscuro (los
    // tonos claros contrastan bien ahí), el PDF es de fondo blanco -- mismo color
    // semántico, ajustado a legible en papel/pantalla clara.
    private Color severityColor(String priority) {
        if (priority == null) return Color.GRAY;
        return switch (priority.toUpperCase()) {
            case "CRITICAL" -> new Color(0xdc, 0x26, 0x26);
            case "HIGH" -> new Color(0xea, 0x58, 0x0c);
            case "MEDIUM" -> new Color(0xca, 0x8a, 0x04);
            case "LOW" -> new Color(0x16, 0xa3, 0x4a);
            default -> Color.GRAY;
        };
    }

    private Color priorityColor(String priority) {
        return severityColor(priority);
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
