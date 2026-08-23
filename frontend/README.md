# Frontend — GEF Secure

React 18 + TypeScript + Vite.

## Comandos

```bash
npm run dev        # servidor de desarrollo (Vite, puerto 5173, proxy /api -> localhost:8081)
npm run build      # build de producción
npm run preview    # servir el build de producción localmente
npm run lint       # eslint
npm run test       # vitest run
```

En uso normal el frontend se sirve vía `docker compose up -d` desde la raíz del repo (nginx, puerto 3000). Estos comandos son para desarrollo local.

## Estructura (`src/`)

| Carpeta | Contenido |
|---|---|
| `pages/` | Una por ruta: Landing (pública, `/`), Dashboard, Assets (Inventario), Kanban (módulo de Vulnerabilidades: 4 vistas Resumen/Análisis/Listado/Kanban), Scans (Centro de Escaneos), Login, Informes, Settings |
| `components/` | Compartidos: Layout, Sidebar, RequireAuth, Modal, PageHeader, StatCard, Table, VulnerabilityCard, SoftwareAutocomplete |
| `components/vulnerabilidades/` | Las 3 vistas agregadas del módulo de Vulnerabilidades: `VulnerabilidadesResumen`, `VulnerabilidadesAnalisis`, `VulnerabilidadesListado` |
| `components/landing/` | Secciones de la Landing pública (Hero, Features, FAQ, etc.) |
| `contexts/` | `AuthContext` — único estado global (auth/sesión) |
| `hooks/` | `useScanPolling` — polling de escaneos en curso |
| `services/` | `api.ts` — cliente axios único + todos los módulos de API |
| `types/` | Tipos TS compartidos |
| `utils/` | Helpers (ej. `downloadFile`) |

Detalle de routing, gating de roles y diseño del Kanban: [`docs/architecture/03-frontend.md`](../docs/architecture/03-frontend.md).

## Estado — convención

No hay Redux, Zustand ni React Query. El patrón del proyecto es `useState`/`useEffect`/`useMemo` por página más un único `AuthContext` para sesión (persistida en `localStorage`: `gef_token`, `gef_user`). Mantené este patrón salvo que aparezca una necesidad real de estado compartido entre páginas que no sea auth — no introduzcas una librería de estado global para un caso puntual.

## Testing

Vitest + Testing Library (`vite.config.ts`, `src/test/setup.ts`, que incluye polyfills de `matchMedia` e `IntersectionObserver` que jsdom no trae — los necesita cualquier componente de `components/landing/`). 5 archivos de test hoy, todos regresión de un bug real encontrado y corregido, no relleno genérico:

| Archivo | Cubre |
|---|---|
| `pages/Assets.scan.test.tsx` | Race condition de doble click en el botón de escaneo |
| `pages/Dashboard.banner.test.tsx` | El banner de estado deriva de la misma lista que "Requiere atención", no de un campo agregado aparte |
| `components/vulnerabilidades/VulnerabilidadesResumen.test.tsx` | El botón "Ver Kanban" cambia de tab (prop), no navega por router |
| `components/vulnerabilidades/slaStateOf.test.ts` | Lógica pura de estado de SLA (vencido/próximo/en plazo) |
| `pages/Landing.auth.test.tsx` | Redirect a `/dashboard` requiere usuario Y token juntos en localStorage |

Al tocar una página, considerá sumarle un test en el mismo cambio si toca lógica no trivial — sigue siendo cobertura parcial, no exhaustiva.

## API

Toda la comunicación con el backend pasa por `src/services/api.ts`: instancia axios única con `baseURL: '/api'`, interceptor de request que agrega `Authorization: Bearer <token>`, e interceptor de response que en un 401 limpia la sesión y redirige a `/login`.
