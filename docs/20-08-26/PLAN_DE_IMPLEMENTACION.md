# Plan de Implementación — Correcciones de la Auditoría End-to-End GEF Secure

## Contexto

`docs/20-08-26/AUDITORIA_END_TO_END.md` (auditoría de hoy, con dos pasadas de verificación en vivo) encontró 7 hallazgos críticos y una lista larga de altos/medios/bajos. El más urgente compromete el modelo de autorización por scope que el sistema dice implementar (un `ASSET_OWNER` puede ver datos de toda la organización en 3 lugares, y cualquier usuario autenticado puede inyectar hallazgos falsos vía un webhook sin proteger). El objetivo de este plan es convertir cada hallazgo del informe en una tarea concreta, ordenada por fases, para poder aprobarlas y ejecutarlas por partes.

**Decisiones ya confirmadas con el usuario:**
- Cobertura: las 8 fases completas (no solo crítico/alto).
- DB-05 (duplicados de `software_components`): dos versiones del mismo paquete en el mismo activo son **filas separadas**, no un upsert. El `UNIQUE` va sobre `(asset_id, software, ecosystem, version)`.
- DOCKER-01 (pgAdmin/n8n expuestos): **solo se documenta** como checklist de despliegue en esta ronda, no se crea `docker-compose.prod.yml` todavía.

**Regla de gobernanza aplicada:** las tareas de Fase 1 tocan autenticación/autorización — dominio CRÍTICO. Cada cambio de esa fase se implementa de a uno, con su propio test, y se muestra el diff antes de pasar al siguiente ítem de la fase (no se agrupan en un solo commit gigante).

---

## FASE 1 — Autorización (C1, C2, C3, C7)

### 1.1 — C1: proteger `/api/webhook/vulnerabilities` y `/api/webhook/error`
- **Archivo:** `backend/src/main/java/com/gef/gefsecureapp/controller/WebhookController.java`
- Aplicar el mismo guard que ya tiene `receiveScanReport` (línea 47-67): comparar `X-Internal-Token` contra `internalToken`, lanzar `InvalidCredentialsException` si no coincide.
- Antes de escribir el fix, confirmar con un `grep` rápido sobre `workflows/*.json` que ningún nodo de n8n llama hoy a estos dos endpoints (el análisis de hoy ya lo confirmó: n8n hace `INSERT` SQL directo) — si de verdad no los usa nadie, la alternativa más simple es **eliminarlos** en vez de protegerlos. Decisión a tomar en el momento con el diff a la vista.
- **Archivo:** `SecurityConfig.java` — no requiere cambios si se protege con token interno (ya cae en `anyRequest().authenticated()`); si en cambio se decide restringir por rol además del token, agregar `@PreAuthorize`.

### 1.2 — C3: scope del Dashboard
- **Archivos:** `DashboardController.java`, `DashboardService.java`
- Reusar el patrón `applyScope`/`assignedAssetIds` ya implementado en `AssetService.java`/`SoftwareComponentService.java` (mismo criterio: si `CurrentUser.isAssetOwner()`, filtrar por los activos asignados en `user_asset_assignments`).
- Cada query de `getStats()` (conteos, MTTR, tendencias) necesita una variante con `WHERE software_component_id IN (:scope)` condicional.

### 1.3 — C2: scope de `ReportController`/`ReportPdfService`
- **Archivos:** `ReportController.java`, `ReportPdfService.java`
- Resumen ejecutivo y ficha de CVE: filtrar `dashboardService.getStats()` y `assetVulnerabilityRepository.findTop10.../findByCveId...` por el mismo scope de 1.2.
- Informe de scan/comparativo: antes de generar el PDF, validar que el `ScanReport` pedido esté en el scope del usuario (mismo patrón `assertInScope` de `AssetService`) — hoy solo los hallazgos detallados están protegidos, la metadata no.

