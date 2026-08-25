# Bitácora

Registro cronológico de sesiones de auditoría técnica y trabajo sobre el proyecto — no
es documentación de referencia (eso vive en `docs/architecture/`, `docs/adr/` y
`knowledge-base/`), es historial de **cómo se llegó** al estado actual: qué se auditó,
qué se encontró, qué se decidió y por qué.

Carpetas por fecha (`AAAA-MM-DD` abreviado a `DD-MM-AA` en el nombre de carpeta):

| Carpeta | Contenido principal |
|---|---|
| `18-08-26/` | Implementación inicial de fases 1-4 |
| `19-08-26/` | Cambios de sesión sobre escaneos/inventario, análisis de mejoras de ciberseguridad |
| `20-08-26/` | 1ª y 2ª auditoría end-to-end, checklist de despliegue, plan de implementación |
| `21-08-26/` | Brechas de tracking de remediación, plan de implementación sólido |
| `22-08-26/` | 3ª auditoría end-to-end |
| `23-08-26/` | Prompts de auditoría/rediseño (documentación, informes, configuración, landing, vulnerabilidades, README) |
| `24-08-26/` | 4ª y 5ª auditoría end-to-end, auditoría de secciones nuevas (Informes/Configuración/Landing), plan de remediación y de confiabilidad |

Las auditorías end-to-end usan las etiquetas `NUEVO` / `RECURRENTE` / `RESUELTO` /
`REGRESIÓN` para relacionar cada hallazgo con corridas anteriores — ver
[`docs/prompts/auditoria-end-to-end-vulnerabilidades.md`](../prompts/auditoria-end-to-end-vulnerabilidades.md)
para la plantilla reusable que las genera.
