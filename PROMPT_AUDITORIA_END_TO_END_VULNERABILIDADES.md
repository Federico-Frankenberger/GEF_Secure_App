# Auditoría técnica End-to-End del sistema de escaneo de vulnerabilidades — GEF Secure

Quiero que realices una **auditoría técnica completa, profunda y end-to-end de todo este proyecto** (GEF Secure: gestión de activos, inventario de software y detección/remediación de vulnerabilidades).

No quiero únicamente una revisión superficial del código ni recomendaciones generales. Necesito que analices el sistema **de punta a punta**, entendiendo primero cómo funciona actualmente (no cómo "debería" funcionar un sistema genérico de este tipo) y luego verificando que todos sus componentes estén correctamente integrados **contra el stack corriendo de verdad**, no solo leyendo código.

Este archivo está pensado para **reusarse en distintas etapas del proyecto** (hoy, y en corridas futuras a medida que se agreguen features o se corrijan bugs). La sección 0 explica cómo hacer que la quinta corrida sea igual de rigurosa que la primera, y cómo relacionar cada corrida con las anteriores.

> ## ⚠️ Regla no negociable de esta corrida: SOLO DIAGNÓSTICO, CERO CAMBIOS AL PROYECTO
>
> Esta auditoría es de **solo lectura sobre el proyecto**. El único archivo que se crea o modifica en toda la corrida es el informe de salida (`docs/YYYY-MM-DD/AUDITORIA_END_TO_END.md`, ver §44). Concretamente:
>
> - **No** usar `Edit`/`Write` sobre ningún archivo de código, configuración, workflow de n8n, migración SQL, ni ningún otro `.md` del repo que no sea el propio informe de salida.
> - **No** aplicar ningún fix, por más obvio, chico o "de una línea" que parezca. Ni siquiera los que ya se conocen de corridas anteriores (documentarlos como `RECURRENTE`, no corregirlos de nuevo).
> - **No** hacer commits, ni `git add`, ni tocar el estado de git de ninguna forma.
> - **No** hacer `UPDATE`/`DELETE`/backfill sobre datos preexistentes en Postgres para "dejarlos prolijos" — un escaneo trabado en `RUNNING` que ya existía es un **hallazgo para el informe**, no algo para arreglar ahora.
> - Lo que **sí** está permitido, porque es cómo se verifica en vivo sin modificar el proyecto: lecturas (SQL `SELECT`, `docker logs`, `curl GET`, revisar ejecuciones de n8n) y, cuando haga falta reproducir un bug puntual, escrituras de **datos de prueba aislados y descartables** (p. ej. insertar un `scan_report` de prueba para disparar el pipeline y observar qué pasa) — siempre y cuando: (a) no toquen ni sobreescriban ningún dato real preexistente, y (b) se **borren** al terminar esa verificación puntual, dejando la base como estaba antes de la corrida salvo por el informe generado.
> - Si durante el diagnóstico la corrección es tan obvia que da la tentación de aplicarla directo: igual **no** — anotala en el informe con el nivel de detalle de §34 (causa raíz + solución recomendada + archivos afectados) para que se pueda aplicar después, en una tarea aparte, una vez que el usuario revisó el informe y decide qué corregir.
>
> Aplicar correcciones es siempre un paso **posterior y separado**, iniciado explícitamente por el usuario después de leer el informe — nunca algo que esta corrida decida por sí misma.

El objetivo principal es detectar:

- bugs existentes;
- errores lógicos;
- errores de integración;
- problemas de arquitectura;
- problemas de seguridad;
- inconsistencias entre frontend, backend, n8n y base de datos;
- problemas en el flujo de escaneo (sobre todo: escaneos que nunca cierran o quedan `RUNNING` para siempre);
- falsos positivos o falsos negativos en la correlación de vulnerabilidades;
- problemas de normalización o identificación de software (`ecosystem` + `software` + `purl` vs. cómo GitHub Advisory indexa paquetes);
- errores de manejo de estados;
- problemas de concurrencia;
- condiciones de carrera (en particular dentro del workflow de n8n, que ya tuvo al menos dos antes: ver `docs/19-08-26/Cambios_Sesion_Escaneos_Inventario.md` §11 y §14);
- errores de persistencia;
- problemas de trazabilidad;
- validaciones faltantes;
- código muerto o duplicado;
- manejo incorrecto de excepciones;
- endpoints inconsistentes;
- problemas de autenticación y autorización (JWT + RBAC + scope por activo asignado);
- problemas de rendimiento;
- falta de tests;
- tests incorrectos o insuficientes;
- configuraciones inseguras;
- problemas que puedan aparecer solamente en producción.

---

# 0. Cómo usar este archivo en corridas repetidas (leer primero, siempre)

Antes de arrancar el resto del análisis:

1. **Buscá auditorías/changelogs previos** antes de asumir que estás partiendo de cero:
   - `docs/*/AUDITORIA_END_TO_END*.md` (salidas de corridas anteriores de este mismo prompt).
   - `docs/19-08-26/Cambios_Sesion_Escaneos_Inventario.md` y cualquier otro `docs/YY-MM-DD/Cambios_*.md` — changelog narrativo de sesiones previas, con bugs ya diagnosticados y algunos ya corregidos.
   - Memoria persistente del asistente (`mem_search`/`mem_context` si está disponible) con temas `opsx/*` o relacionados a "escaneo", "n8n", "vulnerabilidades".
   - `git log --oneline -30` y `git diff` sobre archivos sin commitear, para saber qué cambió desde la última corrida.
2. **Clasificá cada hallazgo según su relación con corridas anteriores**, agregando una etiqueta extra a la clasificación de severidad (ver §33):
   - `NUEVO` — no aparece en ninguna auditoría/changelog previo.
   - `RECURRENTE` — ya estaba documentado como abierto y sigue sin resolverse. Citá la fuente (archivo + sección).
   - `RESUELTO` — estaba documentado como bug y ahora, al verificarlo en vivo, ya no se reproduce. Indicá cómo lo verificaste.
   - `REGRESIÓN` — estaba documentado como resuelto en una corrida anterior y volvió a aparecer.
