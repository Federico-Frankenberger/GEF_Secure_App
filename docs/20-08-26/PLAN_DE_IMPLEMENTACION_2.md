# Plan de Implementación 2 — Correcciones de la 2ª Auditoría End-to-End GEF Secure

## Contexto

`docs/20-08-26/AUDITORIA_END_TO_END_2.md` (2ª corrida, verificada en vivo con JWT reales de los 4 roles, `git diff`, `gradlew test --rerun`, `npm run build/test`) confirmó que las 8 fases del `PLAN_DE_IMPLEMENTACION.md` original cerraron correctamente C1/C2/C3/C5/C6/C7 y la integridad de datos (CASCADE, UNIQUE, índices). Pero encontró hallazgos nuevos que ese plan no cubrió — el más urgente es una fuga de scope idéntica a las ya cerradas, en un cuarto endpoint que nadie miró (`ScanController`).

Este plan convierte el §25 del informe (10 fases propuestas) en tareas concretas, con una fase menos: **se descarta la Fase 6 original (activar `SPRING_PROFILES_ACTIVE=prod`)** porque el `SecretsValidator` ya está correctamente implementado y el gap real es solo de despliegue, ya documentado en `CHECKLIST_DESPLIEGUE.md` — forzarlo en el `docker-compose.yml` de desarrollo rompería el entorno de trabajo actual sin ningún beneficio real. Se deja como riesgo aceptado y documentado, mismo tratamiento que DOCKER-01/CFG-04.

**Regla de gobernanza aplicada:** la Fase 1 toca autorización (scope de `ScanController`) — dominio CRÍTICO. Se implementa con test y diff mostrado antes de pasar a la fase siguiente (ya completada al momento de escribir este documento).

---

## FASE 1 — Cerrar la fuga de A1 (scope de `ScanController`) ✅ COMPLETADA

- **Archivos:** `ScanController.java` (`latestReport`, `history`), `ScanReportRepository.java` (`searchInScope`, `resolveAssetId`).
- Mismo patrón `applyScope`/`assertScanInScope` ya usado en `DashboardService`/`ReportPdfService`/`VulnerabilityAuditService`.
- **Detalle no anticipado por el plan, encontrado durante la implementación:** `scan.getSoftwareComponent().getAsset()` tira `LazyInitializationException` en vivo, porque `ScanController` no tiene `@Transactional` (ningún controller del proyecto lo usa) y `SoftwareComponent.asset` es `LAZY` desde la Fase 3 original (A2/DB-06). Se resolvió con `resolveAssetId(scanId)`, una query nativa liviana que resuelve el `asset_id` relevante sin tocar la relación LAZY — no se detectó en los tests unitarios (mocks, sin sesión real de Hibernate), solo en la verificación en vivo.
- **Tests:** `ScanControllerTest.java` (nuevo, 7 casos: ADMIN sin scope, `ASSET_OWNER` dentro/fuera de scope en `latestReport`, escaneo GLOBAL sin activo único, `history()` con/sin scope, `ASSET_OWNER` sin activos asignados no genera un `IN ()` vacío contra la base).
- **Verificado en vivo:** `owner.demo` pasó de ver 88 escaneos a ver solo el propio; `/scan-reports/latest` de un activo ajeno → `204`; del mismo activo con `fede.frankenberger` (ADMIN) → `200`; `/latest` de un escaneo `GLOBAL` para `owner.demo` → `204` (sin activo único, fuera de scope por diseño).

---

## FASE 2 — Snapshot histórico de auditoría (A-NUEVO-1) ✅ COMPLETADA

