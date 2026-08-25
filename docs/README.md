# Documentación — GEF Secure

Índice navegable de toda la documentación del proyecto. Para la visión de producto,
roles, reglas de negocio e historias de usuario, ver [`knowledge-base/`](../knowledge-base/README.md)
en la raíz del repo — no se duplica acá.

## Arquitectura

- [Overview](architecture/README.md) — índice de los 7 documentos de arquitectura
- [01 — System overview](architecture/01-system-overview.md)
- [02 — Backend](architecture/02-backend.md)
- [03 — Frontend](architecture/03-frontend.md)
- [04 — Pipeline de n8n](architecture/04-n8n-pipeline.md)
- [05 — Base de datos](architecture/05-database.md)
- [06 — Ciclo de vida de una vulnerabilidad](architecture/06-vulnerability-lifecycle.md)
- [07 — Disponibilidad y recuperación](architecture/07-disponibilidad-y-recuperacion.md)
- [Diagramas](architecture/diagrams/) — arquitectura por capas, contexto/componentes,
  casos de uso, ERD, clases de servicios, secuencias (escaneo/triage/reapertura/informe),
  estados y actividad del ciclo de vida, despliegue (todos en Mermaid)

## Decisiones de diseño

- [ADRs](adr/README.md) — 9 decisiones arquitectónicas con contexto, alternativas y consecuencias

## Casos de uso

- [Casos de uso](use-cases/) — procesos de negocio principales de punta a punta

## Operación

- [Instalación rápida](../README.md#quick-start) — vive en el README raíz, no duplicado acá
- [Deployment](operations/deployment.md) — infraestructura de producción preparada
- [Troubleshooting](operations/troubleshooting.md) — problemas conocidos y cómo resolverlos

## Seguridad

- [`SECURITY.md`](../SECURITY.md) (raíz del repo) — modelo de amenazas STRIDE y controles implementados

## Referencia

- [Glosario](glosario.md)
- [Deuda técnica](deuda-tecnica.md) — gaps conocidos, cerrados y abiertos
- [Bitácora](bitacora/README.md) — auditorías técnicas y sesiones de trabajo, orden cronológico
- [Documentos fuente](fuentes/README.md) — material histórico de insumo/planificación, no la referencia vigente
- [Prompts reutilizables](prompts/) — plantillas de auditoría para correr en sesiones futuras

## Base de conocimiento (`knowledge-base/`, raíz del repo)

Visión, alcance, actores/roles, modelo de datos, reglas de negocio (`RN-*`), funcionalidades
e historias de usuario (`US-*`), flujos principales, arquitectura propuesta, decisiones y
supuestos, preguntas abiertas, y el pipeline de n8n en detalle. [Índice completo](../knowledge-base/README.md).