3. **No repitas investigación ya hecha y confirmada como vigente** (p. ej. no re-derives desde cero la arquitectura de n8n si una corrida reciente ya la documentó y el archivo del workflow no cambió — comparalo con `git diff`/fecha de modificación primero). Sí **reverificá en vivo** cualquier cosa que vayas a dar por buena, no confíes en que "ya se revisó" sin volver a probarlo si pasó tiempo o hubo cambios.
4. **Guardá el resultado en `docs/YYYY-MM-DD/AUDITORIA_END_TO_END.md`** (fecha del día de la corrida, formato `AAAA-MM-DD` para que ordene cronológicamente; no pises corridas anteriores). Ver §44.

---

# 0.1 Contexto conocido del proyecto (punto de partida — VERIFICAR vigencia, no asumir)

Esto es lo que se sabía del proyecto a la fecha de este ajuste del prompt (2026-08-20). Puede haber cambiado. Usalo como mapa inicial para no arrancar en blanco, pero **confirmá cada punto contra el código y el stack corriendo antes de darlo por cierto** — varios de estos puntos ya cambiaron una vez en el pasado reciente (ver changelog).

**Stack:**
- Backend: Spring Boot (Java), `backend/`, JPA con `ddl-auto=validate` — las migraciones de esquema son manuales, viven en `init/*.sql` numerados y **solo corren solas contra un volumen de Postgres nuevo**; contra una base existente hay que aplicarlas a mano.
- Frontend: React 18 + TypeScript + Vite + Tailwind, `frontend/`.
- Automatización/escaneo: **n8n**, no un motor de escaneo interno al backend. El workflow vive versionado en `workflows/Pipeline de Gestión Automatizada de Vulnerabilidades (VMP).json` y se re-importa solo al reiniciar el contenedor `vuln_n8n` (bootstrap detecta cambios en el archivo).
- Base de datos: Postgres, dos bases en la misma instancia (`security` para la app, `n8n` para el estado interno de n8n — ejecuciones, credenciales).
- Docker Compose: `vuln_postgres` (5433→5432), `vuln_n8n` (5678), `gef_backend` (8081→8080), `gef_frontend` (3000→80), `vuln_pgadmin` (8080→80).

**Autenticación/autorización:**
- JWT stateless, sin refresh token, sin blacklist de revocación (limitación documentada a propósito, no descuido) — un token sigue siendo válido hasta su expiración natural aunque se cierre sesión.
- Único endpoint público: `POST /api/auth/login`. **No hay registro de usuarios (signup) desde la app** — los usuarios se siembran vía `init/07-rbac-demo-users.sql`.
- Roles: `ADMIN`, `SECURITY_ANALYST`, `ASSET_OWNER`, `AUDITOR`. `ASSET_OWNER` está acotado por activos asignados (`user_asset_assignments`) — es el punto más sensible a revisar por IDOR/fuga de scope (no hay concepto de "organización" separada, el aislamiento es a nivel de activo vía esa tabla).
- Callback interno de n8n → backend (`POST /api/webhook/scan-report`, `/api/webhook/vulnerabilities`, `/api/webhook/error`) autenticado con un token compartido por header (`X-Internal-Token` / `N8N_INTERNAL_TOKEN`), no con JWT de usuario.

**Flujo de escaneo (asíncrono, vía n8n):**
```
Frontend dispara escaneo (ACTIVO/HOST/ENTORNO/GLOBAL)
   ↓
Backend: crea ScanReport (status=RUNNING) + dispara webhook POST a n8n (no espera respuesta)
   ↓
n8n: Get_Installed_Packages (Postgres, filtra por ecosystem conocido)
   ↓
n8n: Fetch_GitHub_Advisories (HTTP, por paquete instalado — ecosystem+affects)
   ↓
n8n: Extract_Advisory_Items → Deduplicate_Advisories → Check_Internal_Assets / Sync_Software_Catalog / Enrich_Vulnerability_Data
   ↓
n8n: Risk_Assessment_Engine → Persist_Audit_Findings (INSERT en vulnerabilities_audit)
   ↓
n8n: Compute_Audit_Metrics (+ Compute_Empty_Fallback_Metrics si no hubo ningún hallazgo)
   ↓
n8n: POST http://backend:8080/api/webhook/scan-report (X-Internal-Token) → ScanReport pasa a COMPLETED
   ↓
Frontend: hace polling a GET /api/scan-reports/latest hasta ver executed_at actualizado (con timeout — ver useScanPolling.ts)
```
Fuentes externas usadas hoy: **GitHub Advisory Database** (activa, vía `api.github.com/advisories`). `Fetch_CISA_KEV` trae el feed completo de CISA pero **su salida no está conectada a ningún nodo** (posible código muerto / feature a medio implementar — confirmar si sigue así). No hay integración con NVD ni OSV pese a que puedan mencionarse en documentación de alcance.

**Normalización de software:** `software_components` tiene `name` (etiqueta libre, ej. "HdrHistogram 2.2.2"), `software` (coordenada usada para matchear advisories, ej. "org.hdrhistogram:hdrhistogram") y `ecosystem` (uno de: npm, pip, maven, nuget, cargo, go, composer, rubygems — catálogo en `public.ecosystems`, administrable desde Config). El matching contra GitHub Advisory es por **igualdad exacta** de `ecosystem`+`software` vía el query param `affects` — ya hubo un falso negativo real por esto (componente cargado como `spring-boot-starter-web` en vez de `org.springframework.boot:spring-boot-starter-web`, ver changelog §3). `catalogued` (bandera en `SoftwareComponentDTO`) se computa on-the-fly contra `software_catalog`, que se llena **reactivamente** (solo cuando una corrida de n8n encuentra una advisory real que matchea) — no es una fuente de verdad completa de "qué es seguro", solo "qué ya vimos con vulnerabilidades".

**Bug ya corregido en esta misma fecha (2026-08-20), para no re-descubrirlo de cero:** un escaneo cuyo software no tiene ninguna advisory en GitHub (caso legítimo y frecuente) hacía que el pipeline de n8n muriera por inanición de items a mitad de camino y nunca llamara al callback de finalización — el `ScanReport` quedaba en `RUNNING` para siempre y el frontend fallaba en silencio al agotar el polling. Se agregó una rama de fallback garantizada (`Compute_Empty_Fallback_Metrics` + `Pick_Real_Or_Fallback_Metrics`) y un toast de error en el frontend cuando el polling expira. Verificado en vivo para los 4 alcances (ACTIVO/HOST/ENTORNO/GLOBAL). **Repasar igual**: la arquitectura resultante (dos ramas paralelas + un nodo Code que elige) es exactamente el tipo de cosa que se rompe en silencio si alguien vuelve a tocar ese workflow sin entender por qué está así — revisar que nadie la haya revertido o modificado de forma que reintroduzca el problema.

