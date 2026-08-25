# 03 — Frontend (React + TypeScript + Vite)

Todo el código vive en `frontend/src/`.

## Estructura

| Carpeta | Contenido |
|---|---|
| `pages/` | Una por ruta: `Landing.tsx`, `Login.tsx`, `Dashboard.tsx`, `Assets.tsx` (Inventario), `Kanban.tsx` (Vulnerabilidades, 4 vistas), `Scans.tsx` (Centro de Escaneos), `Informes.tsx`, `Settings.tsx` |
| `components/` | `Layout.tsx`, `Sidebar.tsx`, `RequireAuth.tsx`, `Modal.tsx`, `PageHeader.tsx`, `StatCard.tsx`, `Table.tsx`, `VulnerabilityCard.tsx`, `SoftwareAutocomplete.tsx`, `landing/` (secciones de la Landing), `vulnerabilidades/` (Resumen/Análisis/Listado del módulo de Vulnerabilidades) |
| `contexts/AuthContext.tsx` | Único estado global: sesión/usuario autenticado |
| `hooks/useScanPolling.ts` | Polling de progreso de scans asíncronos |
| `services/api.ts` | Cliente axios único + todos los módulos de API (~230 líneas) |
| `types/index.ts` | Tipos TS compartidos |
| `utils/downloadFile.ts` | Helper para descarga de blobs |

Entry point: `main.tsx` → `App.tsx` (define las rutas).

## Routing (`App.tsx:14-31`, react-router-dom v6)

- `/` (Landing comercial) y `/login` — públicas, sin auth. Un usuario ya autenticado que visita `/` es redirigido a `/dashboard` (requiere usuario Y token juntos en `localStorage`, no solo uno de los dos — cubierto por `Landing.auth.test.tsx`).
- Todo lo demás envuelto en `<RequireAuth><Layout>`: `/dashboard`, `/scans`, `/assets` (con `/inventory` redirigiendo a `/assets`), `/kanban`, `/informes`, `/settings`; el índice redirige a `/dashboard`.
- Las 6 páginas autenticadas se cargan con `React.lazy()` + `<Suspense>` (no import estático) — bajó el bundle inicial de 938KB a un `index` de ~309KB más un chunk propio por página. `/` (Landing) y `/login` quedan con import estático a propósito (primera pantalla, sin sentido diferirlas).
- `RequireAuth.tsx` chequea `useAuth().isAuthenticated` y redirige a `/login` preservando `state.from` para volver tras el login. `isAuthenticated` se deriva tanto del estado `user` como de la presencia del JWT en `localStorage` (`AuthContext.tsx:48`).

### Gating de rol — importante

`Sidebar.tsx` filtra qué links se muestran según `user.role` — `informes` y `settings` son visibles para `ADMIN`/`SECURITY_ANALYST`/`AUDITOR` (Config/Informes ya tienen su propio sub-gating de solo-lectura para `SECURITY_ANALYST`/`AUDITOR` dentro de la página, ver más abajo). Algunas páginas también condicionan UI por rol — ej. `Kanban.tsx`: `isAuditor` deshabilita edición/drag, `canListUsers`/`canDelete` limitados a `ADMIN`/`SECURITY_ANALYST`.

**Esto es únicamente conveniencia de UI, no un límite de seguridad.** La autorización real está 100% en el backend vía `@PreAuthorize` (ver `02-backend.md` y ADR-0006). Un usuario que manipule el cliente o llame la API directamente queda sujeto exclusivamente a los permisos que el backend valide — el frontend nunca debe considerarse una barrera de control de acceso.

Roles disponibles (ver `Login.tsx:11-16`, con login de demo de un click por rol): `ADMIN`, `SECURITY_ANALYST`, `ASSET_OWNER`, `AUDITOR`.

## Páginas principales

