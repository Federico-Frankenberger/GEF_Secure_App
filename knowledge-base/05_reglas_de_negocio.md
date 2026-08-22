# Reglas de Negocio

Cada regla tiene un código único `RN-{DOMINIO}-{NN}` para trazabilidad. Extraídas de `VulnerabilityAuditService` (672 líneas, la lógica más densa del sistema), `SecurityConfig`, y los scripts `init/`.

## Dominio: Ciclo de vida de vulnerabilidades (RN-VUL)

- **RN-VUL-01**: `triageStatus` solo puede transicionar según el mapa `TRANSICIONES_PERMITIDAS`: DETECTADA → EN_ANALISIS → RESUELTA, y RESUELTA ↔ EN_ANALISIS (reapertura manual). No se permite saltar directamente de DETECTADA a RESUELTA.
- **RN-VUL-02**: si un escaneo vuelve a detectar una vulnerabilidad que estaba en `detectionStatus=RESOLVED`, se reabre automáticamente y `triageStatus` se fuerza de nuevo a DETECTADA — el sistema no confía en que el analista se dé cuenta manualmente de la reaparición.
- **RN-VUL-03**: `detectionStatus` (OPEN/RESOLVED) es responsabilidad exclusiva del sistema (según el último escaneo); `triageStatus` es responsabilidad exclusiva del analista. Nunca se sincronizan automáticamente uno con el otro salvo en la reapertura de RN-VUL-02 (ver ADR-0004).
- **RN-VUL-04**: cerrar una vulnerabilidad (`triageStatus=RESUELTA`) con un `outcome` VEX exige justificación obligatoria (`justification` no vacío); si el outcome es RIESGO_ACEPTADO, además exige `acceptedBy` y `riskAcceptedUntil` (ver ADR-0005).
- **RN-VUL-05**: cada cambio de `triageStatus` genera una fila en `StateTransition` (append-only, nunca se edita ni se borra) con evidencia asociada en escala E0–E6 — justificación: garantizar trazabilidad para auditoría externa o de cliente (ver ADR-0008).
- **RN-VUL-06**: el `dueDate` de una vulnerabilidad se calcula a partir de su `priority` (no es editable manualmente) — a mayor prioridad, plazo más corto.

## Dominio: Escaneo (RN-SCAN)

- **RN-SCAN-01**: un escaneo se puede disparar en 4 alcances (activo, componente de software, entorno, global), todos vía el mismo webhook hacia n8n (`N8nWebhookService`).
- **RN-SCAN-02**: un `ScanReport` en estado RUNNING que no recibe actualización dentro de la ventana configurada (`scan.watchdog.check-interval-ms`, default 5 min) se cierra automáticamente por el watchdog de `ScanService` — evita reportes eternamente "en progreso" si n8n falla en devolver el callback.
- **RN-SCAN-03**: el scoring de riesgo (CVSS + criticidad de entorno + CISA KEV + zero-day) no se calcula en el backend — se recibe ya calculado desde n8n vía `POST /api/webhook/vulnerabilities` (ver ADR-0003).

## Dominio: RBAC (RN-RBAC)

- **RN-RBAC-01**: `role` en la tabla `users` está restringido por `CHECK` a exactamente 4 valores: ADMIN, SECURITY_ANALYST, ASSET_OWNER, AUDITOR.
- **RN-RBAC-02**: ASSET_OWNER solo puede ver/operar sobre activos presentes en `user_asset_assignments` para su usuario — aplicado en el backend vía `applyScope`/`applyScopeAV` en los servicios, nunca confiado al frontend (ver ADR-0006).
- **RN-RBAC-03**: el gating de rol visible en el frontend (menú, botones deshabilitados) es una conveniencia de UX, no un control de seguridad — un usuario no autorizado que llame directo a la API sigue bloqueado por `@PreAuthorize`.

## Dominio: Autenticación (RN-AU)

- **RN-AU-01**: los tokens JWT son autocontenidos y sin estado — no hay lista de revocación ni verificación contra la base en cada request. Un token emitido sigue siendo válido hasta que vence (`jwt.expiration-minutes`, 8h por defecto) aunque el usuario se borre o cambie de rol mientras tanto (ver ADR-0001, decisión consciente de alcance).
- **RN-AU-02**: las llamadas de n8n hacia el backend (`/api/webhook/*`) no usan JWT — usan un secreto compartido en el header `X-Internal-Token`, porque n8n es un servicio interno de confianza, no un cliente de usuario final (ver ADR-0007).

## Dominio: Excepciones globales

- Toda excepción no controlada pasa por `GlobalExceptionHandler`, que estandariza la respuesta de error en JSON — ningún endpoint devuelve stack traces crudos al cliente.