---

# 1. Primero: comprender completamente el proyecto

Antes de modificar cualquier archivo, analizá todo el repositorio.

Identificá (contrastando contra §0.1, no repitiéndolo a ciegas):

- arquitectura general;
- tecnologías utilizadas y sus versiones reales (no asumir);
- frontend;
- backend;
- base de datos;
- servicios;
- modelos/entidades JPA;
- controladores;
- endpoints;
- repositories;
- services;
- DTOs;
- componentes/hooks de React;
- el workflow de n8n (nodos, conexiones, credenciales, qué dispara qué);
- scripts de `init/*.sql` (orden, qué asume cada uno, si son idempotentes);
- configuración y variables de entorno (`.env`, `.env.example`, `application.properties`, `docker-compose.yml`);
- Docker (`Dockerfile` de cada servicio, `n8n/bootstrap.sh`, `n8n-provisioning/`);
- dependencias/librerías (`backend/build.gradle`, `frontend/package.json`);
- APIs externas realmente invocadas (no las mencionadas en documentación de alcance si no están cableadas);
- sistema de autenticación y autorización;
- flujo de escaneo real (webhook + callback asíncrono, no un engine síncrono);
- normalización de activos e identificación de software;
- fuentes de vulnerabilidades efectivamente consultadas.

Generá un mapa de arquitectura que refleje la realidad (partí del de §0.1 y corregilo si encontrás diferencias — documentá explícitamente qué cambió respecto de ese punto de partida).

---

# 2. Analizar los flujos End-to-End

Seguí cada flujo funcional desde el comienzo hasta el final, **reproduciéndolo contra el stack corriendo** cuando sea posible (ver §42), no solo leyendo el código.

## Flujo A — Login (no hay alta de usuario self-service)

Este proyecto **no tiene registro público de usuarios**. Ajustar el flujo genérico a lo real:

```text
Login (POST /api/auth/login, único endpoint público)
→ validación de credenciales (BCrypt contra password_hash sembrado por init/05-auth.sql)
→ emisión de JWT (JwtService)
→ JwtAuthenticationFilter en cada request subsiguiente
→ CurrentUser / rol / scope por activo asignado
→ acceso al sistema
```

Buscar:

- si existe alguna vía indirecta de alta de usuarios (¿algún endpoint `ADMIN` para crear usuarios? revisar si tiene las mismas validaciones que el seed) — y si la tiene, ahí sí aplican los checks clásicos (duplicados, hash, etc.);
- JWT mal configurado (algoritmo, secret, expiración — `JWT_EXPIRATION_MINUTES`, default documentado 480 min);
- qué pasa con un token cuyo usuario fue dado de baja durante su ventana de validez (dado que no hay revocación — ¿es un riesgo aceptado y documentado, o nadie lo pensó?);
- escalamiento de privilegios (¿algún endpoint confía en un rol que viene del payload del JWT sin revalidar contra la base?).

---

## Flujo B — Scope por activo (reemplaza "organizaciones", que no existen en este proyecto)

No hay organizaciones ni multi-tenancy. El aislamiento es más fino: **por activo, vía `user_asset_assignments`**, y solo aplica al rol `ASSET_OWNER` (`CurrentUser.java` línea ~15 lo referencia explícitamente).

Revisar:

```text
Usuario (rol)
→ ¿tiene scope global (ADMIN/SECURITY_ANALYST/AUDITOR) o acotado (ASSET_OWNER)?
→ activos asignados (user_asset_assignments)
→ componentes de software de esos activos
→ escaneos/vulnerabilidades de esos activos
```

Verificar especialmente:

- un `ASSET_OWNER` **nunca** debería poder leer ni modificar un activo, componente, escaneo o vulnerabilidad que no le fue asignado, ni por endpoints obvios (`GET /api/assets/{id}`) ni por endpoints indirectos (`GET /api/scan-reports/{id}/vulnerabilities`, `GET /api/software-components/{id}`, exportación de PDF, etc.) — probar con IDs de activos ajenos.
- si el filtrado de scope se hace en el `Repository`/`Service` (SQL con `WHERE`) o solo en el frontend (que sería fácilmente evitable pegándole directo a la API).

---

# 3. Gestión de activos

Seguir el flujo completo usando las entidades reales (`Asset`, no un concepto genérico):

```text
Usuario crea activo (AssetController)
→ backend recibe información
→ validación
→ almacenamiento
→ asociación con entorno (Environment)
→ asociación con componentes de software (SoftwareComponent, FK asset_id obligatoria)
```

Verificar:

- nombres inválidos/duplicados (¿hay constraint único o se permiten dos activos homónimos en el mismo entorno? — ya se vio al menos un caso de `contao/contao 5.7.0` duplicado en la base, confirmar si es un bug o un caso de uso válido — p. ej. el flujo de inyección de activos de prueba vía n8n);
- borrado lógico (`deleted_at` en `software_components` — ¿existe el mismo patrón en `assets`? revisar `init/08-soft-delete-assets.sql`);
- qué pasa con `scan_reports`, `software_components` y `vulnerabilities_audit` cuando se borra (lógica o físicamente) un activo — no debería perderse trazabilidad histórica;
- ediciones que cambien `ecosystem`/`software` de un componente después de tener escaneos previos — ¿el historial queda coherente o queda "huérfano" de contexto?

---

# 4. Inventario de software — CRÍTICO

Cómo se registra realmente hoy: alta manual desde el frontend **o** importación de SBOM (CycloneDX, generado con Syft — ver `docs/19-08-26/Cambios_Sesion_Escaneos_Inventario.md` §4, `InventoryService.java`, `CycloneDxDTO.java`, `PurlParser.java`).

```text
Activo
   ↓
SoftwareComponent: name (libre) + software (coordenada) + ecosystem + version + purl
   ↓
purl parseado (PurlParser) → ¿de dónde sale `software`/`ecosystem` cuando el alta es por SBOM vs. manual? ¿son consistentes entre los dos caminos?
```

Buscar específicamente diferencias de nomenclatura entre lo cargado y cómo GitHub Advisory indexa el paquete real, por ecosistema:

```text
maven:  org.springframework.boot:spring-boot-starter-web   (groupId:artifactId completo, NO solo el artifactId)
npm:    lodash                                              (nombre de paquete npm tal cual)
pip:    django                                               (normalizar guiones/guiones bajos/mayúsculas — PEP 503)
composer: contao/contao                                     (vendor/package)
```

