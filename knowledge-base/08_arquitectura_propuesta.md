# Arquitectura Propuesta

Descriptiva (sistema ya implementado), no aspiracional. Detalle completo en `docs/architecture/`.

## Patrones aplicados

| Patrón | Dónde se usa | Por qué |
|---|---|---|
| Separación detección/triage (dual status) | `AssetVulnerability.detectionStatus` vs `triageStatus` | Evita que un re-escaneo automático pise el trabajo de análisis humano (ADR-0004) |
| Auditoría append-only | `VulnerabilityAudit`, `RemediationCycle`, `StateTransition` | Trazabilidad defendible, nunca se edita historia (ADR-0008) |
| Motor externo de scoring | Pipeline n8n, no en el backend | Iterar la lógica de riesgo sin redeployar el sistema de registro (ADR-0003) |
| RBAC + scoping por fila | `@PreAuthorize` + `user_asset_assignments` | Autorización real solo en backend, nunca confiar en el cliente (ADR-0006) |
| Esquema vía scripts SQL idempotentes | `init/00`→`init/25`, sin Flyway/Liquibase | Adecuado al modelo de despliegue real: un solo volumen fresco, no multi-entorno con migraciones incrementales (ADR-0002) |
| Secreto compartido para servicio interno | `X-Internal-Token` en `/api/webhook/*` | n8n es confiable pero no es un usuario, no amerita JWT (ADR-0007) |

## Estructura de directorios

```
GEF_Secure_App/
├── backend/
│   └── src/main/java/com/gef/gefsecureapp/
│       ├── config/        (AppConfig, SecretsValidator)
│       ├── controller/    (15 controladores REST)
│       ├── dto/
│       ├── exception/     (GlobalExceptionHandler)
│       ├── mapper/
│       ├── model/         (15 entidades JPA)
│       ├── repository/
│       ├── security/      (JWT)
│       ├── service/        (13 servicios)
│       ├── util/
│       └── validation/
├── frontend/
│   └── src/
│       ├── pages/         (Dashboard, Assets, Kanban, Scans, Login, Informes, Settings)
│       ├── components/
│       ├── contexts/       (AuthContext)
│       ├── hooks/          (useScanPolling)
│       ├── services/       (api.ts — único cliente axios)
│       └── types/
├── n8n/                    (Dockerfile + bootstrap.sh)
├── n8n-provisioning/        (credenciales placeholder)
├── workflows/               (pipeline n8n versionado)
├── init/                    (26 scripts SQL, 00→25)
├── docs/architecture/, docs/adr/  (documentación)
└── knowledge-base/          (este directorio)
```

## Seguridad

- Autenticación: JWT stateless (ADR-0001), BCrypt para passwords.
- Autorización: `@PreAuthorize` por endpoint + 4 roles + scoping de ASSET_OWNER (ADR-0006).
- Comunicación interna n8n↔backend: header `X-Internal-Token` compartido, no JWT (ADR-0007).
- Validación de input: Bean Validation en DTOs de entrada; `GlobalExceptionHandler` estandariza errores.
- Secrets management: variables de entorno vía `.env` (no versionado), `N8N_ENCRYPTION_KEY` generada una única vez, `SecretsValidator` valida secretos al arrancar el backend.

## Variables de entorno (principales)

| Variable | Descripción | Sensible |
|---|---|---|
| `POSTGRES_PASSWORD` | Password de la base | Sí |
| `N8N_ENCRYPTION_KEY` | Clave de cifrado de credenciales de n8n, generar una sola vez | Sí |
| `N8N_OWNER_PASSWORD` | Password del owner de n8n | Sí |
| `JWT_SECRET` / `jwt.expiration-minutes` | Firma y expiración del JWT | Sí (secret) |
| `N8N_INTERNAL_TOKEN` | Secreto compartido para `/api/webhook/*` | Sí |
| `SLACK_BOT_TOKEN` | Notificaciones (opcional) | Sí |
| `GITHUB_TOKEN` | Mayor rate limit en GitHub Advisory API (opcional) | Sí |
