# Architecture Decision Records — GEF Secure

Este directorio registra las decisiones de arquitectura significativas del proyecto, en formato [MADR](https://adr.github.io/madr/) (Title / Status / Context / Decision / Consequences / Alternatives Considered).

Un ADR no describe *cómo* funciona el sistema (eso vive en [`docs/architecture/`](../architecture/README.md)) sino *por qué* se tomó una decisión concreta cuando existían alternativas razonables. Se numeran de forma secuencial y no se borran ni renumeran cuando quedan obsoletos: si una decisión se revierte, se crea un ADR nuevo con estado `Superseded by ADR-XXXX` y se marca el antiguo como `Superseded`.

## Índice

| # | Título | Estado |
|---|--------|--------|
| [0001](0001-jwt-stateless-sin-revocacion.md) | JWT stateless sin lista de revocación | Accepted |
| [0002](0002-esquema-sql-manual-sin-migraciones.md) | Esquema de base de datos vía scripts SQL manuales, sin herramienta de migraciones | Accepted |
| [0003](0003-n8n-como-motor-de-scoring-externo.md) | n8n como motor externo de scoring y detección, no en el backend | Accepted |
| [0004](0004-modelo-dual-de-estado-deteccion-triage.md) | Modelo dual de estado: detección automática vs. triage analista | Accepted |
| [0005](0005-modelo-vex-de-cierre.md) | Modelo de cierre inspirado en VEX (VEX-like outcome) | Accepted |
| [0006](0006-rbac-con-scoping-por-asset-owner.md) | RBAC de 4 roles con scoping adicional para ASSET_OWNER | Accepted |
| [0007](0007-token-interno-compartido-para-webhook-n8n.md) | Token interno compartido para el webhook n8n → backend | Accepted |
| [0008](0008-auditoria-inmutable-append-only.md) | Auditoría inmutable y append-only para hallazgos y cambios de estado | Accepted |
| [0009](0009-sin-libreria-de-estado-global-en-frontend.md) | Sin librería de estado global en el frontend (Context API + estado local) | Accepted — justificación histórica pendiente de validación humana |

## Cómo proponer un ADR nuevo

1. Copiar la estructura de cualquier ADR existente.
2. Numerar con el siguiente número secuencial libre, cuatro dígitos con ceros a la izquierda.
3. Completar Context/Decision/Consequences/Alternatives Considered con hechos concretos del código, no aspiraciones.
4. Agregar la fila correspondiente a la tabla de este índice.
