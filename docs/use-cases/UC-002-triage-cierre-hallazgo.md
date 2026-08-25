# UC-002 — Triage y cierre de un hallazgo en el Kanban

**Actor principal**: SECURITY_ANALYST o ADMIN (analiza y decide); ASSET_OWNER puede mover únicamente los hallazgos de sus activos asignados.

**Actores secundarios**: ninguno (flujo 100% dentro del backend, sin n8n).

**Precondiciones**: existe al menos un `AssetVulnerability` en estado `DETECTADA` (creado por un escaneo, ver [UC-001](UC-001-ejecutar-escaneo.md)) visible para el actor según su scope de rol.

## Flujo principal

1. El actor abre el Kanban de Vulnerabilidades y ve las columnas por estado (`DETECTADA` / `EN_ANALISIS` / `RESUELTA`).
2. El actor arrastra un hallazgo de `DETECTADA` a `EN_ANALISIS` (o llama a `PATCH /api/vulnerabilities/{id}/status`) para indicar que está siendo evaluado.
3. Tras analizar el hallazgo (impacto real, si el activo es explotable, si ya existe mitigación), el actor lo mueve a `RESUELTA`, informando en el mismo `StatusUpdate` un desenlace inspirado en VEX (`ADR-0005`, `outcome`): `MITIGADA` (con `mitigationControl` obligatorio), `NO_APLICA`/falso positivo (con `justification` obligatoria), o `RIESGO_ACEPTADO` (con `acceptedBy` y `riskAcceptedUntil` obligatorios).
4. El backend valida el desenlace (`VulnerabilityAuditService.validateOutcome`) y la transición de estado, y dispara la auditoría append-only correspondiente (`ADR-0008`).
5. El Kanban se refresca mostrando el hallazgo en su nueva columna.

## Flujos alternativos

- **ASSET_OWNER hace triage de un hallazgo propio**: mismo flujo, pero `@PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST','ASSET_OWNER')")` en el endpoint permite el acceso; el scoping por asset-owner (`ADR-0006`) filtra a nivel de servicio para que solo vea/mueva hallazgos de sus activos asignados.
- **El escaneo automático reabre un hallazgo ya `RESUELTA`**: no es parte de este caso de uso (ver `docs/architecture/06-vulnerability-lifecycle.md`), pero es la transición inversa que puede devolver un hallazgo a `DETECTADA` si vuelve a detectarse tras haber sido cerrado.

## Excepciones

- **Transición de estado inválida** (ej. saltar directo a un desenlace sin pasar por `EN_ANALISIS`, o repetir el mismo estado): el backend la rechaza con un 400/422 según la validación de `StatusUpdate`.
- **`outcome` sin su campo de respaldo obligatorio** (ej. `RIESGO_ACEPTADO` sin `riskAcceptedUntil`, o un valor de `outcome` fuera de `MITIGADA`/`NO_APLICA`/`RIESGO_ACEPTADO`): `validateOutcome` lo rechaza con un error explícito (`ConflictException`).
- **El actor ASSET_OWNER intenta mover un hallazgo de un activo no asignado**: 403, por el scoping a nivel de servicio.

## Postcondiciones

El `AssetVulnerability` queda en el nuevo estado con su desenlace registrado; el movimiento queda en el registro de auditoría inmutable; el hallazgo aparece en la columna correspondiente del Kanban para todos los actores con visibilidad sobre ese activo.