- **Login** — usuario/contraseña + botones de demo login por rol. Muestra un toast si la sesión expiró, mediante un flag en `sessionStorage.gef_session_expired` que setea el interceptor de la API.
- **Dashboard** — `StatCard`s de KPI + gráficos Recharts (Area/Pie/Bar) alimentados por `dashboardApi.getStats()`. Incluye `formatMttr()` (`Dashboard.tsx:26-30`): muestra horas si es menor a un día, si no, días con 1 decimal. También un gráfico de "MTTR declarado por criticidad" y un KPI de "tasa de recurrencia".
- **Kanban** — tablero drag-and-drop (`@hello-pangea/dnd`) con 3 columnas (`DETECTADA`/`EN_ANALISIS`/`RESUELTA`). Filtrado combinado del lado cliente por fecha/estado/prioridad (`Kanban.tsx:63-77`); el filtro de fecha (`filterDate`, línea 45) arranca vacío (muestra todo) con un botón de limpiar (ícono `CalendarX`) — evita el bug histórico de forzar la fecha de hoy por defecto. El modal de edición soporta cierre estilo VEX (`outcome`: `MITIGADA`/`NO_APLICA`/`RIESGO_ACEPTADO`), escala de evidencia E0–E6, consulta de advisory GHSA, y exportación de "ficha" en PDF.
- **Scans / Centro de Escaneos** — usa `useScanPolling` (`hooks/useScanPolling.ts`), que hace polling a `scanApi.latestReport` cada 3s con timeouts distintos por alcance (30s/45s/60s/90s para `ACTIVO`/`HOST`/`ENTORNO`/`GLOBAL`) y limpia el intervalo al desmontar.
- **Assets / Inventario** — CRUD de activos y componentes de software, import de SBOM (`inventoryApi`), botones de disparo de scan. Cubierta por `Assets.scan.test.tsx`, que verifica que un doble click en "Escanear" no dispare `triggerScan` dos veces.
- **Landing** (`/`, pública) — página comercial (problema/solución, cómo funciona, features, arquitectura de seguridad, FAQ, contacto), en `components/landing/`. Redirige a `/dashboard` si ya hay sesión.
- **Informes** — Centro de Informes de Seguridad, 3 pestañas: Resumen Ejecutivo (KPIs propios, sin duplicar los del Dashboard), Remediación (MTTR/SLA/desglose VEX/nivel de evidencia) y Ficha de CVE/GHSA (preview en vivo + export a PDF). La vista de análisis de vulnerabilidades por período (tendencia/SLA/fuentes) vive únicamente en Vulnerabilidades → Análisis, no duplicada acá. Conectada vía `reportApi`.
- **Settings / Configuración** — Centro de Administración en 3 grupos: **Usuarios y Accesos** (tabla unificada, activar/desactivar en vez de solo borrar, asignación de activos a `ASSET_OWNER` con vista bidireccional), **Catálogos** (Entornos/Tipos de Host/Ecosistemas — edición solo `ADMIN`, lectura para `SECURITY_ANALYST`/`AUDITOR`) y **Sistema** (Log de Errores). Conectada vía `userApi`/`assetTypeApi`/`ecosystemApi`/`assetAssignmentApi`.

## Capa de API (`services/api.ts`)

Instancia axios única, `baseURL: '/api'`, proxeada en dev a `http://localhost:8081` (`vite.config.ts:21-29`) y por nginx en producción. El interceptor de request adjunta `Authorization: Bearer <token>` desde `localStorage['gef_token']`. El interceptor de response: ante un 401 (excepto en el propio login) limpia la sesión y redirige a `/login`, marcando el flag de `sessionStorage` para el toast; también desempaqueta cuerpos de error JSON que llegan como Blob para los endpoints `/reports/*` (timeout de 30s vs. 10s por defecto). Módulos expuestos: `authApi`, `environmentApi`, `assetTypeApi`, `ecosystemApi`, `assetApi`, `inventoryApi`, `softwareComponentApi`, `softwareCatalogApi`, `vulnApi`, `userApi`, `assetAssignmentApi`, `dashboardApi`, `scanApi`, `systemErrorApi`, `ghsaAdvisoryApi`, `reportApi`.

## Estado

Sin Redux/Zustand/React Query. `useState`/`useEffect`/`useMemo`/`useCallback` por página, más un único `AuthContext` global para sesión, persistido en `localStorage` (`gef_token`, `gef_user`).

## Build y tooling

Vite 5 + `@vitejs/plugin-react`, TypeScript 5.5, sin path aliases configurados. `vite.config.ts`: `build.assetsDir: 'static'` (evita colisión con la ruta de la app `/assets`), proxy de dev `/api` → `localhost:8081`, puerto 5173. Sin archivos `.env` — la base URL es relativa (`/api`), agnóstica de entorno por diseño (nginx/el proxy resuelven el ruteo).

## Testing

Vitest (`vite.config.ts:16-20`, entorno jsdom, `src/test/setup.ts`) + `@testing-library/react` + `user-event`.

5 archivos / 11 tests, todos regresión de un bug real encontrado y corregido (no tests genéricos de relleno): `Assets.scan.test.tsx` (doble click no dispara un scan dos veces), `Dashboard.banner.test.tsx` (el banner de estado deriva de la misma lista que "Requiere atención", nunca de un campo agregado que podía desincronizarse), `VulnerabilidadesResumen.test.tsx` (el botón "Ver Kanban" cambia de tab, no navega a una ruta que ya es la actual), `slaStateOf.test.ts` (lógica pura de vencimiento de SLA del Listado) y `Landing.auth.test.tsx` (la redirección de la Landing exige usuario Y token juntos, no solo uno).

**Gap conocido**: sigue sin haber cobertura de la mayoría de páginas/componentes — las 5 pruebas existentes son regresiones puntuales, no una suite sistemática.

## Convenciones de UI

Tailwind CSS (paleta custom `brand`/`surface`, fuentes DM Sans/JetBrains Mono, animaciones fade/slide custom) con clases utilitarias propias (`.card`, `.input`, `.btn-primary`, `.btn-ghost` en `src/index.css`). Sin librería de componentes (no MUI/Chakra); íconos vía `lucide-react`; gráficos vía `recharts`; toasts vía `react-hot-toast`; drag-and-drop vía `@hello-pangea/dnd`. Formularios con inputs controlados simples, sin librería de formularios (no react-hook-form/formik).