- **Decisión del usuario:** dejar en blanco (`NULL`) el snapshot de los hallazgos ya existentes — no fabricar un dato histórico que ya se perdió.
- **Archivos:** `init/18-audit-snapshot-columns.sql` (nuevo, columnas `software`/`ecosystem`/`version` en `vulnerabilities_audit`, sin backfill), `VulnerabilityAudit.java` (campos nuevos), `VulnerabilityAuditMapper.java` (`toResponse(VulnerabilityAudit)` lee el snapshot propio de la fila, no más `entity.getSoftwareComponent().getX()`), `VulnerabilityAuditService.create()` (puebla el snapshot al crear, único momento real de detección para ese camino), workflow de n8n (`Persist_Audit_Findings` ahora inserta `software`/`ecosystem`/`version` desde `Risk_Assessment_Engine` — que ya traía esos datos en su output, solo faltaba persistirlos — con escapado de comillas simples).
- **Alcance deliberado:** solo se congela `VulnerabilityAudit` (hallazgo puntual ligado a un `scan_id`, lo que alimenta Historial/Informes PDF). `AssetVulnerability` (la fuente del Kanban, "qué está abierto hoy") sigue derivando en vivo a propósito — es un caso activo en seguimiento, no un registro histórico, y mostrar la versión actual instalada es lo correcto para un analista triando el caso hoy.
- **Tests:** `VulnerabilityAuditMapperTest` (snapshot se usa aunque el componente haya cambiado de versión; fila legacy con snapshot `NULL` devuelve `null`, no inventa el dato actual), `VulnerabilityAuditServiceTest` (`create()` congela `software`/`ecosystem`/`version` del componente al momento de la detección).
- **Verificado en vivo:** migración aplicada contra la base real (3076 filas preexistentes con `software IS NULL`, confirmado). Escaneo `GLOBAL` real disparado (`SCN-2026-000177`, 133 hallazgos, snapshot poblado en el 100%). Regresión probada de punta a punta: se actualizó `software_components.id=2` (`express`) de `4.18.2` a `9.9.9` vía la API real, y el hallazgo histórico `CVE-2024-29041` del escaneo 177 siguió mostrando `installedVersion: 4.18.2` — el componente se restauró a su valor original al terminar la prueba.

## FASE 3 — Validación de formato Maven (normalización) ✅ COMPLETADA

- **Archivos:** `validation/ValidSoftwareCoordinate.java` + `SoftwareCoordinateFormatValidator.java` (nuevos, constraint a nivel de clase), `SoftwareComponentDTO.Request` (anotado). Solo aplica al alta manual (controller, vía `@Valid`) — el camino de SBOM (`InventoryService`/`PurlParser`) ya produce coordenadas bien formadas por construcción, confirmado por la propia auditoría.
- **Tests:** `SoftwareComponentDTOTest` (6 casos: maven/composer rechazan sin separador, aceptan bien formado; npm y un ecosistema desconocido no se restringen).
- **Verificado en vivo:** `POST /api/software-components` con `ecosystem=maven, software=spring-boot-starter-web` → `400` con mensaje claro en `software`; mismo para `composer, software=contao`; `npm` sin restricción de formato (pasa la validación, sigue de largo hasta el 404 esperado por `assetId` inexistente).

## FASE 4 — Ecosistema fuera de catálogo (ECO-CATALOGO) ✅ COMPLETADA

- **Causa raíz real encontrada:** `PurlParser.ECOSYSTEM_BY_PURL_TYPE` mapeaba `cargo` (tipo de purl de Rust) a `"rust"` — un typo real, "rust" nunca estuvo en `public.ecosystems` (es `"cargo"`). Corregido. `docker`/`oci` (imágenes de contenedor) se sacaron del mapa directamente — no existe ecosistema equivalente en GitHub Advisory ni en el catálogo, así que ahora un purl de imagen da `NO_RECONOCIDO` en vez de persistir un ecosystem que nunca matchea.
- **Defensa en profundidad:** `SoftwareComponentService.normalize()` (punto único usado por `create()`/`update()`) ahora rechaza cualquier `ecosystem` que no exista en `public.ecosystems` (`EcosystemRepository.existsByNameIgnoreCase`) con `InvalidEcosystemException` → `400`. `InventoryService` atrapa esa excepción igual que ya atrapaba `ConflictException`, marcando el ítem `ERROR` sin abortar el resto del batch (en la práctica no debería dispararse desde SBOM ya que `PurlParser` solo produce ecosystems válidos, pero queda como red de seguridad).
- **Archivos:** `PurlParser.java`, `SoftwareComponentService.java`, `EcosystemRepository.java` (+`existsByNameIgnoreCase`), `InventoryService.java`, `InvalidEcosystemException.java` (nuevo), `GlobalExceptionHandler.java`.
- **Los 2 componentes ya cargados** (`id=6` ecosystem `docker`, `id=33` ecosystem `rust`) se dejan como están — no se backfillean a la fuerza en esta fase, quedan documentados como dato preexistente.
- **Tests:** `SoftwareComponentDTOTest` no aplica acá (eso fue Fase 3); `SoftwareComponentServiceTest` (2 casos nuevos: `create()`/`update()` rechazan ecosystem fuera de catálogo), `PurlParserTest` actualizado (cargo→cargo, no rust; docker/oci → vacío).
- **Verificado en vivo:** `POST /api/software-components` con `ecosystem=docker` → `400` con mensaje claro; `ecosystem=cargo` (ahora sí en catálogo) pasa la validación y sigue de largo hasta el 404 esperado por `assetId` inexistente.

