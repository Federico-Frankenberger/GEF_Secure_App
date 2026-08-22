# Cambios de la sesión — Historial de Escaneos e Importación de Inventario

Fecha: 19/08/2026

## 1. Fix: filtros del Historial de Escaneos

**Problema:** en la pestaña "Historial" del Centro de Escaneos, cada cambio de filtro (fecha, tipo, objetivo) disparaba la búsqueda solo, sin esperar a que se apretara "Buscar" — el botón no tenía ninguna función real.

**Causa:** `Scans.tsx` tenía un `useEffect` que dependía de `loadHistory`, y `loadHistory` (un `useCallback`) dependía a su vez de los 4 filtros — cualquier cambio de filtro recreaba `loadHistory` y eso re-disparaba el efecto.

**Fix:** el efecto ahora depende solo de `tab` (se ejecuta una vez al entrar a la pestaña). Los filtros solo se aplican al presionar "Buscar" o "Recargar".

- Archivo: `frontend/src/pages/Scans.tsx`

## 2. Fix: botón "Limpiar" del Historial no refrescaba la tabla

**Problema:** después del fix anterior, "Limpiar" reseteaba los inputs de filtro pero la tabla seguía mostrando los resultados del último filtro aplicado (no se podía confiar en el closure de `loadHistory` justo después de resetear el estado).

**Fix:** se separó la llamada a la API en una función `fetchHistory(filters)` reutilizable. `loadHistory` arma los filtros desde el estado actual y la llama; `clearHistoryFilters` resetea los inputs **y** llama a `fetchHistory({})` directamente, sin depender del estado que todavía no se re-renderizó.

- Archivo: `frontend/src/pages/Scans.tsx`

## 3. Diagnóstico: el escaneo de "Spring Boot Backend" se colgaba

**Síntoma:** al escanear el componente `spring-boot-starter-web` del activo "Spring Boot Backend", el escaneo nunca terminaba (spinner infinito) y tampoco aparecía como opción en el autocomplete de software.

**Causa raíz (dos síntomas, un solo origen):**
- El pipeline de n8n busca vulnerabilidades en GitHub Advisory Database filtrando por `ecosystem=maven&affects=<nombre>`. GHSA indexa paquetes Maven por coordenada completa (`groupId:artifactId`), no por el artifactId solo. Como el componente estaba cargado como `spring-boot-starter-web` (sin el groupId `org.springframework.boot:`), nunca matcheaba ninguna advisory.
- Cuando un escaneo de alcance ACTIVO/HOST no encuentra ninguna vulnerabilidad, el workflow de n8n nunca llega al nodo que le avisa al backend que terminó (`Persist_Scan_Statistics`) — el `scan_report` queda para siempre sin `executed_at`/`system_status`. Se confirmó en la base: ningún escaneo ACTIVO/HOST había cerrado nunca con 0 detectadas en toda la historia.
- El catálogo de software (`software_catalog`, usado por el autocomplete) se llena de forma **reactiva**: solo cuando el pipeline de n8n encuentra una advisory real que matchea un componente existente. Como `spring-boot-starter-web` nunca matcheó nada, tampoco se sincronizó al catálogo — por eso no aparecía como opción al buscar.

**Este pipeline de n8n sigue teniendo el bug de fondo** (un escaneo con 0 resultados no cierra el `scan_report`) — no se tocó en esta sesión. Con nombres de paquete correctos (ver sección 4) el caso ya no se dispara para software real con vulnerabilidades conocidas, pero un componente genuinamente sin vulnerabilidades todavía puede quedar colgado.

## 4. Feature nueva: importación de inventario por SBOM (Syft + CycloneDX)