### 1.4 — C7: rol fail-closed
- **Archivos:** `UserDTO.java` (agregar `@Pattern(regexp = "ADMIN|SECURITY_ANALYST|ASSET_OWNER|AUDITOR")` en `role`), `CurrentUser.java` (evaluar invertir la lógica: en vez de "si no es exactamente ASSET_OWNER, ve todo", usar una lista explícita de roles sin restricción y tratar cualquier otro valor como el más restrictivo).

**Tests de la fase:** `WebhookControllerSecurityTest` (nuevo, `MockMvc` con los 4 roles), ampliar `ReportPdfServiceTest` con casos `ASSET_OWNER`, `DashboardServiceTest` nuevo con scope, test de `UserService.create()` con un rol inválido.

**Verificación end-to-end:** login como `ASSET_OWNER` sin activos asignados (o crear uno de prueba) y confirmar `403`/vacío contra los 3 endpoints tocados; limpiar cualquier usuario de prueba creado para la verificación.

---

## FASE 2 — Visibilidad de escaneos colgados (C5)

- **Archivo:** `backend/src/main/java/com/gef/gefsecureapp/repository/ScanReportRepository.java`
- `findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc` (línea 23): convertir a `@Query` con `ORDER BY r.executedAt DESC NULLS LAST` (Spring Data derived query no soporta esto, hay que pasarla a `@Query` explícito).
- `search()` (línea ~39): agregar `NULLS LAST` al `ORDER BY r.executed_at DESC` ya existente.
- Mismo patrón que ya se usó ayer para `findFirstByExecutedAtNotNullOrderByExecutedAtDesc` del Dashboard — es la tercera vez que se repite este bug, vale la pena dejar un comentario en el código explicando por qué todas las queries de "más reciente" de esta tabla necesitan este tratamiento.

**Tests:** primer `@DataJpaTest` del proyecto — insertar un `RUNNING`/`executedAt=null` viejo y un `COMPLETED` nuevo del mismo target, confirmar que ambas queries devuelven el nuevo.

---

## FASE 3 — Integridad de datos (DB-02, DB-05, A2/DB-06, C6)

### 3.1 — DB-02: quitar el CASCADE heredado
- **Archivo nuevo:** `init/15-fix-audit-cascade.sql`
```sql
ALTER TABLE public.vulnerabilities_audit DROP CONSTRAINT fk_audit_asset;
ALTER TABLE public.vulnerabilities_audit ADD CONSTRAINT fk_audit_asset
    FOREIGN KEY (asset_id) REFERENCES public.software_components(id);
```
- Verificar en vivo después: `SELECT confdeltype FROM pg_constraint WHERE conname='fk_audit_asset'` debe dar `a` (NO ACTION), no `c`.

### 3.2 — DB-05: `UNIQUE` en `software_components` + unificar criterio de dedup
- **Archivo nuevo:** `init/16-unique-component-per-asset.sql`
```sql
CREATE UNIQUE INDEX unique_component_per_asset ON public.software_components
    (asset_id, software, ecosystem, version) WHERE deleted_at IS NULL;
```
- Antes de aplicarlo: correr la query de detección de duplicados del informe (§DB-05) contra la base real y resolver a mano cualquier duplicado existente (no se encontró ninguno en la verificación de hoy, pero hay que confirmarlo de nuevo al momento de aplicar esta fase).
- **Archivo:** `backend/.../service/InventoryService.java` — el lookup de dedup para SBOM (`findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull`) necesita agregar `AndVersion` para quedar alineado con la decisión tomada (dos versiones = dos filas) y con el nuevo `UNIQUE`.
- **Archivo:** `backend/.../service/SoftwareComponentService.java` (líneas 66-77) — simplificar el chequeo de duplicados para comparar por `asset_id` (no por todo el `environment`) + `software` + `ecosystem` + `version`, dejando que el `UNIQUE` de base sea la defensa real contra la condición de carrera (hoy es SELECT-then-INSERT sin lock); capturar la excepción de constraint violada y traducirla a `ConflictException` con un mensaje claro.

