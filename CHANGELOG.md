# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/) de forma
laxa (producto en etapa temprana, sin releases formales más allá de la marca `v2.0.0`).

## [Unreleased]

### Added
- Mejoras al sistema de tracking de remediación (ciclos, transiciones de estado,
  trazabilidad de evidencia).
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

### Fixed
- Corrección de bugs varios detectados en la ronda de auditoría posterior a v2.0.0.
- El botón "Ver Kanban" (vista Resumen de Vulnerabilidades) navegaba a una ruta
  que ya era la actual en vez de cambiar de tab — ahora usa la prop `onGoToKanban`.
- El banner de estado del Dashboard podía desincronizarse del listado real de
  "Requiere atención" al leer un campo agregado del backend en vez de derivar del
  mismo cálculo que la tabla — ahora usa una única fuente de verdad.
- Test de `Assets.scan.test.tsx` que quedó roto tras agregar la columna de estado
  de seguridad a Inventario (mock de `vulnApi` faltante).

### Changed
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
