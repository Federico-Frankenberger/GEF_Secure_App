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
| `pages/` | Una por ruta: Dashboard, Assets (Inventario), Kanban, Scans (Centro de Escaneos), Login, Informes, Settings |
| `components/` | Compartidos: Layout, Sidebar, RequireAuth, Modal, PageHeader, StatCard, Table, VulnerabilityCard, SoftwareAutocomplete |
| `contexts/` | `AuthContext` — único estado global (auth/sesión) |
| `hooks/` | `useScanPolling` — polling de escaneos en curso |
| `services/` | `api.ts` — cliente axios único + todos los módulos de API |
| `types/` | Tipos TS compartidos |
| `utils/` | Helpers (ej. `downloadFile`) |

Detalle de routing, gating de roles y diseño del Kanban: [`docs/architecture/03-frontend.md`](../docs/architecture/03-frontend.md).

## Estado — convención

No hay Redux, Zustand ni React Query. El patrón del proyecto es `useState`/`useEffect`/`useMemo` por página más un único `AuthContext` para sesión (persistida en `localStorage`: `gef_token`, `gef_user`). Mantené este patrón salvo que aparezca una necesidad real de estado compartido entre páginas que no sea auth — no introduzcas una librería de estado global para un caso puntual.

## Testing — gap conocido

Vitest + Testing Library están configurados (`vite.config.ts`, `src/test/setup.ts`), pero **hoy existe un solo archivo de test**: `pages/Assets.scan.test.tsx` (cubre un fix de race condition de doble click en el botón de escaneo). Esto es un gap de cobertura real, no un estado deseado — al tocar una página, considerá si vale la pena sumarle tests en el mismo cambio en vez de asumir que ya está cubierta.

## API

Toda la comunicación con el backend pasa por `src/services/api.ts`: instancia axios única con `baseURL: '/api'`, interceptor de request que agrega `Authorization: Bearer <token>`, e interceptor de response que en un 401 limpia la sesión y redirige a `/login`.
