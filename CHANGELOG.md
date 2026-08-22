# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/) de forma
laxa (producto en etapa temprana, sin releases formales más allá de la marca `v2.0.0`).

## [Unreleased]

### Added
- Mejoras al sistema de tracking de remediación (ciclos, transiciones de estado,
  trazabilidad de evidencia).

### Fixed
- Corrección de bugs varios detectados en la ronda de auditoría posterior a v2.0.0.

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