### 3.3 — A2/DB-06: EAGER → LAZY + batching
- **Archivos:** `SoftwareComponent.java:43`, `AssetVulnerability.java:29`, `VulnerabilityAudit.java:26` — cambiar `FetchType.EAGER` a `LAZY`.
- Revisar cada lugar que hoy asume el dato ya cargado (listados del Kanban, `ReportPdfService`) y agregar `@EntityGraph` o un `JOIN FETCH` explícito en el repositorio correspondiente donde haga falta.
- **Archivo:** `VulnerabilityAuditService.applyLifecycle()` (líneas 242-307) — reemplazar el `findBySoftwareComponent_IdAndCveId` dentro del loop por una carga batch (`findBySoftwareComponent_IdInAndCveIdIn` o equivalente) antes del loop.

### 3.4 — C6: `GlobalExceptionHandler` no debe exponer detalle interno
- **Archivo:** `GlobalExceptionHandler.java`
- Agregar `@ExceptionHandler(DataIntegrityViolationException.class)` → 409 con mensaje genérico ("El registro ya existe o viola una regla de integridad").
- Agregar `@ExceptionHandler(MaxUploadSizeExceededException.class)` → 413.
- Cambiar el catch-all (`handleGeneric`) para devolver un mensaje fijo ("Error interno del servidor") en el body, sin `ex.getMessage()`; el detalle sigue yendo al log server-side como hoy.

**Tests:** test de concurrencia (2 hilos) creando el mismo componente simultáneamente — confirma DB-05 + valida que el nuevo handler de C6 devuelve 409 limpio en vez de 500 con detalle interno.

---

## FASE 4 — Motor de escaneo n8n (N8N-01, N8N-02)

**Archivo:** `workflows/Pipeline de Gestión Automatizada de Vulnerabilidades (VMP).json` — mismo archivo tocado y verificado en vivo hoy; se sigue el mismo protocolo (editar → `docker restart vuln_n8n` → re-disparar los 4 alcances → confirmar contra la base real, sin dejar datos de prueba sueltos al terminar).

### 4.1 — N8N-01: `Fetch_CISA_KEV`
- Decisión simple a tomar en el momento: eliminar el nodo (si de verdad no aporta nada) o conectarlo para enriquecer el `action_plan` con más fuentes. Dado que `Risk_Assessment_Engine` ya usa `$('Fetch_CISA_KEV')` para el match de CISA KEV (confirmado en el propio JSON), **no se elimina** — el nodo sí se usa, solo que su *salida por conexión* está desconectada; el consumo es por referencia (`$('Fetch_CISA_KEV').first().json`), no por la conexión del grafo. Este ítem se reclasifica: no es código muerto, es una lectura por referencia legítima. Se cierra sin cambios, documentando la corrección en el propio informe.

### 4.2 — N8N-02: capturar rate-limit de GitHub explícitamente
- Nodo IF nuevo después de `Fetch_GitHub_Advisories`: si el item tiene `$json.error`, enrutarlo a una rama que lo acumule (en vez de que `Extract_Advisory_Items` lo descarte en silencio).
- Sumar esos paquetes "no evaluados" al `reportMessage`/`systemStatus` que arma `Compute_Audit_Metrics`, para que el escaneo se reporte como parcial en vez de completo cuando esto pase.

**Verificación:** re-disparar los 4 alcances (mismo protocolo de hoy). Simular rate-limit es difícil sin agotar el límite real de GitHub — como mínimo, confirmar con datos reales que el camino feliz sigue funcionando idéntico a hoy (mismos conteos: contao 16, ENTORNO 27, GLOBAL ~177) y dejar documentado que el camino de error no se pudo probar en vivo sin gastar el rate limit real.

---

## FASE 5 — Frontend

Todos en `frontend/src/`, riesgo bajo, sin tocar backend.

