# Contexto de continuidad — GEF Secure App

> Este archivo es para que lo pegues/menciones al arrancar la próxima sesión de Claude Code, así no se pierde el contexto de cómo veníamos trabajando. Está escrito pensando en un Claude que no tiene memoria de esta sesión — no asumas que ya sabe nada de lo de acá abajo.

## Dónde quedó el proyecto (2026-08-21)

Se corrieron **2 rondas completas de auditoría end-to-end** sobre el sistema de escaneo de vulnerabilidades, cada una con su plan de implementación:

1. `docs/20-08-26/AUDITORIA_END_TO_END.md` → `docs/20-08-26/PLAN_DE_IMPLEMENTACION.md` (8 fases)
2. `docs/20-08-26/AUDITORIA_END_TO_END_2.md` → `docs/20-08-26/PLAN_DE_IMPLEMENTACION_2.md` (10 fases)

Las **18 fases combinadas están implementadas, testeadas y verificadas en vivo** contra el stack real corriendo. Backend: 23 archivos de test / 170 tests, 0 fallas. Frontend: primer test runner (Vitest + Testing Library).

Una revisión estática adicional del workflow de n8n (después de varias ediciones con reversiones parciales) confirmó que el archivo quedó consistente, sin residuos.

**Conclusión a la que llegamos ayer/hoy:** la aplicación está en buen estado para lo que es hoy (proyecto de tesis/demo). El objetivo pasa a ser **mantenerla estable mientras se suman funcionalidades nuevas**, no seguir auditando por auditar.

### Lo que queda abierto a propósito (no son descuidos, están documentados)

- **N8N-05** (escapado de comillas simples en queries nativas de n8n): se intentó, rompió 3 veces en vivo un escaneo real con un error de sintaxis que no se pudo explicar del todo (mismo patrón de escape funciona en un nodo, no en otro). Se revirtió por seguridad. Riesgo real bajo (solo explotable con caracteres raros en nombres de paquete de GitHub Advisory). Ver Fase 9 de `PLAN_DE_IMPLEMENTACION_2.md`.
- **CVE-NULL**: dos advisories GHSA-only (sin CVE) sobre el mismo componente podrían colapsar en un solo `AssetVulnerability` (confirmado por lectura de código, nunca visto en datos reales). Ver Fase 10 del mismo plan.
- **DOCKER-01 / CFG-04 / CFG-02-03**: riesgos aceptados a propósito para el entorno de desarrollo/demo actual (pgAdmin y n8n expuestos, contraseña semilla en texto plano, `SecretsValidator` sin activar). Documentados en `docs/20-08-26/CHECKLIST_DESPLIEGUE.md` — revisar esa lista antes de cualquier despliegue fuera de la red local.
- **Sugerencia pendiente, no implementada**: un test de arquitectura (ArchUnit o similar) que falle el build si un endpoint nuevo relacionado a `Asset` no aplica el patrón de scope (`applyScope`) — este mismo tipo de bug se repitió 4 veces (Dashboard, Informes, Webhooks, ScanController) antes de cerrarse del todo. Vale la pena si se agregan más endpoints.

## Cómo veníamos trabajando (para que la próxima sesión no rompa el ritmo)

**Antes de tocar código:** siempre se arma un plan primero. El formato que funciona: una lista numerada en lenguaje simple, con una explicación corta de qué se va a hacer y por qué — **no** saltar directo a un modo de planificación formal sin antes ofrecer esa lista en criollo. Se espera aprobación explícita antes de empezar a implementar.

**Una vez aprobado el plan**, y si se pide explícitamente ("segui sin consultarme", "no me preguntes entre fases"), se ejecuta fase por fase de forma autónoma, con esta disciplina en cada fase que toque backend/n8n:

1. Entender el código actual antes de tocarlo (leer el archivo real, no asumir).
2. Implementar el cambio, con su test cuando corresponda (test que falla antes del fix, pasa después — no tests tautológicos).
3. Compilar (`./gradlew compileJava`/`compileTestJava`).
4. Correr el test nuevo puntual, después **el suite completo** (`./gradlew test`) — nunca asumir que un test nuevo alcanza.
5. Si toca backend: `docker compose build backend && docker compose up -d backend`, esperar healthcheck (`curl http://localhost:8081/actuator/health`).
6. Si toca n8n: editar `workflows/Pipeline de Gestión Automatizada de Vulnerabilidades (VMP).json` y `docker restart vuln_n8n` (el bootstrap detecta el cambio solo).
7. Si toca frontend: `npm run build && npm run test`, después `docker compose build frontend && docker compose up -d frontend`.
8. **Verificar en vivo, siempre** — login real contra `/api/auth/login`, curls contra los endpoints reales, `SELECT` de solo lectura contra Postgres, o Playwright si es algo visual. No dar nada por resuelto solo porque compila o el test unitario pasa.
9. Limpiar cualquier dato de prueba que se haya generado durante la verificación (usuarios de prueba, escaneos de prueba) — dejar la base como estaba, salvo el cambio real.
10. Actualizar el checklist del plan `.md` correspondiente marcando la fase `[x]`, con el detalle de qué se verificó.

**Si algo no sale como estaba planeado** (un fix que rompe algo, una hipótesis que resulta falsa): se documenta con honestidad en el propio plan, no se esconde ni se fuerza. Ejemplos reales de esta sesión: un hallazgo de auditoría que resultó ser falso (refutado con evidencia), un intento de fix que rompió un escaneo real 3 veces y se revirtió documentando por qué.

**No se inventan datos históricos.** Si una migración agrega una columna nueva y el usuario dice "dejalo en blanco", se deja `NULL` para las filas viejas — no se hace backfill con el valor actual disfrazado de histórico.

## Datos de acceso para verificar en vivo

Usuarios seed (`init/05-auth.sql`/`init/07-rbac-demo-users.sql`), todos con password `GefSecure2026!` (documentado como intencional para demo en `CHECKLIST_DESPLIEGUE.md`):

- `fede.frankenberger` — ADMIN
- `analyst.demo` — SECURITY_ANALYST
- `owner.demo` — ASSET_OWNER (para probar scope/IDOR)
- `auditor.demo` — AUDITOR

Servicios Docker: `vuln_postgres` (5433→5432), `vuln_n8n` (5678), `gef_backend` (8081→8080), `gef_frontend` (3000→80), `vuln_pgadmin` (8080→80).

Consultas a la base real: `docker exec -i vuln_postgres psql -U security_user -d security -c "..."` (app), `-d n8n` (estado interno de n8n — `execution_entity`, credenciales).

## Próximo paso

Mañana el usuario va a describir la(s) funcionalidad(es) nueva(s) a implementar. Seguir el mismo flujo: entender el pedido → proponer plan en lista simple → esperar aprobación → implementar con la disciplina de arriba (test → suite completo → rebuild/redeploy → verificación en vivo → limpieza → actualizar checklist).