## FASE 5 — Rate-limit de GitHub más honesto (N8N-02) ✅ COMPLETADA

- **Diseño:** nodo nuevo `Mark_Advisory_Fetch_Error` (Code) cuelga de la misma rama de error de `Check_Advisory_Fetch_Error` que ya alimentaba `Log_Advisory_Fetch_Error` (en paralelo, no en reemplazo — el log a `system_errors` se mantiene igual) y marca el item con `advisory_fetch_error: true`. Se conecta como 3ª entrada de `Consolidate_Audit_Results` (merge reconfigurado a `numberInputs: 3`), para que estos items lleguen a `Compute_Audit_Metrics` en vez de desaparecer del flujo de datos como pasaba antes.
- `Compute_Audit_Metrics` ahora cuenta un contador `no_evaluados` separado de `auditados`/`ignorados`, y `status_sistema` reporta `"⚠️ PARCIAL (GitHub Advisory falló)"` en vez de `"✅ ESTABLE"` cuando `no_evaluados > 0` (a menos que también haya críticos, que sigue ganando). El efecto colateral bueno: si **todos** los paquetes fallan (rate-limit total), antes cero items llegaban a `Compute_Audit_Metrics` y cayía al fallback ("0 vulnerabilidades, ESTABLE" — el bug exacto); ahora los items marcados error sí llegan, así que ni siquiera necesita el fallback para reportar correctamente que el escaneo fue parcial.
- **Archivo:** workflow JSON de n8n (`Mark_Advisory_Fetch_Error` nuevo, `Consolidate_Audit_Results`, `Compute_Audit_Metrics`).
- **Verificado:** lógica nueva de `Compute_Audit_Metrics` probada de forma aislada con Node (`new Function(...)`) contra 5 escenarios simulados (rate-limit total, mezcla, camino feliz sin críticos, crítico+error, vacío) — todos con el resultado esperado. n8n recargó el workflow sin errores de importación. Escaneo `GLOBAL` real disparado post-cambio (`SCN-2026-000188`): mismos conteos y formato de mensaje que antes (177/133/44/11 críticos, `"⚠️ ACCIÓN REQUERIDA"`, sin sufijo de error) — sin regresión en el camino feliz. **No se forzó un rate-limit real de GitHub en vivo** (mismo motivo que ambas auditorías: costoso de reproducir sin agotar el límite real del token compartido) — el camino de error queda verificado por simulación aislada, no por reproducción end-to-end contra la API real.

## FASE 6 — Guarda de backend contra doble disparo de escaneo (A-NUEVO-2) ✅ COMPLETADA

- **Archivos:** `ScanReportRepository.existsByTargetTypeAndTargetNameAndStatus` (nuevo), `ScanService.start()` (rechaza con `ConflictException` → `409` si ya hay un `RUNNING` para el mismo target, antes de resolver usuario/componente/entorno/activo).
- **Tests:** `ScanServiceTest` (2 casos nuevos: rechaza segundo disparo sobre el mismo target en RUNNING; permite un disparo nuevo cuando no hay ninguno corriendo).
- **Verificado en vivo:** 1er `POST /api/scan` → `202`; 2do disparo inmediato → `409` ("Ya hay un escaneo en curso para GLOBAL/TODOS"); el primer escaneo completó normalmente (`SCN-2026-000194`, `COMPLETED`).

## FASE 7 — Estado real visible en el Historial (M-NUEVO-1) ✅ COMPLETADA

- **Archivos:** `ScanReportDTO.java` (+`status`/`errorMessage`), `frontend/src/types/index.ts` (+campos), `Scans.tsx` (columna nueva "Resultado" con badge por estado real + tooltip con `errorMessage` — no reemplaza la columna "Estado" existente de `systemStatus`, la complementa).
- **Tests:** `ScanReportDTOTest` (nuevo: `from()` expone `status`/`errorMessage` reales; un `COMPLETED` normal no trae `errorMessage`).
- **Verificado en vivo:** `GET /api/scan-reports` devuelve `status`/`errorMessage` reales — confirmados los 5 `FAILED` + 1 `PARTIALLY_COMPLETED` preexistentes con su mensaje completo, antes invisibles desde la API/UI. Screenshot del Historial confirma la columna "Resultado" renderizando los badges.

## FASE 8 — Prevención del deadlock (cierre de N8N-03) ✅ COMPLETADA

