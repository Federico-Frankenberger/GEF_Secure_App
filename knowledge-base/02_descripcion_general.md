# Descripción General

## Stack tecnológico

| Capa | Tecnologías | Versión mínima |
|---|---|---|
| Backend | Spring Boot, Java, Gradle | Spring Boot 3 / Java 21 |
| Frontend | React, TypeScript, Vite | React 18 |
| Base de datos | PostgreSQL | 15 |
| Automatización | n8n (self-hosted, Community Edition) | 2.4.6 |
| Contenedores | Docker, Docker Compose | — |
| Documentación API | springdoc / Swagger UI | — |

## Arquitectura general

```
┌──────────┐     JWT      ┌──────────────┐   validate   ┌────────────┐
│ Frontend │ ───────────► │   Backend    │ ───────────► │ PostgreSQL │
│ (React)  │ ◄─────────── │ (Spring Boot)│ ◄─────────── │  (init/)   │
└──────────┘   REST/JSON  └──────┬───────┘              └────────────┘
                                  │  X-Internal-Token (webhook)
                                  ▼
                            ┌──────────┐   HTTP    ┌───────────────────┐
                            │   n8n    │ ────────► │ GitHub Advisories  │
                            │(pipeline │           │ CISA KEV           │
                            │ 49 nodos)│ ────────► │ Slack              │
                            └──────────┘           └───────────────────┘
```

El backend es el sistema de registro (source of truth) y expone la API REST que consume el frontend. El scoring/detección de vulnerabilidades no vive en el backend: n8n corre el pipeline completo (fetch de advisories, cruce contra el inventario, cálculo de prioridad, notificación) y le devuelve los resultados al backend por webhook (ver ADR-0003 y `13_n8n_automatizacion.md`). Esta separación permite iterar la lógica de scoring sin redeployar el backend.

## Integraciones externas

| Servicio | Propósito | Tipo |
|---|---|---|
| GitHub Advisory Database | Fuente de vulnerabilidades conocidas por paquete/ecosistema | REST (API pública, con token opcional para mayor rate limit) |
| CISA KEV | Catálogo de vulnerabilidades explotadas activamente | REST |
| n8n | Orquestación del pipeline de escaneo y scoring | Webhook (backend→n8n) + callback HTTP (n8n→backend) |
| Slack | Notificación de resultados de escaneo y errores del sistema | API (Bot token) |

## API REST (resumen)

Agrupada por recurso, prefijo `/api`: `auth` (login), `assets` (CRUD + soft-delete + scan + inventario SBOM + asignaciones), `asset-types`, `ecosystems`, `environments` (CRUD + scan), `software-catalog`, `software-components` (CRUD + scan), `scan` (disparo global + reportes), `vulnerabilities` (consulta + cambio de estado de triage), `ghsa-advisories` (detalle cacheado), `dashboard` (stats), `reports` (PDF: por escaneo, comparación, ejecutivo, por CVE), `users`, `system-errors` (solo ADMIN), `webhook` (callback de n8n, autenticado con `X-Internal-Token`, no JWT). Detalle completo de endpoints en `docs/architecture/02-backend.md`.