| Ítem | Archivo | Cambio |
|---|---|---|
| FE-06 | `pages/Assets.tsx` | Usar `state` de `useScanPolling` (no solo `start`) para gatear el botón de escaneo por componente durante toda la ventana de polling, igual que ya hace `Scans.tsx` |
| FE-13 | `components/Sidebar.tsx`, `App.tsx` | Restringir el link/ruta de "Informes" a `ADMIN`/`SECURITY_ANALYST` (complementa el fix de backend C2, no lo reemplaza) |
| FE-01 | `hooks/useScanPolling.ts` | `useEffect` de cleanup del `setTimeout` al desmontar |
| FE-02 | `services/api.ts` | Antes del `window.location.href='/login'` en el interceptor 401, guardar una bandera (`sessionStorage`) que `Login.tsx` lea para mostrar "tu sesión expiró" |
| FE-07 | `pages/Assets.tsx` | Validar `!assetForm.name.trim()` en el botón "Guardar" de Activo, igual que el resto de los formularios |
| FE-09 | `pages/Assets.tsx` | Hint de formato esperado por ecosistema cuando `catalogFallback` está activo |
| FE-10 | `pages/Scans.tsx` | Setear `resultMode` apenas se dispara el escaneo (no recién en `onDone`), mensaje distinto para "corriendo" vs "timeout" vs "nunca se disparó" |
| FE-12 | `components/Modal.tsx` | Mover el `if (!open) return null` antes del `useEffect`, o condicionar el `addEventListener` dentro del efecto a `open` |

**Tests:** primer test runner de frontend (Vitest + Testing Library) con al menos un test sobre FE-06 (doble click no dispara doble `triggerScan`).

---

## FASE 6 — Configuración y Docker

