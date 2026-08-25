# 0009 — Sin librería de estado global en el frontend

## Status

Accepted

## Context

El frontend tiene estado que se comparte entre páginas (la sesión del usuario
autenticado) y estado que es propio de cada página (filtros del Kanban, datos cargados
del backend, formularios). Frameworks como Redux, Zustand o React Query existen
justamente para resolver esto de forma centralizada y con caché/sincronización
automática entre componentes.

## Decision

GEF Secure no usa ninguna librería de gestión de estado global. El único estado
verdaderamente compartido (sesión/usuario autenticado) vive en un `AuthContext.tsx` con
la Context API nativa de React, persistido en `localStorage` (`gef_token`, `gef_user`).
Todo el resto del estado (datos de página, filtros, formularios) se maneja localmente
por componente con `useState`/`useEffect`/`useMemo`/`useCallback`, sin caché de datos
del servidor ni sincronización automática entre páginas — cada página vuelve a pedir
sus datos al backend cuando se monta.

## Consequences

**Positive**
- Cero dependencias adicionales para gestión de estado — menos superficie de
  aprendizaje y de mantenimiento para un equipo chico.
- El flujo de datos de cada página es explícito y local — fácil de seguir sin conocer
  un store global compartido.

**Negative**
- Sin caché de requests: navegar entre páginas que muestran datos parcialmente
  superpuestos (ej. Dashboard y Resumen de Vulnerabilidades) vuelve a pedirlos al
  backend cada vez, en vez de reusar una respuesta ya cacheada.
- Sin invalidación/sincronización automática: si dos páginas muestran el mismo dato y
  una lo modifica, la otra no se entera hasta que se vuelve a montar.
- A medida que crezca la cantidad de estado compartido entre páginas, este patrón
  escala peor que una librería dedicada (React Query en particular resuelve
  caché/invalidación de datos del servidor de forma casi transparente).

## Alternatives Considered

**Pendiente de validación humana**: no hay evidencia en el repositorio (commits,
comentarios, documentación previa) de que esto haya sido una decisión evaluada con
alternativas concretas descartadas, ni de en qué momento se tomó. Es plausible que haya
sido orgánico (el proyecto nunca alcanzó una escala de estado compartido que lo
justificara) más que una decisión deliberada de arquitectura desde el inicio. Confirmar
con quien tomó la decisión original antes de completar esta sección con alternativas
específicas — no se inventan acá.
