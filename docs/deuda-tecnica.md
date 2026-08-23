# Deuda técnica

Registro único de gaps conocidos, antes dispersos entre el README, los ADRs,
`docs/architecture/` y `knowledge-base/10_preguntas_abiertas.md`. No mezcla
deuda técnica con bugs: todo lo de acá es una limitación consciente o un
trabajo pendiente, no un comportamiento roto.

| ID | Descripción | Impacto | Riesgo | Prioridad | Fecha objetivo |
|---|---|---|---|---|---|
| DT-01 | `mttrVerifiedDays` en `DashboardService` es un stub — solo `mttrDeclaradoDays` está implementado | El Dashboard solo muestra MTTR declarativo (lo que marca el analista), no verificado técnicamente | Bajo (funcional, pero podría presentarse como más riguroso de lo que es) | Alta — antes de una demo a cliente | No definida |
| DT-02 | Cobertura de tests del frontend es mínima: solo existe `Assets.scan.test.tsx` | Regresiones de UI no se detectan automáticamente | Medio | Media | No definida |
| DT-03 | Sin plan de retención/archivado para `VulnerabilityAudit` y `StateTransition` (append-only, crecen sin límite) | Crecimiento de tabla sin control en el largo plazo | Bajo a este tamaño de datos, crece con el tiempo | Baja | No definida |
| DT-04 | No confirmado si `AUDITOR` tiene `@PreAuthorize` explícito en todos los endpoints o cae en el fallback "autenticado = accesible" | Posible acceso de lectura más amplio del previsto para ese rol | Medio | Alta | No definida |
| DT-05 | `X-Internal-Token` (n8n↔backend) no rota ni expira | Si se filtra, queda válido indefinidamente | Medio | Media | No definida |
| DT-06 | Backup de Postgres/n8n es manual y sin cadencia definida (ver `docs/architecture/07-disponibilidad-y-recuperacion.md`) | Pérdida de datos si se destruye un volumen sin backup reciente | Medio | Alta | No definida |
| DT-07 | Sin escaneo automatizado de las propias dependencias del proyecto (sin Dependabot/Snyk/SAST) | Vulnerabilidades en dependencias propias no se detectan salvo revisión manual — irónico para un proyecto de gestión de vulnerabilidades | Medio | Media | No definida |
| DT-08 | Sin rate limiting en los endpoints del backend | Expuesto a abuso/fuerza bruta sin límite de intentos | Bajo a este tamaño de usuarios, real en producción | Baja | No definida |
| DT-09 | No verificado que la instancia de n8n en producción/demo esté realmente configurada a las 09:00 (el JSON en git sí lo está, ver `docs/adr` y `04-n8n-pipeline.md`) | Expectativa operativa incorrecta si la UI fue cambiada manualmente sin re-exportar | Bajo | Alta — antes de confiar en el dato para una demo | No definida |
| DT-10 | Sin pipeline de CI/CD — tests solo corren manualmente | Nada bloquea un merge con tests rotos | Bajo (proyecto de un solo autor) | Baja | No definida |
| DT-11 | El vínculo `vulnerabilities_audit.scan_id` de un escaneo automático (`ScanService.completeAutomatic`) se resuelve por ventana de tiempo (60 min desde `executedAt`), no por un `scan_id` real de punta a punta como en el flujo manual | Si una corrida automática tarda más de 60 min entre `Persist_Audit_Findings` y `Persist_Scan_Statistics`, algunos hallazgos quedarían sin vincular a ese `ScanReport` (igual entran al sistema, solo que no vinculados a ese scan puntual). Además, los hallazgos automáticos insertados antes de este fix quedan con `scan_id NULL` para siempre — no hay backfill retroactivo | Bajo (ventana generosa vs. duración típica observada) | Baja | No definida |

## Cómo usar este archivo

Al cerrar un ítem, no lo borres — movelo a una sección "Resuelto" con la fecha
y un link al commit/ADR que lo cierra, para mantener trazabilidad de qué se
decidió dejar así vs. qué se corrigió.