Para cada ecosistema soportado (`public.ecosystems`), confirmar con al menos un ejemplo real si el valor guardado en `software` matchea lo que `api.github.com/advisories?ecosystem=X&affects=Y` espera. Ya se confirmó un falso negativo real en `maven` por este motivo — verificar si sigue existiendo para altas nuevas (manual y por SBOM) o si ya se corrigió en ambos caminos.

---

# 5. Normalización de software

Sistema actual: **no hay CPE, no hay fuzzy matching, no hay diccionario de alias.** Es comparación exacta de dos campos de texto (`ecosystem`, `software`, ambos `LOWER(TRIM(...))` en el SQL de n8n) contra el parámetro `affects` de la API de GitHub Advisory, más un PURL (`SoftwareComponent.purl`) que **no** parece usarse activamente en el matching de vulnerabilidades (confirmar si se usa para algo más que mostrarlo).

## Falsos negativos — buscar activamente

- Nombre "amigable" (`name`) usado por error en vez de la coordenada real (`software`) en algún punto del flujo (alta manual, importación SBOM, o dentro del propio workflow de n8n).
- Diferencias de mayúsculas/minúsculas o espacios que el `LOWER(TRIM(...))` de las queries de n8n no cubra (¿se aplica en TODOS los queries relevantes o se filtró alguno nuevo sin ese tratamiento?).
- Ecosistemas con reglas de normalización propias que GitHub exige (pip: PEP 503; npm: scoped packages `@scope/name`) y que el sistema no aplica.
- Alias conocidos del mismo producto bajo nombres de paquete distintos entre ecosistemas.

## Falsos positivos

Con matching exacto por texto, el riesgo de falso positivo es más bajo que el de falso negativo, pero igual revisar: ¿puede una advisory de un paquete con el mismo nombre en un ecosistema distinto (colisión de nombre entre ecosistemas) colarse si el filtro de `ecosystem` fallara en algún punto de la cadena?

Clasificar cualquier hallazgo de esta sección como mínimo **ALTO**, y **CRÍTICO** si hay evidencia de que ya está pasando con software real instalado hoy en la base.

---

# 6. Motor de escaneo (n8n, asíncrono — no un engine interno)

Seguir el flujo real (ver diagrama de §0.1), no el genérico. Puntos ya conocidos por resolver o revisar:

- `Fetch_CISA_KEV`: confirmar si sigue sin estar conectado a nada. Si es así, clasificar como código muerto (§31) — no es un bug funcional pero es trabajo desperdiciado en cada corrida (trae un feed grande sin usarlo).
- Cadena `Fetch_GitHub_Advisories → Extract_Advisory_Items → Deduplicate_Advisories → Check_Internal_Assets / Sync_Software_Catalog / Enrich_Vulnerability_Data`: varias de estas expresiones referencian `$json.vulnerabilities.package.name`/`.ecosystem` **sin optional chaining**. Confirmar que ningún ítem "fantasma" (de una rama de fallback, o de un cambio futuro al grafo) pueda llegar hasta ahí sin esos campos — rompería con una excepción de expresión no controlada.
- `Persist_Scan_Statistics` es el **único** nodo que le avisa al backend que el escaneo terminó. Cualquier cambio al grafo que deje una rama sin llegar ahí reproduce el bug de escaneos `RUNNING` eternos — es el punto de falla más frágil de todo el sistema y merece un test/chequeo específico en cada corrida de esta auditoría.
- Analizar qué pasa si falla cada paso: `Get_Installed_Packages` (Postgres caído), `Fetch_GitHub_Advisories` (rate limit / 5xx — tiene `onError: continueRegularOutput`, confirmar qué item produce en ese caso y si eso contamina el resto de la cadena), `Persist_Scan_Statistics` (backend caído en el momento del callback — ¿n8n reintenta? ¿el `ScanReport` queda `RUNNING` para siempre otra vez, ahora por una causa distinta?).

---

# 7. Trazabilidad del escaneo

Estados **realmente** usados en `scan_reports.status` (confirmar que sigan siendo estos, no asumir los genéricos de la plantilla original):

```text
RUNNING
COMPLETED
FAILED
PARTIALLY_COMPLETED
```

No hay `PENDING` ni `CANCELLED` — evaluar si deberían existir (p. ej. ¿se puede cancelar un escaneo en curso desde la UI? ¿qué pasa si el usuario cierra el navegador mientras hace polling?).

Campos ya persistidos en `ScanReport`: `id`, `publicCode` (`SCN-YYYY-NNNNNN`), `status`, `targetType`/`targetName`, `triggeredBy`, `softwareComponent`/`environment`/`asset` (FK opcionales según alcance), `startedAt`/`executedAt`, `totalDetected`/`audited`/`ignored`/`criticals`/`highs`/`mediums`/`lows`, `systemStatus`, `reportMessage`, `environmentBreakdown` (JSON), `errorMessage`. Evaluar si falta algo de la lista genérica (versión del motor/workflow de n8n ejecutado, fuentes consultadas en esa corrida puntual) que sería útil para reconstruir una corrida vieja con precisión.

---

# 8. Escaneos concurrentes

Sin datos previos confiables sobre esto — tratar como área abierta en cada corrida, no asumir que ya se probó.

Escenarios a analizar/probar:

- Dos escaneos `ACTIVO` disparados casi simultáneamente para el **mismo** componente (doble click en "Escanear", o el usuario reintentando porque cree que no pasó nada).
- Un escaneo `GLOBAL` corriendo mientras se dispara un `ACTIVO` sobre un componente que también cae dentro del alcance global.
- `Sync_Software_Catalog` (`INSERT ... ON CONFLICT (package_name, ecosystem) DO UPDATE`) bajo dos ejecuciones de n8n en paralelo tocando la misma fila.
- `SoftwareComponentService.triggerScan` actualizando `lastScan` — ¿hay ventana para que una corrida vieja pise el `lastScan` de una corrida más nueva si terminan en orden distinto al que arrancaron?

Buscar condiciones de carrera, duplicación de resultados, bloqueos, deadlocks, escrituras inconsistentes, estados incorrectos, sobreescritura de datos.

---

# 9. Fallos parciales de fuentes externas

Hoy la única fuente externa activa es GitHub Advisory Database (CISA KEV se trae pero no se usa, ver §6). Simular/analizar:

