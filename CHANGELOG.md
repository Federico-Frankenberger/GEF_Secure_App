# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/) de forma
laxa (producto en etapa temprana, sin releases formales más allá de la marca `v2.0.0`).

## [Unreleased]

### Fixed
- Remediación de la auditoría dirigida a Informes/Configuración/Landing
  (`docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md`):
  - **Crítico — CFG-ENV-DELETE**: `DELETE /api/environments/{id}` no
    verificaba si había activos usándolo (la FK tiene `ON DELETE SET NULL`,
    no `RESTRICT`) — cualquier ADMIN podía desvincular activos reales de un
    entorno sin ninguna confirmación (se reprodujo, por accidente, durante la
    propia auditoría — recuperado sin pérdida de datos). Ahora rechaza con
    409 si el entorno tiene activos, igual que ya hacía `UserService`.
  - **Alto — RPT-GHSA-404**: la Ficha de CVE/GHSA rompía con 500
    (`UnexpectedRollbackException`) para cualquier CVE cuyo GHSA asociado ya
    no existiera en GitHub, aunque el código ya atrapaba el error a propósito
    para degradar sin descripción. Causa raíz: `GhsaAdvisoryService.getByGhsaId()`
    compartía la transacción de su caller (`ReportPdfService`) y la marcaba
    rollback-only al fallar. Cambiado a `Propagation.REQUIRES_NEW`.
  - **Medio — RPT-DAYS-VALIDATION**: el parámetro `days` de los reportes de
    remediación/vulnerabilidades no se validaba (`days=abc` daba 500,
    `days=-5` se aceptaba sin sentido). Ahora valida (`@Min(1)`) y da 400
    con un mensaje claro en ambos casos.
  - **Bajo — CFG-CATALOG-DELETE**: borrar un Ecosistema o Tipo de Host en uso
    no avisaba del impacto (texto libre, sin FK) — ahora rechaza con 409 si
    hay componentes/activos usándolo, mismo criterio que Entornos.

### Added
- **Tests automatizados para la lógica crítica de n8n** (`workflows/tests/`,
  paquete Node/Vitest aislado, nuevo job `n8n-logic` en CI): cerraba el gap
  recurrente en las 5 auditorías end-to-end de "n8n no tiene ningún test,
  solo se verifica leyendo código a mano". Cubre las 2 piezas de lógica más
  frágiles del nodo `Risk_Assessment_Engine` — `compareVersions()` (semver,
  ya tuvo un bug real, N8N-04) y el fallback de identidad `ghsa_id`/`cve_id`
  (fix CVE-NULL de hoy) — con un mecanismo de "sincronía por equivalencia":
  cada test corre tanto contra una copia standalone tested como contra el
  código real extraído en vivo del JSON del workflow, así que si alguien
  edita el nodo y cambia el comportamiento, el test lo detecta sin necesitar
  un pipeline de build que sincronice archivos. Verificado provocando una
  regresión a propósito (revirtiendo temporalmente el fix CVE-NULL) y
  confirmando que el test falla con un mensaje claro, no solo leyendo el código.
- **Plan de confiabilidad y despliegue (2026-08-24)**, tras la 5ª auditoría end-to-end:
  - `docker-compose.prod.yml` **probado en ejecución real** (no solo sintaxis):
    levantado con secretos generados de verdad en un proyecto Docker aislado
    (volúmenes propios, sin tocar los de desarrollo) — backend arranca con
    perfil `prod` sin fallar el `SecretsValidator`, Swagger queda inaccesible,
    `pgadmin`/`n8n` sin puertos publicados, login + lectura autenticada
    funcionan de punta a punta. `docker-compose.prod.yml` deja de estar "no
    verificado en ejecución" (`CHECKLIST_DESPLIEGUE.md` actualizado).
  - **N8N-03 (concurrencia de escaneos)**: `AssetVulnerability` ahora tiene
    locking optimista real (`@Version`, columna `version`) además del orden
    determinístico ya existente (que solo evitaba el deadlock, no un pisado
    silencioso bajo otro intercalado de timing). `WebhookController` reintenta
    ante un conflicto de versión con el mismo mecanismo que ya usaba para
    deadlocks de Postgres (`ConcurrencyFailureException`, ancestro común de
    ambos). Un conflicto entre dos ediciones manuales simultáneas del Kanban
    ahora da un 409 claro en vez de un 500 genérico.
  - **Identidad CVE-NULL que puede migrar**: si una advisory guardada sin CVE
    (`cve_id = ghsa_id`, ver fix anterior) recibe más tarde un CVE real de
    GitHub, el sistema ya no crea un `AssetVulnerability` duplicado — reconoce
    que es el mismo caso por su `ghsa_id` (estable) y migra el `cve_id`.

