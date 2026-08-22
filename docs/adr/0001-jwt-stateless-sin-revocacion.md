# 0001 — JWT stateless sin lista de revocación

## Status

Accepted

## Context

El backend (`SecurityConfig`, `JwtAuthenticationFilter`, `JwtService`) necesitaba un mecanismo de autenticación para el frontend React. El sistema tiene cuatro roles (`ADMIN`, `SECURITY_ANALYST`, `ASSET_OWNER`, `AUDITOR`) y la autorización se resuelve en cada request vía `@PreAuthorize` en los controladores. La opción clásica de sesiones server-side (cookie + store de sesión en Postgres/Redis) exige mantener estado compartido entre instancias del backend y una tabla/cache adicional a invalidar en cada logout o cambio de rol.

Se optó en su lugar por JWT autocontenido: el token lleva usuario y rol firmados, con expiración fija (`jwt.expiration-minutes`, 480 minutos = 8hs por defecto, configurable por entorno), y el backend no consulta la base de datos ni ningún store adicional para validarlo en cada request — solo verifica la firma y la expiración.

## Decision

Usar JWT stateless: `JwtAuthenticationFilter` valida firma y expiración del token en cada request sin consultar la base de datos, y `BackendApplication` excluye explícitamente `UserDetailsServiceAutoConfiguration` porque no hay backing store de sesión. No existe lista de revocación ni tabla de tokens invalidados.

Consecuencia directa y aceptada conscientemente: un token emitido sigue siendo válido hasta que expira **aunque el usuario se borre o se le cambie el rol mientras tanto**. No hay logout real del lado del servidor — solo el frontend descarta el token de `localStorage`.

## Consequences

**Positive**
- Cero estado compartido entre instancias del backend: escala horizontalmente sin sticky sessions ni store de sesión centralizado.
- Autorización de cada request resuelta localmente (firma + claims), sin round-trip a la base de datos ni a un cache — path de request más simple y rápido.
- Menos superficie de infraestructura: no hace falta Redis ni una tabla de sesiones/tokens.

**Negative**
- Un usuario borrado o degradado de rol conserva acceso efectivo con su token vigente hasta por 8 horas (valor por defecto). No hay forma de forzar un logout remoto.
- El límite de exposición depende enteramente de `jwt.expiration-minutes`; subir ese valor para comodidad de UX amplía directamente la ventana de riesgo.
- Requiere disciplina operativa: si se sospecha un token comprometido, la única mitigación real disponible hoy es rotar `jwt.secret` (lo que invalida *todos* los tokens vigentes, no solo el comprometido).

## Alternatives Considered

- **Sesiones server-side (cookie + store en Postgres/Redis)**: permite revocación inmediata y granular, pero exige mantener y purgar una tabla/cache de sesiones y coordinar invalidación en cada instancia del backend. Descartado por la complejidad adicional frente al alcance del proyecto.
- **JWT con lista de revocación (denylist) en base de datos**: intermedio — mantiene el token stateless para el caso feliz pero agrega una consulta extra por request contra una tabla de tokens revocados. Quedó fuera de alcance para esta fase; es la mejora natural si se necesita revocación real en el futuro.
- **Refresh tokens de vida corta + access tokens de vida muy corta**: reduce la ventana de exposición sin necesitar denylist, a costa de más complejidad en el cliente (refresh flow) y en el backend (endpoint de refresh, rotación). No implementado.