```text
GitHub Advisory responde lento / rate-limited (403/429)
GitHub Advisory devuelve 5xx
GitHub Advisory devuelve un esquema distinto al esperado (campo faltante o renombrado)
```

¿El escaneo falla completamente, continúa parcialmente, lo informa, queda registrado como `FAILED`/`PARTIALLY_COMPLETED`, o repite el bug de quedar `RUNNING` para siempre por una causa nueva? `Fetch_GitHub_Advisories` tiene `onError: continueRegularOutput` — confirmar exactamente qué termina persistido en `scan_reports`/`system_errors` en ese caso.

---

# 10. Integraciones con fuentes de vulnerabilidades

Analizar cada integración **realmente presente** en el workflow (no una lista genérica):

- **GitHub Advisory Database** (`api.github.com/advisories`) — activa, con `Header Auth account 3` (token). Revisar timeouts, manejo de rate limit (GitHub documenta límites por token — ¿el volumen de escaneos `GLOBAL`/`ENTORNO` puede pegarle al límite con inventarios grandes, dado que hace una llamada HTTP por paquete instalado distinto?), paginación (¿trae más de una página si hay más resultados de los que devuelve por default?).
- **CISA KEV** (`cisa.gov/.../known_exploited_vulnerabilities.json`) — se trae pero no se conecta a nada (confirmar vigencia, ver §6).
- Confirmar si hay o no NVD/OSV pese a mencionarse en documentación de alcance (`docs/All/*`) — si no están, no inventar hallazgos sobre integraciones que no existen; documentar como ausentes/fuera de alcance actual.

---

# 11. Correlación de vulnerabilidades

```text
software instalado (software + ecosystem)
+
version
+
advisory de GitHub (vulnerable_version_range)
=
hallazgo (vulnerabilities_audit)
```

Buscar específicamente cómo se compara `version` del componente contra `vulnerable_version_range`/`first_patched_version` de la advisory — ¿se usa una librería de comparación semántica real (semver) o comparación de strings? Casos límite a probar:

```text
1.2   vs  1.2.0
1.9   vs  1.10
2.0.0 vs  v2.0
1.2.0-beta vs 1.2.0
```

Si la comparación es por string, marcar como **CRÍTICO** — puede generar falsos negativos (versión vulnerable no detectada) o falsos positivos (versión parcheada marcada como vulnerable) de forma sistemática, no solo en casos límite raros.

---

# 12. CVE / GHSA

Verificar manejo de identificadores (`cveId`, `ghsaId` en `VulnerabilityAudit`/`AssetVulnerability`):

- duplicados cuando el mismo hallazgo se re-detecta en escaneos sucesivos (¿el ciclo de vida NEW/PERSISTING/REOPENED/RESOLVED, mencionado en el changelog, evita duplicar filas o crea una fila nueva por escaneo?);
- advisories sin CVE asociado (solo GHSA) — ¿se maneja el caso `cveId = null`?;
- el mismo CVE detectado vía dos advisories/paquetes distintos en el mismo escaneo — ¿genera dos hallazgos o se deduplica?

---

# 13. Severidad

Verificar `criticality`/`priority` en `VulnerabilityAudit` y cómo se deriva de `cvss_severities` de GitHub (que trae CVSS v3/v3.1, a veces v4). Comprobar que no haya inconsistencias entre el score numérico y la etiqueta (`CRITICAL`/`HIGH`/`MEDIUM`/`LOW`) mostrada, y qué pasa cuando GitHub no informa severidad para una advisory (¿cae en "SIN PRIORIDAD" de forma consistente en toda la UI, o en algún lugar rompe/queda `null` sin manejar?).

---

# 14. Base de datos

Revisión profunda del modelo real (`init/*.sql`, entidades JPA en `backend/src/main/java/.../model/`).

Buscar:

- relaciones/cardinalidades incorrectas entre `assets`, `software_components`, `scan_reports`, `vulnerabilities_audit`, `asset_vulnerability`, `software_catalog`, `ecosystems`, `user_asset_assignments`;
- N+1 queries (`SoftwareComponent.asset` es `FetchType.EAGER` — confirmar impacto en listados grandes);
- índices faltantes en columnas usadas para filtrar/ordenar seguido (`scan_reports.target_name`, `.status`, `.started_at`; `software_components.ecosystem`, `.software`);
- constraints/FKs faltantes o mal pensadas (¿`software_catalog` tiene unique en `(package_name, ecosystem)` como asume el `ON CONFLICT` de n8n? confirmar);
- datos huérfanos (filas de `vulnerabilities_audit` cuyo `scan_id` no exista más, componentes con `asset_id` inválido);
- cascadas peligrosas (¿borrar un `Asset` arrastra `software_components`/`scan_reports` por cascada de base o de JPA sin que el código lo controle explícitamente?);
- duplicados reales ya vistos (dos `software_components` con el mismo `name` — ver §3) y si hay o debería haber un constraint que lo evite;
- que las migraciones en `init/*.sql` sigan siendo aplicables en orden contra una base ya existente (no solo contra un volumen nuevo) — es una decisión de diseño explícita del proyecto que las migraciones sean manuales, así que confirmar que la numeración/documentación de "aplicar a mano" siga clara y al día.

---

# 15. Integridad de datos

Analizar escenarios reales del dominio:

```text
se elimina (lógica o físicamente) un activo
se elimina un componente de software que tiene escaneos históricos
se cambia el ecosystem/software de un componente después de tener hallazgos
```

¿Qué pasa con `scan_reports`, `vulnerabilities_audit`, `asset_vulnerability`, `system_errors`? No debería perderse información histórica necesaria para auditoría — confirmar si el borrado lógico (`deleted_at`) se respeta en TODAS las queries relevantes (repositorios, y también dentro de las queries SQL crudas del workflow de n8n, que no pasan por JPA y podrían no filtrar `deleted_at`).

---

# 16. API Backend

Revisar todos los controladores (`backend/src/main/java/.../controller/*.java`).

Buscar:

- endpoints sin `@PreAuthorize` que deberían tenerlo (comparar contra la matriz de roles real, no una genérica);
- validaciones faltantes (`@Valid`, Bean Validation) en DTOs de request;
- IDs manipulables / IDOR (probar pasando IDs de recursos ajenos al scope del usuario logueado, en particular para `ASSET_OWNER`);
- respuestas/códigos HTTP inconsistentes entre controladores similares;
- información sensible expuesta en respuestas (hashes, tokens internos, stack traces);
- excepciones no controladas que caigan en el handler genérico de `GlobalExceptionHandler` exponiendo detalles internos en el mensaje 500.

