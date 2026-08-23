# Glosario

Términos usados a lo largo de la documentación (ADRs, arquitectura, base de
conocimiento) y en el propio dominio de GEF Secure.

## Seguridad y vulnerabilidades

| Término | Significado |
|---|---|
| **CVE** | Common Vulnerabilities and Exposures — identificador estándar de una vulnerabilidad conocida (ej. `CVE-2024-12345`). |
| **GHSA** | GitHub Security Advisory — identificador de advisory en la GitHub Advisory Database (ej. `GHSA-xxxx-xxxx-xxxx`); una GHSA puede o no tener un CVE asociado. |
| **CVSS** | Common Vulnerability Scoring System — puntaje 0-10 de severidad técnica de una vulnerabilidad, usado como una de las variables del scoring de riesgo en `Risk_Assessment_Engine` (n8n). |
| **CISA KEV** | Known Exploited Vulnerabilities catalog — lista pública de vulnerabilidades con explotación confirmada en el mundo real; estar en este catálogo sube fuertemente la prioridad de un hallazgo (ver `docs/adr/0003-n8n-como-motor-de-scoring-externo.md`). |
| **Zero-day** | Vulnerabilidad explotada activamente antes de (o sin) que exista un parche oficial disponible. |
| **PURL** | Package URL — formato estándar para identificar de forma única un paquete de software (ej. `pkg:npm/lodash@4.17.21`), usado para matchear `software_components` contra advisories. |
| **SBOM** | Software Bill of Materials — inventario formal de los componentes de software de un sistema (formatos CycloneDX/SPDX). GEF Secure **consume** SBOMs generados con Syft para importar inventario (ver `docs/bitacora/19-08-26/Manual_Importacion_Inventario_Syft.md`), pero no genera un SBOM de sí mismo como proyecto. |
| **VEX** | Vulnerability Exploitability eXchange — modelo para declarar el estado real de explotabilidad de una vulnerabilidad en un producto concreto. GEF Secure lo adapta como el campo `outcome` (`MITIGADA` / `NO_APLICA` / `RIESGO_ACEPTADO`) al cerrar un hallazgo (ver `docs/adr/0005-modelo-vex-de-cierre.md`). |

## Modelo de datos y ciclo de vida

| Término | Significado |
|---|---|
| **Asset** | Activo del inventario (host/aplicación/VM) sobre el que se instalan componentes de software y se detectan vulnerabilidades. |
| **detectionStatus** | Estado de detección gestionado por el sistema (`OPEN`/`RESOLVED`) — refleja si el escáner sigue viendo la vulnerabilidad presente. No lo controla el analista. |
| **triageStatus** | Estado de triage gestionado por el analista (`DETECTADA`/`EN_ANALISIS`/`RESUELTA`) — el que se ve en el Kanban. Puede divergir del `detectionStatus` (ver `docs/adr/0004-modelo-dual-de-estado-deteccion-triage.md`). |
| **Escala de evidencia (E0-E6)** | Nivel de evidencia que respalda una transición de estado en `StateTransition`, de E0 (sin evidencia) a E6 (verificación técnica completa). |
| **MTTR** | Mean Time To Remediate/Resolve — tiempo promedio entre detección y resolución. GEF Secure calcula dos variantes: `mttrDeclaredDays` (basado en lo que el analista marca) y `mttrVerifiedDays` (solo cuenta cierres con `evidenceLevel` E4+, verificación técnica real — ver `docs/deuda-tecnica.md`, DT-01). |

## Autenticación y autorización

| Término | Significado |
|---|---|
| **JWT** | JSON Web Token — token autocontenido que prueba la identidad/rol del usuario sin necesidad de consultar la base en cada request (ver `docs/adr/0001-jwt-stateless-sin-revocacion.md`). |
| **RBAC** | Role-Based Access Control — modelo de autorización por roles fijos (`ADMIN`, `SECURITY_ANALYST`, `ASSET_OWNER`, `AUDITOR`). |
| **BCrypt** | Algoritmo de hash usado para almacenar contraseñas de forma irreversible. |

## Arquitectura y documentación

| Término | Significado |
|---|---|
| **ADR** | Architecture Decision Record — documento corto que registra una decisión de arquitectura, su contexto, alternativas consideradas y consecuencias (`docs/adr/`). |
| **STRIDE** | Metodología de modelado de amenazas (Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege), usada en `SECURITY.md`. |
| **RTO** | Recovery Time Objective — tiempo máximo aceptable para restaurar el servicio tras una caída. |
| **RPO** | Recovery Point Objective — cantidad máxima aceptable de datos que se pueden perder (medida en tiempo) ante una falla. |