### Fixed
- **BADGE-RACE** (5ª auditoría end-to-end, `docs/bitacora/24-08-26/AUDITORIA_END_TO_END_2.md`):
  el badge "ecosistema no reconocido" (agregado en la remediación de la 4ª
  auditoría) podía mostrarse como falso positivo sobre un ecosistema válido
  durante la fracción de segundo en que el catálogo (`ecosystemApi.getAll()`)
  todavía no terminó de cargar — con la lista vacía, cualquier valor parecía
  "no reconocido". Ahora no se evalúa mientras la lista esté vacía.
- Remediación de hallazgos de la 4ª auditoría end-to-end
  (`docs/bitacora/24-08-26/AUDITORIA_END_TO_END.md`):
  - **CVE-NULL**: dos advisories sin CVE (solo GHSA) sobre el mismo componente
    colisionaban en la misma fila de tracking (`cve_id="N/A"` para ambas,
    `UNIQUE(software_component_id, cve_id)`). El nodo `Risk_Assessment_Engine`
    (n8n) ahora usa el propio `ghsa_id` como respaldo cuando no hay CVE real.
  - Faltaba escapar comillas simples en 2 parámetros (`filtro_entorno`,
    `filtro_activo`) en 2 queries SQL de n8n (`Check_Internal_Assets` y,
    hallazgo adicional al de la auditoría, `Get_Installed_Packages`) — ya
    escapaban `package.name`/`package.ecosystem` pero no estos dos.
  - `Fetch_CISA_KEV` (n8n) no tenía manejo de error — si CISA caía, tiraba
    abajo todo el escaneo. Ahora degrada limpiamente (`continueRegularOutput`)
    sin perder la detección de explotación activa para el resto del pipeline.
  - `software_components.id=6` ("postgres") tenía `ecosystem='Docker'`, un
    valor que nunca existió en el catálogo real — nunca iba a poder buscar
    vulnerabilidades, sin ningún aviso. Corregido el dato (seed + base actual)
    y agregado un badge "ecosistema no reconocido" en Activos → Software para
    que un caso similar no vuelva a pasar desapercibido.
- **Crítico**: `completeAutomatic()` (webhook de escaneo automático diario) no tenía
  guarda de idempotencia contra entregas duplicadas (a diferencia de `complete()`, que
  sí la tiene) — un reintento de red de n8n podía crear un segundo `ScanReport` sin
  alcance que `applyLifecycle()` interpretaba como "escaneo global que no vio nada",
  auto-resolviendo por ausencia **todo** el inventario de vulnerabilidades abiertas de
  la organización. Ahora una segunda completación automática dentro de la misma hora
  es un no-op.
- Una vulnerabilidad reabierta por un escaneo automático que llegaba huérfana
  (`scan_id` sin vincular) y se reconciliaba tarde (barrido de 12hs, no la ventana
  reactiva de 60 min) nunca disparaba la reapertura real — el Kanban podía seguir
  mostrándola como resuelta indefinidamente. Ahora la reconciliación de huérfanos
  vuelve a correr el ciclo de vida sobre los escaneos afectados.
- Un caso marcado "Resuelta" manualmente (antes de que el sistema confirmara la
  ausencia por escaneo) no se reabría al volver a detectarse — quedaba oculto como
  resuelto mientras los datos de fondo se actualizaban en silencio. Unificada la
  condición de reapertura para cubrir ambos ejes de estado.