---

# 17. Autorización

Repetir, con casos concretos, contra los endpoints reales:

```text
Usuario ASSET_OWNER (sin el activo 17 asignado)
GET /api/software-components/153        (componente del activo 17, "Spring Boot Backend")
GET /api/scan-reports/{id}/vulnerabilities  (de un scan sobre un activo no asignado)
POST /api/software-components/153/scan
```

Verificar autorización **por recurso**, no solo por rol — que el filtro de scope esté en la capa de datos (repository/service), no solo inferido en el frontend.

---

# 18. Frontend

Analizar (`frontend/src/`):

- llamadas API (`services/api.ts`) y manejo de errores (¿todo `catch` muestra feedback al usuario, o hay casos de fallo silencioso como el que ya se corrigió en `useScanPolling`? — buscar el mismo patrón en otros hooks/páginas);
- estados de carga/vacíos/inconsistentes (¿qué se muestra mientras un escaneo está `RUNNING`? ¿y si el polling expira?);
- doble ejecución de acciones (¿se puede hacer doble click en "Escanear" y disparar dos escaneos? ver §8);
- formularios y sus validaciones (alta de activo/componente, importación de SBOM);
- expiración de sesión (¿qué pasa en el frontend cuando el JWT expira a mitad de una acción — 401 manejado con logout/redirect, o error crudo?).

---

# 19. Sincronización frontend/backend

Buscar diferencias entre `frontend/src/types/index.ts` y los DTOs reales del backend (`backend/src/main/java/.../dto/*.java`):

- campos faltantes, renombrados, opcionales incorrectamente, tipos incompatibles;
- especial atención a los DTOs tocados en la sesión más reciente (`VulnerabilityAuditDTO`, `ScanReportDTO`, `SoftwareComponentDTO`) por si quedó algo desalineado.

---

# 20. Manejo de errores

Revisar qué ocurre ante:

```text
Postgres caído
n8n caído o inalcanzable (N8nUnavailableException → 502, confirmar que se propaga bien en cada punto de disparo)
GitHub Advisory caído/rate-limited (ver §9)
timeout de red
token JWT expirado
token interno de n8n inválido (InvalidCredentialsException en /api/webhook/*)
JSON inesperado en un webhook entrante
escaneo interrumpido a mitad de camino (n8n reiniciado durante una ejecución)
```

El sistema debería fallar de forma controlada y visible para el usuario, no en silencio (el bug ya corregido esta sesión era exactamente un caso de esto).

---

# 21. Logging

Analizar si existe logging suficiente para responder, ante un incidente real:

```text
¿Qué escaneo falló, con qué scan_id/publicCode?
¿Sobre qué activo/componente?
¿Qué usuario lo disparó (triggeredBy)?
¿Qué nodo de n8n falló (system_errors.node_name/error_message/execution_id)?
¿Cuándo?
```

Evitar que los logs (backend y n8n) contengan contraseñas, tokens (`N8N_INTERNAL_TOKEN`, `JWT_SECRET`, `GITHUB_TOKEN`, `SLACK_BOT_TOKEN`) o credenciales.

---

# 22. Seguridad (OWASP)

Buscar, contra el código y config reales de este proyecto:

- SQL Injection — prestar atención especial a las queries de n8n, que interpolan strings directamente en el SQL (`{{ $json...replace(/'/g, "''") }}`) en vez de usar parámetros — confirmar que el escape sea consistente en TODAS las queries del workflow, no solo en las que ya lo tienen;
- XSS (¿algún campo de texto libre del usuario — `description`, `name` — se renderiza sin sanitizar en algún lugar del frontend?);
- CSRF (¿corresponde, dado que es JWT en header y no cookies de sesión?);
- IDOR (ver §17);
- SSRF (¿algún endpoint acepta una URL controlada por el usuario y la pega el backend, p. ej. algo relacionado a importación de SBOM?);
- command injection / path traversal (importación de archivos SBOM — ¿valida tipo/contenido, o solo extensión?);
- exposición de secretos (¿`.env` está en `.gitignore`? ¿hay algún secreto hardcodeado en `application.properties`, `docker-compose.yml` o en el propio workflow JSON de n8n — recordar que `n8n-provisioning/credentials.json` vive en el repo, confirmar qué contiene realmente y si debería estar ahí);
- JWT vulnerabilities (algoritmo, secret débil, `alg: none`);
- CORS (`ALLOWED_ORIGINS` — ¿está acotado o permite cualquier origen en algún entorno?);
- headers de seguridad (CSP, HSTS, X-Frame-Options — ¿los sirve el nginx del frontend?).

---

# 23. Dependencias

Analizar:

```text
backend/build.gradle
frontend/package.json
Dockerfile (cada servicio)
docker-compose.yml
```

Buscar dependencias obsoletas, innecesarias, incompatibles, o con vulnerabilidades conocidas si se pueden determinar (versión de Spring Boot, de n8n — `N8N_VERSION` en `.env.example` —, de las librerías de frontend).

---

# 24. Docker y despliegue

Revisar `docker-compose.yml` y cada `Dockerfile`:

- puertos expuestos innecesariamente (¿pgAdmin y n8n deberían estar accesibles fuera de la red interna en un despliegue real?);
- usuarios de los contenedores (¿corren como root sin necesidad?);
- volúmenes (¿`n8n-provisioning/credentials.json` termina copiado dentro de la imagen o del volumen de forma que persista secretos donde no debería?);
- variables de entorno sin default seguro (`N8N_INTERNAL_TOKEN` default `dev-only-insecure-internal-token` en `application.properties` — confirmar que en cualquier despliegue real se sobreescriba, y que no haya forma de que quede el default);
- networking (¿todo lo que no necesita estar expuesto está solo en `gef_net`?).

---

# 25. Variables de entorno

Confirmar que `.env` (con secretos reales) no esté versionado, que `.env.example` no tenga valores reales, y que ningún secreto esté hardcodeado en código o en el workflow de n8n exportado (`workflows/*.json` puede llevarse credenciales si se exportó mal — confirmar que las credenciales referenciadas ahí sean solo IDs, no valores).

---

# 26. Tests existentes

