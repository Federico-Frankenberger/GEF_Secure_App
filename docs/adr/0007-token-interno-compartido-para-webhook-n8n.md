# 0007 — Token interno compartido para el webhook n8n → backend

## Status

Accepted

## Context

`WebhookController` expone tres endpoints (`/api/webhook/vulnerabilities`, `/api/webhook/scan-report`, `/api/webhook/error`) que n8n invoca para persistir los resultados de un escaneo, el reporte del scan y errores del pipeline. Este es tráfico servicio-a-servicio (n8n → backend), no tráfico de un usuario autenticado del frontend, por lo que el esquema JWT pensado para usuarios humanos (ver ADR-0001) no encaja naturalmente: n8n no tiene ni debería tener un usuario/rol de aplicación, y pedirle que gestione un flujo de login JWT solo para llamar a un webhook agrega complejidad sin beneficio real.

## Decision

Proteger estos endpoints con un header compartido `X-Internal-Token`, un secreto simétrico configurado tanto en el backend (`n8n.internal-token`) como en el workflow de n8n, en vez de JWT. Spring Security marca `/api/webhook/scan-report` específicamente como `permitAll` a nivel de filtro (la validación del token ocurre dentro del propio controlador/filtro dedicado), reservando el resto de las reglas de autenticación de usuario para el resto de la API.

## Consequences

**Positive**
- Simplicidad: un secreto de configuración por ambiente, sin flujo de autenticación, sin expiración que gestionar del lado de n8n.
- Deja claro en el propio modelo de seguridad que n8n es un colaborador de confianza interno, no un cliente equivalente a un usuario del frontend — evita forzar el modelo de roles de usuario sobre un caso que no lo es.

**Negative**
- El token no rota ni expira automáticamente — si se filtra, sigue siendo válido indefinidamente hasta que alguien lo cambie manualmente en ambos lados (backend y n8n) y redespliegue.
- Es un secreto compartido de "todo o nada": no distingue qué endpoint puede llamar cada consumidor ni lleva identidad de quién lo usó, a diferencia de un JWT que sí lleva claims. Si en el futuro más de un sistema externo necesitara llamar a estos webhooks, este esquema no escala bien sin volverse una lista de tokens por consumidor.
- Depende de que el valor configurado coincida exactamente en ambos sistemas (backend y n8n); un desajuste (ej. al rotar sin coordinar) corta silenciosamente la ingesta de resultados de escaneo hasta que se detecta.

## Alternatives Considered

- **JWT de servicio para n8n** (un token de larga vida emitido para una "cuenta de servicio" n8n): reutiliza la misma infraestructura de JWT que ya existe, pero agrega la necesidad de un usuario/rol especial solo para este caso y hereda el mismo problema de no-revocación que ADR-0001 ya acepta para usuarios humanos, sin ganar nada a cambio del token compartido más simple.
- **mTLS entre n8n y el backend**: da autenticación mutua fuerte a nivel de transporte, pero requiere gestión de certificados que excede la infraestructura actual (Docker Compose local/demo) para el beneficio marginal que aporta en este contexto.
- **IP allowlisting en vez de token**: frágil en un entorno Docker Compose donde los servicios se resuelven por nombre de red interna, no aporta una garantía adicional real sobre la red interna de Docker, y no protege si algún día el webhook se expone más allá de la red interna.

## Addendum (DT-05, docs/deuda-tecnica.md, 2026-08-23)

Se revisó si convenía agregar rotación/expiración automática (ej. HMAC con
ventana de tiempo) al token. Se descartó por la misma razón que ya rechazó
mTLS/JWT-de-servicio arriba: agrega complejidad de sincronización (relojes,
misma lógica de derivación en n8n y en el backend) sin un beneficio real para
el modelo de confianza actual (un único colaborador interno de confianza,
Docker Compose local/demo). En cambio, se formalizó lo que sí faltaba: un
procedimiento de **rotación manual** documentado y verificable, para que "si
se filtra, queda válido indefinidamente" (la consecuencia negativa aceptada
arriba) al menos no dependa de improvisar los pasos en el momento.

**Procedimiento de rotación manual**:

1. Generar un valor nuevo: `openssl rand -base64 32`.
2. Actualizar `N8N_INTERNAL_TOKEN` en `.env` (no versionado, editar directo en
   el servidor/entorno correspondiente).
3. Reiniciar los dos servicios que leen esa variable (ambos la necesitan
   igual, no hay downtime parcial tolerable):
   `docker compose up -d --force-recreate backend n8n`.
4. Verificar: disparar un escaneo manual desde la app y confirmar que
   `/api/webhook/scan-report` sigue completando el `ScanReport` (si el
   token quedó desalineado entre `n8n` y `backend`, esto falla de forma
   visible — ver la Sección "Negative" arriba, "corta silenciosamente la
   ingesta").

Sin cadencia automática definida (igual que DT-06, no hay todavía un
scheduler productivo real) — recomendado rotar ante cualquier sospecha de
filtración, y como buena práctica periódica una vez que el proyecto tenga un
entorno productivo real.