- **Diseño elegido, distinto del sugerido por el informe:** ni `@Lock(PESSIMISTIC_WRITE)` ni `@Version` — la causa real del deadlock es que dos transacciones concurrentes (dos escaneos con alcance solapado) actualizan las mismas filas de `asset_vulnerabilities` en un **orden distinto cada una** (el orden de los hallazgos de cada escaneo, no un orden global), el patrón textbook que produce un deadlock de lock-ordering en Postgres. `@Version` no lo previene (solo detecta un lost-update después del hecho; el lock sigue tomándose en el mismo orden problemático); un lock pesimista lo evita a costa de serializar innecesariamente escaneos que NO se solapan. La solución real es ordenar deterministamente: `applyLifecycle()` ahora procesa tanto los hallazgos nuevos como el barrido de auto-resolución ordenados por `(software_component_id, cve_id)` — si todas las transacciones siempre intentan tomar los locks en el mismo orden global, el ciclo que produce el deadlock no puede formarse.
- **Archivos:** `VulnerabilityAuditService.applyLifecycle()`.
- **Tests:** `VulnerabilityAuditServiceTest` (nuevo: alimenta los hallazgos en orden de llegada deliberadamente desordenado — componente 200, 100, 150 — y confirma que los `save()` ocurren en orden 100→150→200).
- **Verificado en vivo:** se reprodujo el escenario real (un escaneo `ACTIVO` sobre un componente + un escaneo `GLOBAL` que incluye ese mismo componente, disparados casi simultáneamente). Ambos completaron en 2 y 4 segundos respectivamente (antes: 8m21s en el incidente real de la 2ª auditoría) y el conteo de deadlocks en `system_errors` se mantuvo igual (1, sin ninguno nuevo). No es una prueba exhaustiva de que el deadlock nunca pueda repetirse bajo cualquier timing posible, pero confirma que el fix funciona para el escenario real que lo produjo.

## FASE 9 — Filtro `deleted_at` en n8n (N8N-06) ✅ COMPLETADA (parcial respecto del objetivo original — ver nota)

- **`Check_Internal_Assets`:** agregado `sc.deleted_at IS NULL AND a.deleted_at IS NULL` (mismo criterio que M2 ya aplicó del lado backend). Esta parte quedó **confirmada en vivo, funcionando**.
- **Objetivo de escapado de comillas (N8N-05) — intentado, revertido tras 3 fallos reales en vivo:** se intentó agregar `.replace(/'/g, "''")` a `package.name`/`package.ecosystem` en `Check_Internal_Assets`, y por consistencia también a `Log_Ignored_Vulnerabilities`, `Log_System_Failure` y los filtros de `Get_Installed_Packages`. Cada intento (incluso uno que copiaba **exactamente** la sintaxis ya probada y funcionando de `Sync_Software_Catalog`) rompió un escaneo real en vivo con `"Syntax error at line 2 near sc"` en `Check_Internal_Assets` — un escaneo real quedó colgado ~3 minutos cada vez hasta detectarlo, y se marcó `FAILED` manualmente con el detalle. No se llegó a identificar la causa raíz exacta de por qué el mismo patrón de escape funciona en `Sync_Software_Catalog` pero no en `Check_Internal_Assets` (mismo dato de entrada, misma sintaxis) — probarlo a fondo requeriría acceso al editor de n8n para inspeccionar la evaluación de la expresión paso a paso, fuera del alcance de esta sesión.
- **Decisión tomada dado el riesgo demostrado:** revertir todo el escapado de comillas a su forma original (sin escapar) en los 4 nodos, y quedarse solo con el fix de `deleted_at` (que sí se probó exhaustivamente en vivo, 3 escaneos `GLOBAL` reales consecutivos, 177 hallazgos cada uno, sin ningún error). El riesgo de SQL injection que motivó N8N-05 sigue abierto para una corrida futura, con más tiempo para debuggear el editor de n8n directamente en vez de por prueba y error contra JSON crudo.
- **Verificado en vivo:** 4 corridas reales durante la implementación (2 fallidas por el escape, 2 exitosas con `deleted_at` solo) — todas documentadas en `system_errors` y en los `scan_reports` marcados `FAILED` con el detalle del incidente.

## FASE 10 — Pulido menor ✅ COMPLETADA