Analizar todos los tests existentes (`backend/src/test/`, y cualquier test de frontend si existe). Clasificarlos en unitarios / integración / API / base de datos / end-to-end / seguridad. Determinar qué funcionalidades **no** están cubiertas — en particular: ¿hay algún test que cubra el camino de "0 resultados" del pipeline de n8n, o quedó sin test de regresión pese al bug ya corregido? Revisar también la calidad del propio test (no asumir que un test es correcto solo porque pasa).

---

# 27. Tests End-to-End recomendados

Como mínimo, adaptado al flujo real de este proyecto:

```text
login (usuario seed)
→ crear/editar activo
→ agregar componente de software (manual y por SBOM)
→ disparar escaneo ACTIVO
→ (si corresponde) detectar vulnerabilidad real
→ verificar que el ScanReport llegue a COMPLETED (no quede RUNNING) — con y sin hallazgos
→ visualizar resultado en Historial
→ comparar dos escaneos
→ exportar informe PDF
```

---

# 28. Casos extremos

```text
componente sin ninguna advisory en GitHub (ya cubierto por el fix de esta sesión — agregar como test de regresión)
componente con ecosystem que no está en public.ecosystems
versión vacía o "desconocida"
activo sin ningún componente, escaneado como ACTIVO/HOST
escaneo ENTORNO sobre un entorno sin ningún activo
GitHub Advisory caído en medio de un escaneo GLOBAL con cientos de paquetes
usuario ASSET_OWNER sin ningún activo asignado
componente duplicado (mismo name, dos filas) — ¿el escaneo lo cuenta dos veces?
```

---

# 29. Rendimiento

Buscar potenciales problemas:

- N+1 queries (`SoftwareComponent.asset` EAGER, ver §14);
- una llamada HTTP a GitHub **por cada paquete instalado distinto** en un escaneo `GLOBAL`/`ENTORNO` — con un inventario grande, ¿cuánto tarda y qué probabilidad de rate limit tiene?;
- consultas completas de tablas sin paginar en algún listado;
- procesamiento secuencial en n8n donde podría paralelizarse (o al revés: paralelismo sin control que dispare demasiadas llamadas simultáneas a GitHub).

---

# 30. Escalabilidad

Analizar conceptualmente qué pasaría con un inventario mucho más grande que el actual (miles de componentes, decenas de miles de hallazgos en `vulnerabilities_audit`) dado el diseño actual: una llamada HTTP a GitHub por paquete distinto, sin cola/worker separado del propio workflow de n8n, sin cache de advisories entre corridas (más allá de `software_catalog`, que es reactivo y no completo). Indicar qué necesitaría cambiar (paginación, cache, cola, rate-limit handling) antes de escalar.

---

# 31. Revisar código muerto

Detectar, con lo ya sabido como punto de partida a confirmar:

- `Fetch_CISA_KEV` sin conexión de salida en el workflow de n8n (ver §6/§10);
- `purl` en `SoftwareComponent`, ¿se usa para algo más que mostrarse? (ver §5);
- funciones/endpoints nunca consumidos por el frontend;
- componentes de React abandonados;
- TODO/FIXME en el código;
- código comentado sin motivo documentado.

---

# 32. No modificar — nunca, en esta corrida

No arranques corrigiendo mientras todavía estás descubriendo el sistema, y no termines corrigiendo tampoco. Esta corrida es 100% entender → mapear → analizar → detectar → clasificar → proponer, sin excepción (ver la regla no negociable al inicio del archivo). Aplicar algo queda siempre para una tarea posterior separada, que el usuario dispara explícitamente después de leer el informe — este prompt nunca incluye implícitamente el permiso para aplicar cambios, ni siquiera si el hallazgo ya se vio en una corrida anterior.

---

# 33. Clasificación de hallazgos

```text
CRÍTICO
ALTO
MEDIO
BAJO
MEJORA
```

más la etiqueta de recurrencia de §0.1:

```text
NUEVO | RECURRENTE | RESUELTO | REGRESIÓN
```

## CRÍTICO
Vulnerabilidades no detectadas o detectadas incorrectamente, pérdida de datos, acceso no autorizado (IDOR/escalamiento), compromiso del sistema, escaneos que quedan colgados sin avisar.

## ALTO
Errores funcionales importantes que no llegan a CRÍTICO.

## MEDIO
Problemas funcionales secundarios o de mantenibilidad relevante.

## BAJO
Problemas menores.

## MEJORA
Sin bug directo, pero el diseño podría ser mejor.

---

# 34. Para cada problema encontrado

```text
ID:
Severidad:
Estado (NUEVO/RECURRENTE/RESUELTO/REGRESIÓN):
Archivo:
Línea aproximada:
Componente:
Descripción:
Cómo reproducirlo (idealmente: comando/curl/query SQL concreto contra el stack corriendo):
Impacto:
Causa raíz:
Solución recomendada:
Archivos afectados:
Tests necesarios:
```

---

# 35. Matriz final

| ID | Severidad | Estado | Componente | Problema | Impacto | Solución |
|---|---|---|---|---|---|---|

Ordenada CRÍTICO → ALTO → MEDIO → BAJO → MEJORA.

---

# 36. Arquitectura encontrada

Documentar la arquitectura REAL verificada en esta corrida (partiendo del diagrama de §0.1, corrigiéndolo donde haga falta). Usar Mermaid.

---

# 37. Flujos críticos encontrados

Documentar los flujos reales (login → activo → software → escaneo → vulnerabilidad → resultado — no hay notificaciones push/email hoy, confirmar si Slack cuenta como el único canal de "notificación" del sistema y si corresponde auditarlo como tal). Mostrar en qué punto podría fallar cada flujo.

---

# 38. Cobertura funcional

| Funcionalidad | Implementada | Funciona correctamente | Tests | Riesgo |
|---|---:|---:|---:|---|
| Login | | | | |
| RBAC + scope por activo | | | | |
| Activos | | | | |
| Componentes de software (manual) | | | | |
| Importación SBOM (CycloneDX) | | | | |
| Escaneo ACTIVO | | | | |
| Escaneo HOST | | | | |
| Escaneo ENTORNO | | | | |
| Escaneo GLOBAL | | | | |
| Normalización/matching contra GitHub Advisory | | | | |
| Ciclo de vida de hallazgos (NEW/PERSISTING/REOPENED/RESOLVED) | | | | |
| Comparación de escaneos | | | | |
| Kanban de remediación | | | | |
| Exportación de informes PDF | | | | |
| Dashboard | | | | |
| Notificaciones Slack | | | | |