**Objetivo:** eliminar la carga manual de software como fuente de errores de nombre. En vez de que el usuario escriba a mano el nombre de un paquete (con el riesgo de que no matchee con GHSA), se sube un SBOM generado por una herramienta externa (**[Syft](https://github.com/anchore/syft)**, de Anchore) que lee el software real desplegado en un activo y reporta la coordenada exacta de cada paquete.

Convive con la carga manual existente (autocomplete + catálogo local) — no la reemplaza, es una segunda vía.

### Cómo se usa

Por cada activo (servidor/PC), corré Syft apuntando a las apps/artefactos desplegados ahí:

```powershell
syft dir:C:\apps\spring-boot-backend -o cyclonedx-json > backend.json
syft dir:C:\apps\react-frontend       -o cyclonedx-json > frontend.json
syft C:\apps\mi-servicio-go.exe       -o cyclonedx-json > go-app.json
syft mi-imagen:tag                    -o cyclonedx-json > docker.json
```

Syft detecta automáticamente el tipo de app y extrae sus dependencias reales: Maven (lee `pom.properties` embebido en los `.jar`), npm, pip, RubyGems, Composer, Go (lee el buildinfo embebido en el binario compilado), imágenes Docker, etc. Se pueden subir varios JSON para el mismo activo — cada uno suma software, no reemplaza.

En GEF Secure: abrís el activo → "Importar inventario" → elegís el JSON → "Vista previa" (muestra nuevo/actualizado/sin cambios/no reconocido, sin persistir) → "Confirmar importación".

### Backend

- **`PurlParser`** (`backend/src/main/java/.../util/PurlParser.java`): parsea el campo `purl` de cada componente del SBOM (formato estándar [package-url](https://github.com/package-url/purl-spec), ej. `pkg:maven/org.springframework.boot/spring-boot-starter-web@3.1.0`) y lo traduce a `(ecosystem, coordinate, version)` usando el mismo vocabulario que ya usa `software_components` (`maven`, `npm`, `pip`, `rubygems`, `composer`, `go`, `rust`, `docker`).
- **`CycloneDxDTO`** (`dto/CycloneDxDTO.java`): forma mínima del documento CycloneDX que nos interesa leer (`components[].{name,version,group,purl}`), ignora el resto de los campos.
- **`InventoryDTO`** (`dto/InventoryDTO.java`): resumen (`nuevos`/`actualizados`/`sinCambios`/`noReconocidos`/`errores`) + detalle por ítem, para preview e import.
- **`InventoryService`** (`service/InventoryService.java`): orquesta el diff/upsert contra `software_components`, reutilizando `SoftwareComponentService.create()`/`update()` (mismas validaciones y resolución de catálogo/purl que la carga manual). `preview()` no persiste; `importInventory()` sí.
- **`AssetController`**: nuevos endpoints `POST /api/assets/{id}/inventory/preview` y `POST /api/assets/{id}/inventory/import` (multipart, `ADMIN`/`SECURITY_ANALYST`).
- **`SoftwareComponentRepository`**: nuevo finder `findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull` — clave de upsert de la importación.
- **`InvalidInventoryFileException`** + handler en `GlobalExceptionHandler` (400) para JSON inválido/vacío.
- `application.properties`: límites de multipart subidos a 15MB/20MB para SBOMs grandes.
- Tests: `PurlParserTest` (parseo de purl por ecosistema) e `InventoryServiceTest` (clasificación nuevo/actualizado/sin cambios/no reconocido, sin y con persistencia).

### Frontend

- `services/api.ts`: `inventoryApi.preview`/`import` (multipart, `Content-Type: undefined` para que axios calcule el boundary — el default `application/json` de la instancia rompía el multipart si no se pisaba explícitamente).
- `types/index.ts`: `InventorySummary`, `InventoryItem`, `InventoryItemStatus`.
- `pages/Assets.tsx`: botón "Importar inventario" junto a "Agregar Software" en el modal de software de cada activo; modal propio con el flujo seleccionar archivo → vista previa (tabla con badges de estado) → confirmar.

### Prueba end-to-end realizada

Se corrió Syft contra el propio backend de este repo (`backend-sbom.json`, 85 componentes con coordenadas Maven reales) y se importó contra el activo real "Spring Boot Backend": 84 nuevos, 1 no reconocido (un artefacto sin versión resuelta). Se disparó luego un escaneo sobre uno de los componentes importados (`org.apache.tomcat.embed:tomcat-embed-core`) y **cerró correctamente** (`SCN-2026-000058`, `✅ ESTABLE`, 23 vulnerabilidades detectadas) — confirma que el problema original (escaneo colgado por nombre mal formado) queda resuelto para software con coordenadas correctas.

### Fix posterior: la tabla de software se cortaba en "Ecosistema"

**Problema:** al abrir el detalle de software de un activo cargado por SBOM, las coordenadas Maven/Go son largas y sin espacios (ej. `org.apache.tomcat.embed:tomcat-embed-core`). La tabla (`components/Table.tsx`) tenía `className="w-full"`, que la fuerza a nunca superar el ancho del modal — el contenido se recortaba visualmente y las columnas siguientes (Ecosistema, Versión, Entorno, Criticidad, Último Scan, Acciones) quedaban invisibles, sin forma de hacer scroll para verlas.

**Fix:** `w-full` → `min-w-full` en `<table>` (mínimo el ancho del contenedor, pero puede crecer si el contenido real lo necesita), más `whitespace-nowrap` en los headers. Así el wrapper `overflow-x-auto` que ya existía tiene contenido real para scrollear en vez de quedar sin efecto. Verificado con Playwright: `scrollWidth` pasó de ser igual al `clientWidth` (sin overflow real, columnas perdidas) a 1591px vs 1022px (scroll real, todas las columnas visibles).

- Archivo: `frontend/src/components/Table.tsx`

**Ajuste adicional:** el scroll horizontal funcionaba pero era casi invisible (scrollbar de 5px, mismo color que el fondo oscuro — `index.css:8-11`), así que seguía "pareciendo cortada". La causa real de que se viera mal era otra: para el software importado por SBOM, la columna "Nombre" repetía la coordenada completa + versión (idéntico a "Software" + "Versión"), desperdiciando la mitad del ancho de la tabla. Se acortó el nombre autogenerado a solo el último segmento de la coordenada (`InventoryService.shortName()`, ej. `spring-boot-starter-web 3.1.0` en vez de `org.springframework.boot:spring-boot-starter-web 3.1.0`) — con eso Ecosistema/Versión/Entorno ya entran sin necesitar scroll en la mayoría de los casos.

- Archivo: `backend/src/main/java/.../service/InventoryService.java`

**Ajuste final:** el scroll seguía sin ser una buena solución (scrollbar casi invisible, y algunos usuarios/mouses sin scroll horizontal cómodo). Se cambió de estrategia: en vez de depender de que el usuario scrollee, la tabla ahora entra completa en pantalla sin scroll.
- Columnas "Nombre" y "Software" (`Assets.tsx` → `componentColumns`): ancho máximo fijo con truncado (`…` + tooltip con el valor completo al pasar el mouse), en vez de dejar que el contenido largo empuje el resto de las columnas fuera de vista.
- Modal "Software del activo": se agregó un tamaño `2xl` nuevo al componente `Modal` (`max-w-6xl`, antes el máximo era `xl`/`max-w-5xl`) y se lo aplicó a este modal para darle más aire.
- Resultado verificado: con los 84 componentes reales importados por Syft, `scrollWidth === clientWidth` (0px de overflow) — todas las columnas (Nombre, Software, Ecosistema, Versión, Entorno, Criticidad, Último Scan, Acciones) visibles a la vez, sin scroll.

- Archivos: `frontend/src/pages/Assets.tsx`, `frontend/src/components/Modal.tsx`

## 6. Affordance de fila clickeable en tablas

**Problema:** en las tablas donde toda la fila es clickeable (Activos, Historial de escaneos, resultado agrupado por activo en Escaneos), la única señal de que se puede hacer clic era el cursor `pointer` al pasar el mouse — fácil de no notar, sobre todo en trackpad/touch.

**Fix:** el componente compartido `Table` (`frontend/src/components/Table.tsx`) ahora agrega automáticamente una columna final con un ícono de flecha (›) cuando la tabla recibe `onRowClick`, sin tener que tocar cada página. Aplica solo, sin cambios adicionales, a las tres tablas que ya usaban `onRowClick`: Activos (`Assets.tsx`), Historial e resultado agrupado de Escaneos (`Scans.tsx`).

- Archivo: `frontend/src/components/Table.tsx`

## 7. Historial: agrupar por componente en escaneos de tipo HOST

**Pedido:** al abrir el detalle de un escaneo de un activo completo (tipo HOST, con varios componentes), en vez de listar todas las vulnerabilidades juntas, agruparlas por componente primero y ver el detalle de cada uno recién al seleccionarlo — mismo patrón que ya existía para GLOBAL/ENTORNO (agrupado por activo).

**Cambio:** `GroupedVulnerabilityResult` (`Scans.tsx`) se generalizó para agrupar por el campo que corresponda según el modo del escaneo:
- **ACTIVO** (un solo componente): detalle directo, sin agrupar — no tiene sentido agrupar algo que ya es una sola cosa.
- **HOST** (activo completo, varios componentes): agrupa por `componentName`. Se ve "Componente" en la tabla resumen, con cantidad de vulnerabilidades y severidad más alta; clic en una fila → detalle de ese componente, con "← Volver al resumen".
- **GLOBAL/ENTORNO** (varios activos): igual que antes, agrupa por `asset`.

`groupByAsset()` se reemplazó por `groupVulns(vulns, field, fallback)`, genérica sobre el campo de agrupación (`asset` o `componentName`). Se sacó `COMPONENT_NAME_COLUMN` (ya no hace falta, era la columna extra que mezclaba todo en una lista plana para HOST).

Verificado con el reporte `SCN-2026-000056` (HOST, 4 componentes, 31 vulnerabilidades): el resumen agrupa correctamente por componente (`craftcms/cms 5.0.0` → 25, `kobako 0.1.0` → 1, etc.) y el drill-down muestra el detalle real de cada uno.

**Extensión: misma jerarquía para GLOBAL/ENTORNO.** Como esos modos abarcan varios activos (y cada uno puede tener varios componentes), se generalizó a un drill-down de **N niveles** en vez de uno solo: `path: string[]` guarda el valor elegido en cada nivel, y `levels` define la secuencia de campos a agrupar según el modo (`ACTIVO`: sin niveles → detalle directo; `HOST`: `[componentName]`; `GLOBAL`/`ENTORNO`: `[asset, componentName]`). En cada paso se filtra por todos los niveles ya elegidos y se agrupa por el siguiente nivel pendiente; al llegar al final de la cadena se muestra el detalle plano. El botón "← Volver" retrocede un nivel a la vez (no salta directo al resumen completo), con breadcrumb (`Activo › Componente`) en el encabezado. También se agregó un reset del drill-down cuando cambian los datos (`useEffect` sobre `vulns`), para no arrastrar una selección de un reporte anterior al abrir uno nuevo del historial.

Verificado con `SCN-2026-000049` (GLOBAL, 4 activos): resumen por activo → clic en "Host Inyectado..." → resumen por componente dentro de ese activo (mismos 4 componentes que en el caso HOST) → clic en "craftcms/cms 5.0.0" → detalle de sus 25 vulnerabilidades, con breadcrumb "Host Inyectado... › craftcms/cms 5.0.0".

**Ajuste final: GLOBAL suma el Entorno como primer nivel.** Jerarquía definitiva por modo:
- **ACTIVO** (un componente): detalle directo.
- **HOST** (un activo, varios componentes): Componente.
- **ENTORNO** (fijo, varios activos): Activo → Componente.
- **GLOBAL** (varios entornos): Entorno → Activo → Componente.

El campo `environmentName` no existía en `VulnerabilityAudit` — se agregó en el backend (`VulnerabilityAuditDTO.Response`, `VulnerabilityAuditMapper.resolveEnvironmentName()`, resuelto vía `componente → activo → entorno`) y en el tipo `VulnerabilityAudit` del frontend. `GroupedVulnerabilityResult` pasó de un tipo de campo fijo (`'asset' | 'componentName'`) a un tipo `GroupField` de 3 valores (`environmentName | asset | componentName`), reutilizando la misma lógica de `path`/`levels` sin cambios estructurales — solo se sumó `'environmentName'` como primer elemento de `levels` cuando `mode === 'GLOBAL'`.

Verificado con `SCN-2026-000049` (GLOBAL): resumen por Entorno (Producción 31, Testing 4, Desarrollo 27 = 62 total) → clic en "Producción" → Activo dentro de ese entorno ("Host Inyectado...", 31) → sigue igual que antes hacia Componente → Vulnerabilidades.

- Archivos: `backend/src/main/java/.../dto/VulnerabilityAuditDTO.java`, `backend/src/main/java/.../mapper/VulnerabilityAuditMapper.java`, `frontend/src/types/index.ts`, `frontend/src/pages/Scans.tsx`

## 8. Paginación en las tablas que lo necesitaban

**Pedido:** aplicar paginación en las tablas de la app que pueden crecer mucho, para no cargar/renderizar todo de una.

**Tablas cubiertas (6):**
1. Historial de Escaneos (`Scans.tsx`) — **server-side**.
2. Log de errores del sistema (Config → Errores, `Settings.tsx`) — **server-side**.
3. Software de un Activo (modal de cada activo, `Assets.tsx`) — cliente, `pageSize=15`.
4. Activos — Vigentes (`Assets.tsx`) — cliente, `pageSize=20`.
5. Activos — Eliminados (`Assets.tsx`) — cliente, `pageSize=20`.
6. Detalle de vulnerabilidades de un componente (último nivel del drill-down, `Scans.tsx`) — cliente, `pageSize=20`.

Quedaron afuera (catálogos chicos/acotados por diseño, no logs que crecen solos): Usuarios, Asignaciones, Entornos, Tipos de Activo, Ecosistemas, y las tablas de comparación entre 2 escaneos / resúmenes agrupados del drill-down (acotadas por la cantidad real de esas entidades en un escaneo puntual).

### Diseño

**`Table.tsx`** (componente compartido) ahora soporta paginación con un solo prop nuevo (`pageSize`), en dos modos:
- **Cliente** (`pageSize` solo): la tabla asume que `data` ya trae TODO el dataset, y hace el slice y maneja el número de página internamente (`useState` propio). Al cambiar `data` (nueva búsqueda/filtro) vuelve a la página 1 sola.
- **Servidor** (`pageSize` + `page` + `totalItems` + `onPageChange`): `data` es solo la página actual: la tabla delega la navegación al padre vía `onPageChange` y calcula `totalPages` a partir de `totalItems`.

El footer de paginación (`Mostrando X–Y de Z · Página N de M · Anterior/Siguiente`) solo se muestra cuando hay más de una página — con pocas filas la tabla se ve exactamente igual que antes.

### Backend (Historial + Log de errores)

Ninguno de los dos endpoints paginaba antes — `scan-reports` tenía un `.limit(200)` fijo (sin forma de ver más allá) y `system-errors` traía directamente los "últimos 50". Se convirtieron a `Page<T>` real de Spring Data:
- `ScanReportRepository.search(...)`: se agregó `Pageable` + un `countQuery` explícito (necesario porque es una query nativa con `SELECT *`, Spring Data no puede derivar el conteo solo).
- `SystemErrorRepository`: `findTop50ByOrderByErrorDateDesc()` → `findAllByOrderByErrorDateDesc(Pageable)`.
- Ambos controllers ahora aceptan `page`/`size` (default `page=0`, `size=20`) y devuelven `Page<T>` (Spring lo serializa con `content`/`totalElements`/`totalPages`/`number`/`size`).
- Frontend: nuevo tipo `PageResponse<T>` (`types/index.ts`) reflejando esa forma.

**Cuidado particular:** el selector de "Comparar escaneos" en Historial usaba la misma lista `history` que la tabla para poblar sus dos `<select>`. Como `history` ahora solo trae la página visible (20 de 52), eso hubiera roto el comparador silenciosamente (solo dejaría elegir entre 20 escaneos). Se le dio su propia carga independiente (`compareOptions`, hasta 100 escaneos con los mismos filtros activos) para no perder alcance -- verificado con las 52 opciones reales disponibles en el selector.

- Archivos: `backend/src/main/java/.../repository/ScanReportRepository.java`, `backend/src/main/java/.../controller/ScanController.java`, `backend/src/main/java/.../repository/SystemErrorRepository.java`, `backend/src/main/java/.../controller/SystemErrorController.java`, `frontend/src/components/Table.tsx`, `frontend/src/types/index.ts`, `frontend/src/services/api.ts`, `frontend/src/pages/Scans.tsx`, `frontend/src/pages/Settings.tsx`, `frontend/src/pages/Assets.tsx`

## 9. Filtro por código en el Historial de Escaneos

**Pedido:** poder buscar en el Historial por el código del escaneo (`SCN-2026-000056`), no solo por tipo/objetivo/fecha.

**Cambio:** nuevo filtro "Código" (búsqueda parcial, case-insensitive -- `ILIKE '%valor%'`), mismo criterio que el resto de las búsquedas de la app.
- Backend: `ScanReportRepository.search()` suma el parámetro `publicCode` (con su `countQuery` actualizado igual); `ScanController.history()` lo expone como query param opcional.
- Frontend: nuevo input "Código" al principio de los filtros del Historial (`Scans.tsx`), se aplica junto con el resto solo al presionar "Buscar" (mismo comportamiento que ya tenían los demás filtros).

Verificado: buscar "056" filtra correctamente a `SCN-2026-000056` (1 resultado de 52).

- Archivos: `backend/src/main/java/.../repository/ScanReportRepository.java`, `backend/src/main/java/.../controller/ScanController.java`, `frontend/src/services/api.ts`, `frontend/src/pages/Scans.tsx`

## 10. Comparador de escaneos: secciones desplegables

**Pedido:** en el resultado de "Comparar escaneos", las 4 secciones (Nuevas en B / Persistentes / Resueltas desde A / Cambios de severidad) mostraban sus tablas completas todas juntas de una. Que cada una sea un desplegable que se abra al hacer click.

**Cambio:** nuevo componente `CompareSection` (`Scans.tsx`), basado en `<details>`/`<summary>` nativo del navegador -- colapsado por defecto, con flechita que rota al abrir/cerrar (`ChevronDown` + `group-open:rotate-180`). Cada una de las 4 secciones del comparador es ahora un `CompareSection` independiente; se pueden abrir varias a la vez o mantenerlas todas cerradas, sin JS de estado propio (lo maneja el navegador).

Verificado con una comparación real (`SCN-2026-000043` vs `SCN-2026-000056`): las 4 secciones arrancan colapsadas mostrando solo título + contador, y cada una despliega su tabla real al hacer click de forma independiente.

- Archivo: `frontend/src/pages/Scans.tsx`

## 11. Tablero de Auditoría (Kanban): más contexto por vulnerabilidad

**Pedido:** el analista que usa el Kanban no tenía forma de saber qué es una vulnerabilidad ni cómo solucionarla — la tarjeta y el modal solo mostraban CVE/CVSS/prioridad/host y un campo de texto libre.

**Diagnóstico:** el pipeline de n8n ya calculaba, por cada hallazgo, la versión que lo parcha, si es zero-day, y un plan de acción genérico (plantilla tipo "Actualizar a vX según ventana de mantenimiento") — pero se descartaban antes de persistir, o quedaban en una columna que el Kanban nunca lee. Se decidió **no usar los planes de acción generados** (son demasiado genéricos para el alcance actual) y en su lugar traer la descripción real de la advisory de GitHub.

### Frente 1 — exponer lo que ya estaba en la base
- `software`/`ecosystem`/`installedVersion` del componente afectado, sumados a `VulnerabilityAuditDTO` (ya vivían en `SoftwareComponent`, solo faltaba exponerlos).
- Links directos a NVD (`nvd.nist.gov/vuln/detail/{cveId}`) y GitHub Advisory (`github.com/advisories/{ghsaId}`) en el modal.
- Tarjeta del Kanban (`VulnerabilityCard.tsx`): ahora muestra el paquete afectado (no solo el host), y un indicador si hay parche disponible o si es zero-day.

### Frente 2 — persistir `patched_version`/`is_zero_day` (ya calculados, se descartaban)
- Columnas nuevas en `vulnerabilities_audit` y `asset_vulnerabilities` (`init/13-vulnerability-remediation-facts.sql`).
- n8n (`Persist_Audit_Findings`): el INSERT ahora también guarda `patched_version`/`is_zero_day` (ya calculados en `Risk_Assessment_Engine`, antes se descartaban). Se sacó `decision` del INSERT -- ya no se usa el plan de acción genérico.
- `VulnerabilityAuditService.applyLifecycle()`: copia `patchedVersion`/`isZeroDay` desde el hallazgo hacia `AssetVulnerability` (la tabla persistente que lee el Kanban) en las 3 ramas (crear/actualizar/reabrir).

**Bug de fondo encontrado y arreglado (no era de esta sesión, preexistente):** `applyLifecycle()` nunca actualizaba `asset_vulnerabilities` de forma confiable -- ni mis campos nuevos ni los que ya existían (`priority`, `cvss`, `exploited`). Causa: el nodo que le avisa al backend "el escaneo terminó" (`Persist_Scan_Statistics`) y el que persiste cada hallazgo (`Persist_Audit_Findings`) son dos ramas paralelas del mismo nodo `Risk_Assessment_Engine`/`Validate_Asset_Match`, sin dependencia real entre sí -- el aviso podía llegar antes de que terminaran de guardarse los 100+ hallazgos de un escaneo Global.

**Fix:** nuevo nodo `Wait_For_Findings_Persisted` (Merge, modo "Choose Branch", con los defaults de n8n -- "esperar todas las entradas, usar los datos del input 1") intercalado entre `[Consolidate_Audit_Results, Persist_Audit_Findings]` y `Compute_Audit_Metrics`, para que el aviso de "completado" espere a que el guardado de hallazgos termine de verdad. Primer intento con parámetros incorrectos (`output: "input1"`, una clave que no existe en el esquema real) rompió el cierre del escaneo por completo -- se revirtió de inmediato, se verificó el baseline restaurado, y se investigó el esquema correcto entrando a la interfaz de n8n (`localhost:5678`) para copiar la configuración real del nodo antes de reintentar.

Verificado con un escaneo Global real: `asset_vulnerabilities` pasó de 56 a 123 filas (se completaron las que faltaban), con 102 con `patched_version` y 9 marcadas `is_zero_day` -- visibles en el Kanban real.

### Frente 3 — descripción real de la vulnerabilidad (nunca se guardaba)
En vez de threadear `summary`/`description` a través del pipeline de n8n (ya de por sí frágil, como confirmó el bug de arriba), se resolvió del lado del backend, desacoplado:
- Tabla nueva `ghsa_advisory_cache` (`init/14-ghsa-advisory-cache.sql`) -- una fila por advisory (GHSA ID), no por vulnerabilidad, porque el mismo CVE puede repetirse en varios componentes/activos.
- `GhsaAdvisoryService`: la primera vez que se pide un GHSA ID no visto, lo trae de `api.github.com/advisories/{ghsaId}` (misma API pública que ya usa n8n, sin token necesario con el volumen actual) y lo cachea. Las siguientes veces sirve desde la cache.
- `GET /api/ghsa-advisories/{ghsaId}` (`GhsaAdvisoryController`), llamado desde el frontend al abrir una tarjeta del Kanban.
- Modal del Kanban: nuevo bloque "Descripción de la vulnerabilidad" (resumen + descripción completa + links de referencia), con estados de carga/error, y el campo de notas se renombró a "Notas del analista" para dejar claro que es de uso del analista, no una guía del sistema.

Verificado con `CVE-2026-10532`/`logback-core`: el modal trae y muestra el resumen y la descripción real de la advisory de GitHub, con sus referencias (changelog, release de GitHub, la advisory misma).

- Archivos: `backend/.../model/VulnerabilityAudit.java`, `AssetVulnerability.java`, `GhsaAdvisoryCache.java`, `dto/VulnerabilityAuditDTO.java`, `GhsaAdvisoryDTO.java`, `mapper/VulnerabilityAuditMapper.java`, `service/VulnerabilityAuditService.java`, `GhsaAdvisoryService.java`, `controller/GhsaAdvisoryController.java`, `repository/GhsaAdvisoryCacheRepository.java`, `exception/GhsaAdvisoryUnavailableException.java`, `init/13-*.sql`, `init/14-*.sql`, `workflows/Pipeline de Gestión Automatizada de Vulnerabilidades (VMP).json`, `frontend/src/pages/Kanban.tsx`, `frontend/src/components/VulnerabilityCard.tsx`, `frontend/src/types/index.ts`, `frontend/src/services/api.ts`

## 12. Filtro por criticidad en el Kanban

**Pedido:** poder filtrar el tablero de Auditoría por criticidad (CRITICAL/HIGH/MEDIUM/LOW), además de los filtros de fecha y estado que ya tenía.

**Cambio:** nuevo selector "Todas las criticidades" en `Kanban.tsx`, mismo patrón que el filtro de estado existente (client-side, sobre `rawVulns` ya cargado). Verificado con "Critical": filtra correctamente en las 3 columnas a la vez (8 en Detectadas, 0 en En Análisis, 2 en Resueltas).

- Archivo: `frontend/src/pages/Kanban.tsx`

## 13. Sección Informes: exportación de PDFs

**Pedido:** una sección nueva para exportar información en PDF sobre CVEs/vulnerabilidades. El pedido explícito fue investigar primero cómo se trabaja esto en ciberseguridad (qué tipos de informes se suelen generar) y armar un plan antes de implementar.

**Investigación:** los informes de gestión de vulnerabilidades más comunes en la industria (Nessus/Qualys/OpenVAS, entregables de consultoría) se agrupan en 4 tipos según la audiencia: informe técnico de un escaneo puntual (analistas), informe comparativo/trend entre dos momentos (evidencia de progreso), resumen ejecutivo sin jerga técnica (gerencia), y ficha de un CVE puntual (cualquiera que pregunte "¿esto nos afecta?"). Se dejó fuera del alcance el informe de cumplimiento (ISO 27001/PCI-DSS/NIST) porque GEF Secure no gestiona marcos normativos hoy. Plan aprobado por el usuario: los 4 tipos restantes.

**Cambio — backend:**
- Dependencia nueva: `com.github.librepdf:openpdf:1.3.30` (línea 1.3.x con el paquete clásico `com.lowagie.text` -- OpenPDF 3.x lo migró a `org.openpdf` e incluye cambios incompatibles).
- `ReportPdfService`: arma los 4 PDFs reutilizando servicios ya existentes sin duplicar lógica de negocio -- `ScanReportRepository` + `VulnerabilityAuditService.findByScanReport` para el informe de escaneo, `VulnerabilityAuditService.compareScans` para el comparativo, `DashboardService.getStats` para el resumen ejecutivo, y `GhsaAdvisoryService.getByGhsaId` + un nuevo método de `AssetVulnerabilityRepository` (`findByCveIdIgnoreCaseOrGhsaIdIgnoreCase`) para la ficha de CVE (busca por CVE o GHSA, cualquiera que tenga a mano el usuario).
- `ReportController`: 4 endpoints GET bajo `/api/reports` (`/scan/{id}`, `/comparison?scanAId&scanBId`, `/executive`, `/cve/{identifier}`), devuelven `application/pdf` con `Content-Disposition: attachment`. Sin `@PreAuthorize` propio -- cualquier usuario autenticado, mismo criterio que `GhsaAdvisoryController`.
- Repositorio: se agregó también `findTop10ByPriorityAndDetectionStatusOrderByLastDetectedAtDesc` para destacar las críticas abiertas más urgentes en el resumen ejecutivo.
- Tests nuevos (`ReportPdfServiceTest`): escaneo inexistente rechazado, PDF válido generado (`%PDF` en los primeros bytes) para escaneo y resumen ejecutivo, CVE sin activos afectados rechazado.

**Cambio — frontend:**
- Página nueva `Informes.tsx` (ruta `/informes`, ítem propio en el sidebar): 4 tarjetas, una por tipo de informe, cada una con sus filtros (selector de escaneo, selector de par de escaneos, sin filtro para el ejecutivo, campo de texto para el identificador CVE/GHSA) y su botón "Exportar PDF".
- `reportApi` (`services/api.ts`) pide cada endpoint con `responseType: 'blob'`; `utils/downloadFile.ts` (`downloadBlob`) dispara la descarga real en el navegador.
- Interceptor de errores de Axios: como los endpoints de reportes piden blob, un error del backend llega como `Blob` en vez de JSON parseado -- se agregó lectura async del blob cuando su `type` es JSON, para no perder el mensaje real (ej: "no se encontraron activos afectados por...").
- Botones de exportación embebidos en el flujo existente, no solo en la página nueva: modal de detalle de un escaneo del historial y vista de "Comparar escaneos" (`Scans.tsx`), y modal de gestión de una vulnerabilidad del Kanban (`Kanban.tsx`, "Exportar ficha PDF", habilitado solo si el hallazgo tiene CVE o GHSA ID).

Verificado end-to-end con Playwright contra los contenedores reales (`fede.frankenberger`, escaneos reales del historial): los 4 PDFs se descargan y renderizan correctamente -- severidades con color, tablas de hallazgos, KPIs del resumen ejecutivo con datos reales (138 activos, 123 vulnerabilidades, 8 críticas abiertas), y la ficha de `CVE-2026-50280` trae la descripción real cacheada de GHSA con todos los activos afectados.

- Archivos: `backend/build.gradle`, `backend/.../service/ReportPdfService.java`, `controller/ReportController.java`, `repository/AssetVulnerabilityRepository.java`, `test/.../ReportPdfServiceTest.java`, `frontend/src/pages/Informes.tsx`, `services/api.ts`, `utils/downloadFile.ts`, `components/Sidebar.tsx`, `App.tsx`, `pages/Scans.tsx`, `pages/Kanban.tsx`

## 14. Estado del sistema "Desconocido" en el Dashboard + rediseño del fix de la carrera en n8n

**Pedido:** el Dashboard mostraba "Estado del sistema: Desconocido" a pesar de haber escaneos completados recientes.

**Diagnóstico:** `DashboardService.getStats()` tomaba el escaneo más reciente por `executed_at DESC` y leía su `system_status`. Postgres pone los `NULL` **primero** en un `ORDER BY ... DESC` por defecto -- y había 6 escaneos trabados en `RUNNING` (`executed_at`/`system_status` ambos `NULL`) que le ganaban al último escaneo que sí había terminado.

**Investigando por qué había escaneos trabados**, aparecieron dos causas distintas mezcladas:
- 5 de los 6 correspondían al bug ya documentado como fuera de alcance (escaneo con 0 resultados nunca cierra el `scan_report`) -- sigue sin resolverse, queda igual fuera de alcance.
- El sexto (`SCN-2026-000068`, un escaneo GLOBAL con 129 hallazgos reales, todos persistidos correctamente) reveló que **el fix de la carrera de la sección 11** (nodo `Wait_For_Findings_Persisted`, modo "Choose Branch" + "Wait for All Inputs to Arrive") **no es confiable**: inspeccionando la ejecución real en n8n, el nodo se ejecutó pero emitió 0 items ("no items were sent on this branch") a pesar de que sus dos entradas sí tenían datos -- el aviso de "escaneo completo" nunca llegaba al backend aunque los hallazgos se hubieran guardado bien.

**Fix del Dashboard:** `ScanReportRepository.findFirstByExecutedAtNotNullOrderByExecutedAtDesc()` reemplaza a `findAllByOrderByExecutedAtDesc(PageRequest.of(0,1))` -- toma el último escaneo que **terminó de verdad**, no el más reciente por fecha a secas.

**Rediseño del fix de la carrera (elimina el Merge/Wait por completo):** en vez de un nodo que "espera" a que ambas ramas lleguen (una condición de tiempo, propensa a fallar), se reordena el grafo para que la dependencia sea de **datos reales**, no de timing:
- Antes: `Risk_Assessment_Engine` alimentaba en paralelo a `Consolidate_Audit_Results` y a `Persist_Audit_Findings`; un Merge esperaba a que ambas ramas "llegaran".
- Ahora: `Risk_Assessment_Engine` → `Persist_Audit_Findings` (INSERT) → nodo nuevo `Reattach_Audit_Findings` (Code, `return $('Risk_Assessment_Engine').all();`) → `Consolidate_Audit_Results` → `Compute_Audit_Metrics` directo. `Consolidate_Audit_Results` solo puede recibir esa rama **después** de que el INSERT terminó, porque es la única forma en que `Reattach_Audit_Findings` tiene algo que devolver -- no hay forma de que llegue "antes de tiempo". Se eliminó `Wait_For_Findings_Persisted`.

Verificado disparando 3 escaneos GLOBAL reales seguidos: los 3 cerraron correctamente (`executed_at` seteado, `system_status` real) en el primer chequeo cada vez, con hallazgos persistidos consistentes (160 detectados / 129 auditados, igual que antes). Dashboard confirmado mostrando "⚠️ ACCIÓN REQUERIDA" en vez de "Desconocido".

- Archivos: `backend/.../repository/ScanReportRepository.java`, `service/DashboardService.java`, `workflows/Pipeline de Gestión Automatizada de Vulnerabilidades (VMP).json`

**Limpieza de los 6 escaneos que quedaron trabados en `RUNNING`** (datos históricos, de antes del fix -- no requería código, se hizo con `UPDATE` directo sobre `scan_reports`):
- Los 5 de "0 resultados" (`SCN-2026-000050/052/054/055/057`) → `status = 'FAILED'`, `executed_at = started_at` (no `NOW()`, para no aparecer como "el más reciente"), `system_status = '❌ ESCANEO FALLIDO'`, `error_message` con la explicación.
- `SCN-2026-000068` (el GLOBAL con 129 hallazgos reales) → `status = 'PARTIALLY_COMPLETED'` en vez de `FAILED` (sí hizo trabajo útil), con `total_detected`/`criticals`/`highs`/`mediums`/`lows` reconstruidos desde `vulnerabilities_audit` (129 / 10 / 45 / 60 / 14) en vez de quedar en cero. No se tocaron ni se borraron filas de `vulnerabilities_audit` en ningún caso (los 5 de 0 resultados no tenían hallazgos vinculados; los 129 de scan 68 son historial real).

Verificado en el Historial real: los 6 pasan a mostrar el badge "❌ ESCANEO FALLIDO" en vez de quedar en blanco/colgados, y `SELECT count(*) FROM scan_reports WHERE executed_at IS NULL` da 0.

### Explícitamente fuera de alcance (evolución futura, ver `GEF_Secure_Analisis_Inventario_Agente_Vulnerabilidades.md`)

- Agente permanente (registro, heartbeat, análisis bajo demanda).
- Descubrimiento de apps de escritorio (requeriría una fuente CPE/NVD nueva, GHSA no las cubre).
- Descubrimiento de red.
- Fix del bug de fondo en n8n (escaneo con 0 resultados no cierra el `scan_report`).