- **DASH-NUEVO — corregido:** `DashboardService.getStats()` contaba `software_components` (143) en vez de `assets` reales. Ahora usa `AssetRepository.countByDeletedAtIsNull()`/`countByIdInAndDeletedAtIsNull(scope)`. **Verificado en vivo:** `totalAssets` pasó a `8` (coincide exactamente con `SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL` contra la base real — el número bajó de 18 a 8 desde la 2ª auditoría por bajas de activos de prueba en el medio, no por un bug). Tests: `DashboardServiceTest` actualizado (3 casos).
- **M-NUEVO-2 — corregido:** `ScanService.complete()` ahora es un no-op si el scan ya no está `RUNNING` (protege contra un callback duplicado de n8n reintentando). Test nuevo: `complete()` sobre un scan `COMPLETED` no llama a `save()` ni a `applyLifecycle()`.
- **CVE-NULL — investigado, documentado, sin fix de código en esta ronda:** confirmado por lectura de código (no reproducido en vivo) que `Persist_Audit_Findings` usa `cve_id || 'N/A'` como fallback — nunca viola el `NOT NULL`, pero **dos advisories GHSA-only distintas sobre el mismo componente colapsan en un solo `AssetVulnerability`** (la clave de dedup en `applyLifecycle()` es literalmente el string `"N/A"`, no algo que distinga una GHSA de otra). No se encontró ningún caso real de esto en los datos actuales. Arreglarlo bien requiere cambiar la clave de dedup a `COALESCE(cve_id, ghsa_id)` en el modelo/mapper/n8n — más invasivo que lo que corresponde a un "pulido menor"; queda documentado para una fase propia si alguna vez se observa en la práctica.
- **B-NUEVO-1 — corregido:** `location /static/` de `nginx.conf` ahora repite `Referrer-Policy` y `Content-Security-Policy` además de los headers que ya tenía. Verificado en vivo con `curl -I` contra un bundle real.
- **B-NUEVO-2 — REFUTADO, no era un bug real:** la 2ª auditoría probó `/v3/api-docs` (el path default de springdoc) y lo comparó contra `/swagger-ui.html`. Este proyecto remapea `springdoc.api-docs.path=/api-docs` explícitamente — `/api-docs` (el path real y configurado) da `200` igual que `/swagger-ui.html`, consistente. `/v3/api-docs` da `401` correctamente porque ese path ni siquiera existe en esta app (cae en el `anyRequest().authenticated()` genérico). Sin cambios de código.
- **CFG-01 — completado (staged, no commiteado):** `git rm -r --cached backend/.gradle/` — los 15 archivos ya no quedan trackeados (siguen en disco, `.gitignore` ya los ignora desde una fase anterior). Queda para que el usuario decida cuándo commitear.

---

## Descartado en esta ronda

- **Fase 6 original (CFG-02/03, activar perfil `prod`):** no se toca código — el `SecretsValidator` ya es correcto, el gap es de despliegue real y ya está documentado en `CHECKLIST_DESPLIEGUE.md`. Riesgo aceptado, mismo tratamiento que DOCKER-01/CFG-04.

## Verificación end-to-end (aplica a cada fase que toque backend/n8n)

Mismo protocolo de las rondas anteriores: compilar → testear (unitario + suite completa) → `docker compose build`/`up -d` → login real con los 4 roles → verificar en vivo contra el stack real → limpiar cualquier dato de prueba → actualizar el checklist de este documento.

## Estado de avance

- [x] Fase 1 — Cerrar A1 (scope de `ScanController`) — completada y verificada en vivo el 2026-08-21
- [x] Fase 2 — Snapshot histórico de auditoría (A-NUEVO-1) — completada y verificada en vivo el 2026-08-21
- [x] Fase 3 — Validación de formato Maven — completada y verificada en vivo el 2026-08-21
- [x] Fase 4 — Ecosistema fuera de catálogo (ECO-CATALOGO) — completada y verificada en vivo el 2026-08-21
- [x] Fase 5 — Rate-limit de GitHub más honesto (N8N-02) — completada y verificada (simulación aislada + escaneo real) el 2026-08-21
- [x] Fase 6 — Guarda de backend contra doble disparo (A-NUEVO-2) — completada y verificada en vivo el 2026-08-21
- [ ] Fase 7 — Estado real visible en el Historial (M-NUEVO-1)
- [x] Fase 8 — Prevención del deadlock (N8N-03) — completada y verificada en vivo el 2026-08-21
- [x] Fase 9 — Filtro `deleted_at` en n8n (N8N-06) — completada y verificada en vivo el 2026-08-21; escapado de comillas (N8N-05) intentado y revertido tras 3 fallos reales, queda abierto para una corrida futura
- [x] Fase 10 — Pulido menor — completada y verificada en vivo el 2026-08-21 (CVE-NULL documentado sin fix, B-NUEVO-2 refutado, resto corregido)
