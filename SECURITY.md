# Seguridad

Este documento describe el modelo de seguridad implementado en GEF Secure y
sus límites conocidos, con honestidad sobre los trade-offs — varios son
decisiones conscientes de alcance para esta etapa del producto, no descuidos.

## Autenticación

JWT autocontenido y sin estado (BCrypt para passwords, expiración configurable
vía `jwt.expiration-minutes`, 8hs por defecto). No hay lista de revocación ni
verificación contra la base en cada request: un token emitido sigue siendo
válido hasta que vence, aunque el usuario se borre o cambie de rol mientras
tanto. Detalle completo, alternativas consideradas y consecuencias en
[ADR-0001](docs/adr/0001-jwt-stateless-sin-revocacion.md).

## Autorización (RBAC)

Cuatro roles — `ADMIN`, `SECURITY_ANALYST`, `ASSET_OWNER`, `AUDITOR` — reforzados
con `@PreAuthorize` a nivel de método y una constraint `CHECK` en base de datos.
`ASSET_OWNER` además queda restringido a sus activos asignados vía
`user_asset_assignments`. La autorización real es siempre del lado del backend;
el gating de rol en el frontend es solo cosmético (oculta/muestra opciones de
UI, no reemplaza el control de acceso). Detalle en
[ADR-0006](docs/adr/0006-rbac-con-scoping-por-asset-owner.md).

## Comunicación interna backend ↔ n8n

Los webhooks que n8n usa para reportar resultados al backend (`/api/webhook/*`)
se protegen con un token compartido (`X-Internal-Token`), no con JWT — n8n es un
servicio interno de confianza, no un cliente de usuario final. Ese token hoy no
rota ni expira. Detalle en
[ADR-0007](docs/adr/0007-token-interno-compartido-para-webhook-n8n.md).

## Manejo de secretos

Los secretos viven en `.env` (nunca commiteado; ver `.env.example` como
plantilla) y se inyectan a los contenedores por variables de entorno. Ningún
secreto real está versionado en git —
`n8n-provisioning/credentials.json` contiene únicamente placeholders que
`bootstrap.sh` resuelve al arrancar. `N8N_ENCRYPTION_KEY` debe generarse una
sola vez (`openssl rand -base64 32`) y no cambiar después, o las credenciales
guardadas en el volumen de n8n quedan ilegibles.

## Dependencia de fuentes externas

El motor de scoring de riesgo (en n8n) confía en los datos de la GitHub
Advisory Database y del catálogo CISA KEV tal como los devuelven esas APIs, sin
validación adicional más allá de deduplicar y filtrar contra una whitelist de
activos internos. Un dato erróneo o desactualizado en esas fuentes se propaga
tal cual al sistema.

## Modelo de amenazas (STRIDE)

Aplicado a los componentes reales del sistema (ver
[`docs/architecture/01-system-overview.md`](docs/architecture/01-system-overview.md)):

| Categoría | Amenaza concreta en GEF Secure | Mitigación actual |
|---|---|---|
| **S**poofing | Alguien se hace pasar por n8n para inyectar hallazgos falsos vía `/api/webhook/*` | `X-Internal-Token` compartido (ver ADR-0007) — mitiga spoofing externo, no protege si el token se filtra |
| **T**ampering | Modificar un JWT para escalar de `AUDITOR` a `ADMIN` | Firma HMAC del JWT (`jwt.secret`) — un token no puede alterarse sin invalidar la firma |
| **R**epudiation | Un analista niega haber cerrado un hallazgo con un outcome VEX incorrecto | `StateTransition`/`RemediationCycle` append-only con actor y evidencia (ver ADR-0008) — da rastro, aunque no hay firma criptográfica del registro |
| **I**nformation disclosure | Un `ASSET_OWNER` lee vulnerabilidades de activos que no le pertenecen | Scoping vía `user_asset_assignments` (ver ADR-0006) — aplicado a nivel de query, no verificado exhaustivamente en todos los endpoints (ver `docs/deuda-tecnica.md`, DT-04) |
| **D**enial of service | Un cliente satura `/api/scan` o `/api/auth/login` con requests | **Sin mitigación implementada** — no hay rate limiting (ver `docs/deuda-tecnica.md`, DT-08) |
| **E**levation of privilege | Un usuario borrado o con rol cambiado sigue actuando con permisos viejos hasta que su JWT expira | Aceptado conscientemente como límite de alcance (ver ADR-0001) — no hay revocación |

Activos críticos: la base `security` (datos de vulnerabilidades/activos/usuarios)
y el `jwt.secret`/`N8N_ENCRYPTION_KEY` — si cualquiera de esos dos secretos se
filtra, compromete respectivamente la integridad de todos los tokens emitidos
o la legibilidad de las credenciales guardadas por n8n.

## Controles implementados

| Control | Estado |
|---|---|
| CORS | Configurado, orígenes restringidos vía `cors.allowed-origins` (`SecurityConfig.java`) |
| CSRF | Deshabilitado a propósito — API stateless autenticada por JWT, no por cookies de sesión, así que CSRF no aplica de la forma clásica |
| Hash de contraseñas | BCrypt |
| HTTPS/TLS | No terminado por la app — se asume un reverse proxy delante en cualquier despliegue real; no configurado en este repo |
| Rate limiting | **No implementado** (ver `docs/deuda-tecnica.md`, DT-08) |
| Headers de seguridad (CSP, HSTS, etc.) | **No configurados explícitamente** |
| Sanitización / validación de entradas | Vía Bean Validation (`@Valid` + DTOs) en los controllers |

## Gestión de vulnerabilidades del propio proyecto

Dato relevante para un proyecto que trata justamente sobre gestión de
vulnerabilidades: hoy **no se aplica a sí mismo** ninguna práctica automatizada.
No hay Dependabot, Snyk, ni SAST corriendo sobre este repositorio — el control
de dependencias es manual (ver `docs/deuda-tecnica.md`, DT-07). Es una
limitación reconocida, no un descuido oculto.

## Reporte de vulnerabilidades

GEF Secure todavía no tiene un canal formal de disclosure de seguridad ni un
programa de bug bounty. Si encontrás una vulnerabilidad, contactá directamente
al equipo — no hay SLA de respuesta comprometido en esta etapa.

## Ver también

- [Disponibilidad y recuperación](docs/architecture/07-disponibilidad-y-recuperacion.md)
- [Deuda técnica](docs/deuda-tecnica.md)
- [Glosario](docs/glosario.md)
