# UC-003 — Generar un informe (PDF)

**Actor principal**: ADMIN, SECURITY_ANALYST o AUDITOR (los 3 roles con acceso al módulo de Informes — ver `Sidebar.tsx`, ambos gating idénticos a Configuración).

**Actores secundarios**: ninguno.

**Precondiciones**: existen datos suficientes en el alcance elegido (al menos un escaneo ejecutado, para los informes de escaneo/comparación/remediación).

## Flujo principal

1. El actor entra a Informes y elige uno de los tipos disponibles: informe de un escaneo puntual (`GET /api/reports/scan/{scanId}`), comparación entre dos escaneos (`GET /api/reports/comparison`), Resumen Ejecutivo (`GET /api/reports/executive`), ficha de un CVE/GHSA (`GET /api/reports/cve/{identifier}`), análisis de vulnerabilidades por ventana de días (`GET /api/reports/vulnerabilities?days=`), o de remediación (`GET /api/reports/remediation?days=`).
2. Para la ficha de CVE/GHSA, el actor puede previsualizar el contenido en pantalla antes de generar el PDF (`GET /api/reports/cve/{identifier}/preview`).
3. El backend arma el contenido (`ReportPdfService`) a partir de los datos ya persistidos (hallazgos, escaneos, catálogos) y genera el PDF.
4. El endpoint responde con el PDF como `byte[]` y un nombre de archivo descriptivo (ej. `resumen-ejecutivo.pdf`, `informe-vulnerabilidades-30d.pdf`).
5. El frontend dispara la descarga del archivo en el navegador del actor.

## Flujos alternativos

- **Resumen Ejecutivo**: pensado para no duplicar los KPIs ya visibles en el Dashboard — agrega una narrativa/consolidado propio en vez de repetir los mismos números (ver `US-008`).
- **Informe de remediación**: parte de un rango de días (`?days=`) en vez de un escaneo puntual, cubriendo todo lo resuelto/pendiente en esa ventana.

## Excepciones

- **ASSET_OWNER intenta acceder a cualquier endpoint de `/api/reports/*`**: 403 — `ReportController` es la única excepción del sistema donde ASSET_OWNER no tiene ni siquiera acceso de lectura (ver `knowledge-base/03_actores_y_roles.md`).
- **El `scanId`, rango de días o identificador de CVE no existen**: la generación falla con un error controlado (404/400) antes de intentar armar el PDF.

## Postcondiciones

El actor recibe un archivo PDF descargado con el contenido solicitado; no se persiste ningún estado nuevo — es una operación de solo lectura sobre datos existentes.