| Ítem | Archivo | Cambio |
|---|---|---|
| A3/CFG-02/CFG-03 | `application.properties` | Quitar el fallback fijo de `jwt.secret`/`n8n.internal-token`; fail-fast al arrancar si no están seteados y el perfil no es `dev` |
| CFG-05 | `frontend/nginx.conf` | Agregar `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, CSP básica |
| CFG-06 | `SecurityConfig.java` | `/actuator/**` → solo `health`/`info` públicos, el resto `hasRole("ADMIN")`; deshabilitar swagger en perfil prod |
| DOCKER-03 | `frontend/.dockerignore`, `backend/.dockerignore` (nuevos) | `node_modules`, `dist`, `.git`, `.gradle`, `build/` |
| CFG-01 | `.gitignore` | Agregar `.gradle/` (sin hacer `git rm --cached` todavía — eso reescribe historial de tracking y se confirma aparte) |
| DOCKER-01 | *(documentación, no código)* | Agregar sección al checklist de despliegue: pgAdmin/n8n deben quedar detrás de VPN/túnel en producción — **sin tocar `docker-compose.yml` en esta ronda**, según lo decidido |
| CFG-04 | *(sin cambios)* | Contraseña de seed en texto plano: se deja como está, es intencional para el entorno demo — se documenta el riesgo en el mismo checklist de despliegue, no se cambia código |

---

## FASE 7 — Testing

Lista consolidada (ya distribuida por fase arriba, se agrupa acá para trazabilidad):
1. `WebhookControllerSecurityTest` (Fase 1)
2. `ReportPdfServiceTest` ampliado + `DashboardServiceTest` nuevo (Fase 1)
3. `ScanReportRepositoryTest` (`@DataJpaTest`, Fase 2)
4. Test de concurrencia sobre `applyLifecycle()`/alta de componente (Fase 3)
5. Primer test de frontend, Vitest + Testing Library (Fase 5)

---

## FASE 8 — Rendimiento y normalización (menor prioridad)

| Ítem | Archivo | Cambio |
|---|---|---|
| DB-04 | `init/17-add-missing-indexes.sql` (nuevo) | Índices en `scan_reports.{target_name,status,executed_at}`, `software_components.{ecosystem,asset_id}` y las FK sin índice listadas en el informe |
| DB-01 | *(documentación)* | Registrar en el checklist qué scripts de `init/` no son idempotentes (`00`, `02`, `09`); evaluar Flyway en un plan aparte si se decide adoptarlo |
| M1 | `PurlParser.java:76-78` | Reemplazar `URLDecoder` por percent-decoding puro |
| M2 | `VulnerabilityAuditRepository.java` | Agregar `deleted_at IS NULL` a las 3 queries nativas `findBy*ScanWindow` |
| M3 | `EnvironmentController.java`, `AssetTypeController.java`, `EcosystemController.java` | DTO + `@Valid` en vez de bindear la entidad JPA directo |
| M4 | `GhsaAdvisoryService.java` | TTL de cache (re-fetch si `fetchedAt` > 30 días) |
| M5 | `InventoryService.java` | Dedup de `purl` repetidos dentro del mismo SBOM en modo preview |
| FE-03 | `services/api.ts` | Timeout específico (30s+) para los 4 endpoints de `reportApi` |
| FE-04 | `components/SoftwareAutocomplete.tsx` | Distinguir error de red de "sin resultados" |
| FE-05 | `contexts/AuthContext.tsx` | Derivar `isAuthenticated` solo de `gef_token` |
| FE-08 | `pages/Assets.tsx` | Validar tamaño de SBOM en cliente antes de subir |
| FE-11 | `pages/Kanban.tsx:303-306` | Allowlist de esquema `https?://` en `href` de referencias GHSA |

---

## Orden de ejecución sugerido

```
Fase 1 (autorización) → Fase 2 (visibilidad de escaneos) → Fase 3 (integridad de datos)
   → Fase 4 (n8n) → Fase 5 (frontend) → Fase 6 (config/Docker) → Fase 7 (tests, en paralelo con 1-6)
   → Fase 8 (rendimiento/normalización, cuando haya tiempo)
```
Cada fase se aprueba y ejecuta por separado — no hace falta terminar todas en una sola sesión. Fase 1 es la única con la restricción de "un cambio a la vez, con test y diff visible antes del siguiente" por tocar autenticación/autorización.

## Verificación end-to-end (aplica a cada fase que toque backend/n8n)

Mismo protocolo ya usado hoy: `docker compose build <servicio>` + `docker compose up -d <servicio>` (o `docker restart vuln_n8n` para el workflow), login real contra `/api/auth/login`, disparar la acción real vía el endpoint autenticado (no atajos de base de datos salvo para verificar estado), confirmar en la base con `SELECT` de solo lectura, y limpiar cualquier dato de prueba creado durante la verificación.

## Estado de avance

- [x] Fase 1 — Autorización (C1, C2, C3, C7) — completada y verificada en vivo el 2026-08-20
- [x] Fase 2 — Visibilidad de escaneos colgados (C5) — completada y verificada en vivo el 2026-08-20
- [x] Fase 3 — Integridad de datos (DB-02, DB-05, A2/DB-06, C6) — completada y verificada en vivo el 2026-08-20
- [x] Fase 4 — Motor de escaneo n8n (N8N-02 implementado, N8N-01 cerrado sin cambios) + fix no planificado de un deadlock real de concurrencia (N8N-03) encontrado en vivo — completada el 2026-08-20
- [x] Fase 5 — Frontend (FE-06, FE-13, FE-01, FE-02, FE-07, FE-09, FE-10, FE-12) — completada el 2026-08-20
- [x] Fase 6 — Configuración y Docker — completada y verificada en navegador real (Playwright) el 2026-08-20
- [x] Fase 7 — Testing (los 5 tests de backend ya quedaron en las fases 1-3; se sumó Vitest + Testing Library como primer test runner de frontend, con el test de FE-06 verificado contra-y-a-favor del fix) — completada el 2026-08-20
- [x] Fase 8 — Rendimiento y normalización (DB-04, DB-01 documentado, M1-M5, FE-03/04/05/08/11) — completada y verificada en vivo el 2026-08-20
