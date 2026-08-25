# Secuencia — Generación de un informe PDF (UC-003)

```mermaid
sequenceDiagram
    actor Actor as ADMIN / SECURITY_ANALYST / AUDITOR
    participant FE as Frontend (Informes)
    participant BE as Backend (ReportController)
    participant PDF as ReportPdfService
    participant DB as Postgres

    Actor->>FE: elige tipo de informe (escaneo / comparacion / ejecutivo / CVE / vulnerabilidades / remediacion)
    FE->>BE: GET /api/reports/{tipo}
    BE->>BE: @PreAuthorize — bloquea ASSET_OWNER (unica excepcion sin lectura)
    BE->>DB: lee datos ya persistidos (hallazgos, escaneos, catalogos)
    BE->>PDF: generate*Report(...)
    PDF-->>BE: byte[] (PDF)
    BE-->>FE: 200 OK, PDF + nombre de archivo descriptivo
    FE-->>Actor: descarga el PDF

    Note over BE,DB: Operacion de solo lectura — no persiste estado nuevo
```