Completar/ajustar filas según lo que se confirme en esta corrida.

---

# 39. Top problemas

## Top 10 problemas más importantes

Ordenados por impacto real. Explicar por qué deben resolverse primero.

---

# 40. Plan de corrección

```text
FASE 1 — Bugs críticos
FASE 2 — Seguridad
FASE 3 — Integridad de datos
FASE 4 — Motor de escaneo (n8n)
FASE 5 — Normalización de software
FASE 6 — Testing
FASE 7 — Rendimiento
FASE 8 — Refactorización
```

Adaptar según lo encontrado. Para cada fase: objetivo, archivos involucrados, cambios, riesgos, tests, criterio de finalización.

---

# 41. Regla fundamental

No te limites a errores sintácticos. Pensá simultáneamente como arquitecto de software, desarrollador senior, QA engineer, especialista en seguridad, pentester, DevOps, DBA y especialista en gestión de vulnerabilidades.

La pregunta principal:

> ¿Puedo confiar en que este sistema identifica correctamente los activos y su software, ejecuta el escaneo sin perder información, correlaciona correctamente las vulnerabilidades, mantiene la trazabilidad y evita mostrar resultados incorrectos al usuario?

Si la respuesta no es completamente afirmativa, explicá exactamente qué lo impide.

---

# 42. Ejecución del proyecto — OBLIGATORIO cuando el entorno lo permita

Esta es la diferencia entre una auditoría de verdad y una lectura de código. **Priorizar reproducir en vivo por sobre leer y asumir.**

1. Confirmar qué está corriendo: `docker ps` (esperar `vuln_postgres`, `vuln_n8n`, `gef_backend`, `gef_frontend`, `vuln_pgadmin`). Si algo no está levantado, `docker compose up -d` (avisando antes si implica rebuild).
2. Backend: healthcheck / login real contra `POST /api/auth/login` con las credenciales seed documentadas en `docs/19-08-26/.../§5.2` (no hardcodear la contraseña en el informe de salida — referenciar dónde está documentada).
3. Base de datos: consultas directas vía `docker exec vuln_postgres psql -U <user> -d security` para verificar estado real (¿hay `scan_reports` en `RUNNING` sin `executed_at`? ¿hay componentes con `ecosystem` fuera del catálogo?).
4. n8n: confirmar que el workflow esté `active` (`docker logs vuln_n8n`), y si hace falta reproducir un escaneo, disparar contra el endpoint real autenticado (no contra el webhook de n8n directo, salvo que se esté aislando específicamente el pipeline de n8n del resto del sistema) y verificar en `execution_entity`/`execution_data` (base `n8n`, no `security`) qué nodos corrieron.
5. Frontend: `npm run build` como mínimo (type-check + bundle); si hace falta validar UI, usar la skill de testing de la app disponible en este entorno en vez de asumir.
6. Ejecutar tests existentes y linters si los hay.
7. Revisar logs de cada contenedor después de cada prueba en vivo.
8. Después de cada verificación en vivo que haya escrito datos de prueba (un `scan_report` de prueba, un usuario de prueba, etc.), **borrarlos antes de seguir** — la base tiene que quedar exactamente como estaba antes de esta corrida, salvo por el informe generado en `docs/`.

Recordatorio: esta corrida **no corrige nada** (ver regla no negociable al inicio del archivo). "Ejecución del proyecto" significa reproducir para reunir evidencia, no arreglar lo que se encuentre roto — ni siquiera datos preexistentes rotos (p. ej. escaneos ya trabados en `RUNNING` de antes de esta corrida): eso se documenta como hallazgo, con instrucciones claras de cómo repararlo, y se repara después si el usuario lo pide.

Si alguna parte no puede ejecutarse, indicar explícitamente:

```text
NO VERIFICADO EN EJECUCIÓN
```

y el motivo. Nunca marcar algo como funcional solo porque el código aparenta ser correcto.

---

# 43. Separar evidencia de hipótesis

```text
CONFIRMADO       — reproducido en vivo o demostrado con código/tests/datos reales de la base.
RIESGO POTENCIAL — surge del análisis estático pero no se pudo (o no se intentó) reproducir.
```

No mezclar ambos niveles de certeza en el mismo hallazgo sin dejarlo explícito.

---

# 44. Entrega final

Generar un informe en:

```text
docs/YYYY-MM-DD/AUDITORIA_END_TO_END.md
```

(fecha del día de esta corrida — **no pisar** corridas anteriores; si ya existe un archivo con ese nombre en la fecha de hoy porque se corrió más de una vez en el mismo día, agregar un sufijo `_2`, `_3`, etc.)

Estructura:

```text
0. Relación con auditorías previas (qué se leyó, qué cambió desde la última corrida)
1. Resumen ejecutivo
2. Estado general del proyecto
3. Arquitectura encontrada
4. Mapa de componentes
5. Flujos End-to-End
6. Hallazgos críticos
7. Hallazgos altos
8. Hallazgos medios
9. Hallazgos bajos
10. Mejoras recomendadas
11. Seguridad
12. Base de datos
13. Motor de escaneo (n8n)
14. Normalización de software
15. Fuentes de vulnerabilidades
16. Trazabilidad
17. Frontend
18. Backend
19. Integraciones
20. Tests
21. Rendimiento
22. Escalabilidad
23. Matriz de riesgos
24. Top 10 problemas
25. Plan de corrección por fases
26. Tests que deberían agregarse
27. Arquitectura recomendada
28. Conclusión
```

---

# Resultado esperado

Al terminar la auditoría quiero poder saber claramente:

```text
¿El sistema funciona realmente de punta a punta, hoy, contra el stack corriendo?

¿Dónde puede fallar?

¿Puede perder vulnerabilidades (falsos negativos por normalización)?

¿Puede generar falsos positivos?

¿Puede perder datos?

¿Puede mezclar datos entre usuarios (fuga de scope)?

¿Puede ejecutar escaneos concurrentes correctamente?

¿Tiene trazabilidad suficiente?

¿Es seguro?

¿Está suficientemente testeado?

¿Está preparado para producción?

¿Qué debo corregir primero?

¿Qué cambió, para bien o para mal, desde la última vez que se corrió esta auditoría?
```

No ocultes problemas por considerar que una sección "parece funcionar". Buscá activamente maneras en las que el sistema pueda romperse, y priorizá reproducirlo en vivo antes de darlo por confirmado.