- El cierre automático por ausencia dejaba el estado de triage congelado (ej. "En
  análisis" para siempre) y nunca registraba la fecha de resolución — el caso quedaba
  invisible tanto en el Kanban como en las métricas de "resueltos". Ahora se cierra
  igual que el resto de los casos.
- Una reapertura automática no limpiaba los campos de cierre anteriores (fecha de
  resolución, justificación, riesgo aceptado hasta...) — un caso reabierto podía
  seguir mostrando "riesgo aceptado" de un ciclo ya cerrado.
- El contador de "casos reabiertos" (Informes → Remediación y Dashboard) ignoraba el
  período seleccionado y solo contaba reaperturas automáticas, no las manuales desde
  el Kanban — subestimaba la tasa real de recurrencia.

### Added
- `docker-compose.prod.yml`: compose de producción standalone (activa
  `SPRING_PROFILES_ACTIVE=prod`, sin `ports:` para pgAdmin/n8n) — cierra el
  pendiente de despliegue documentado en `CHECKLIST_DESPLIEGUE.md` (CFG-02/03,
  DOCKER-01). No reemplaza ni modifica el compose de desarrollo.
- Mejoras al sistema de tracking de remediación (ciclos, transiciones de estado,
  trazabilidad de evidencia).
- Rediseño de "Configuración" en un Centro de Administración de 3 grupos (antes 6 tabs
  planos): **Usuarios y Accesos** unifica los antiguos tabs "Usuarios" y "Asignaciones"
  en una sola tabla (Usuario · Rol · Activos asignados · Estado · Acciones), agregando
  la vista que faltaba (elegir un usuario y ver/gestionar todos sus activos, antes solo
  se podía al revés); **Catálogos** agrupa Entornos/Tipos de Host/Ecosistemas, ahora de
  solo lectura para `SECURITY_ANALYST`/`AUDITOR` (antes solo Entornos); **Sistema**
  contiene el Log de Errores. Se agregó estado activo/inactivo para usuarios (desactivar
  en vez de borrar, preserva asignaciones/auditoría histórica) con un endpoint nuevo
  `PATCH /api/users/{id}/active`, bloqueado para auto-desactivación.
- Landing pública comercial (`/`) para visitantes no autenticados, con redirección
  automática al Dashboard para sesiones ya logueadas.
- Rediseño del módulo de Vulnerabilidades en 4 vistas — Resumen, Análisis, Listado
  (con filtros/orden/paginación server-side y estado de SLA por vencimiento) y
  Kanban — todas sobre la misma ruta y el mismo detalle de hallazgo compartido.
- MTTR **verificado**: se suma al MTTR declarado en el Dashboard, contando solo
  cierres con evidencia técnica real (E4+), no una declaración humana.
- Backup real de Postgres + n8n (`scripts/backup.sh` / `scripts/restore.sh`), con
  rotación automática de los últimos 14.
- Rate limiting en `/api/auth/login` (10 intentos/min por IP).
- Reconciliación automática de hallazgos huérfanos de escaneos automáticos
  (`scan_id` sin vincular) al escaneo más cercano en el tiempo.
- CI/CD con GitHub Actions (tests de backend y frontend en cada push/PR),
  Dependabot (gradle/npm/github-actions) y CodeQL (Java + TypeScript).
- Cobertura de tests del frontend ampliada de 1 a 5 archivos (11 tests), todos
  regresión de bugs reales encontrados y corregidos en esta ronda.
- Rediseño completo de "Informes" en un Centro de Informes de Seguridad de 3
  pestañas: Resumen Ejecutivo, Remediación (MTTR, SLA, y dos desgloses nuevos
  por tipo de cierre VEX y por nivel de evidencia -- datos que existían pero
  ningún endpoint exponía) y Ficha de CVE/GHSA (ahora con vista previa en vivo
  antes de exportar). Los informes de escaneo puntual/comparativo se retiraron
  de esta sección -- ya viven, mejor resueltos, en Escaneos → Historial. La
  vista de análisis de vulnerabilidades por período (tendencia/SLA/fuentes) se
  unificó en un solo lugar -- vive solo en Vulnerabilidades → Análisis (con
  botón "Exportar PDF" agregado ahí), en vez de duplicarse en Informes. El
  Resumen Ejecutivo mostraba las mismas tarjetas de KPI que el Dashboard
  (Total Activos, Vulnerabilidades, Abiertas, Críticas, MTTR...), lo cual
  vaciaba de sentido el nombre de la sección -- ahora muestra indicadores
  propios que no están en el Dashboard: activos con exposición, explotación
  conocida, nuevas/resueltas en 7 días, % de cumplimiento de SLA y cantidad en
  catálogo CISA KEV. Los PDF generados ahora incluyen logo, pie de página con
  autoría/paginación y una paleta de severidad reconciliada con la del resto
  de la app.

### Fixed
- Corrección de bugs varios detectados en la ronda de auditoría posterior a v2.0.0.
- El botón "Ver Kanban" (vista Resumen de Vulnerabilidades) navegaba a una ruta
  que ya era la actual en vez de cambiar de tab — ahora usa la prop `onGoToKanban`.
- El banner de estado del Dashboard podía desincronizarse del listado real de
  "Requiere atención" al leer un campo agregado del backend en vez de derivar del
  mismo cálculo que la tabla — ahora usa una única fuente de verdad.
- Test de `Assets.scan.test.tsx` que quedó roto tras agregar la columna de estado
  de seguridad a Inventario (mock de `vulnApi` faltante).
- `ReportController` (sección "Informes": escaneo puntual, comparativo, resumen
  ejecutivo, ficha CVE) no tenía ningún `@PreAuthorize` — cualquier rol autenticado
  podía generar estos PDFs por API directa aunque el frontend ya ocultaba la
  sección para `ASSET_OWNER`/`AUDITOR`. Ahora `ADMIN`/`SECURITY_ANALYST`/`AUDITOR`
  tienen acceso real (frontend y backend sincronizados); `ASSET_OWNER` queda
  afuera de ambos lados.
- Borrar un usuario con vulnerabilidades asignadas fallaba con un mensaje genérico
  de "violación de integridad" (409 sin orientar qué hacer) — ahora da un mensaje
  específico indicando reasignar o desactivar en su lugar. De paso, el catch original
  no disparaba nunca (Hibernate difiere el `DELETE` real hasta el flush de la
  transacción, no hasta la llamada a `deleteById()`) — se agregó un `flush()`
  explícito para que la violación de FK se pueda atrapar donde corresponde.

### Changed
- Frontend: las 6 páginas autenticadas (Dashboard, Escaneos, Activos, Kanban,
  Informes, Config) ahora se cargan con `React.lazy()` en vez de estar todas en
  el bundle inicial — bajó de un único chunk de 938KB a un `index` de ~309KB
  más un chunk propio por página.
- Todos los ítems de deuda técnica registrados en `docs/deuda-tecnica.md` (DT-01 a
  DT-11) fueron cerrados — implementados, verificados sin bug, o documentados como
  decisión consciente de no implementar (ver el archivo para el detalle de cada uno).

## [2.0.0] - Release v2.0.0

### Added
- Validación del ciclo de vida de vulnerabilidades: máquina de estados para
  `triageStatus` (DETECTADA → EN_ANALISIS → RESUELTA) con transiciones permitidas
  explícitas.
- Cálculo real de MTTR (tiempo medio de resolución) en el Dashboard, desde
  detección hasta resolución.
- Centro de Escaneos: disparo de escaneos por activo, por entorno o global desde
  la UI, con seguimiento de progreso vía polling.
- Despliegue automatizado de n8n (imagen custom + `bootstrap.sh`): creación de
  usuario owner, carga de credenciales y publicación de workflows sin pasos
  manuales en la interfaz de n8n.

### Fixed
- Filtro de fecha del Kanban (mostraba resultados incorrectos al no limpiarse
  el filtro por defecto).

## [0.1.0] - Carga inicial

### Added
- Primera versión funcional del backend y frontend (inventario de activos,
  autenticación básica, primeras integraciones).
