# GEF Secure — Base de Conocimiento

Base de conocimiento generada a partir del código real (backend, frontend, n8n, base de datos) y de la documentación existente en `docs/`, priorizando `docs/architecture/` y `docs/adr/` (recién sintetizados desde el código actual) por sobre los documentos históricos de `docs/bitacora/` (18-08-26…22-08-26) y `docs/All/`, que quedan como contexto secundario.

## Índice de Archivos

| Archivo | Contenido |
|---------|-----------|
| [01_vision_y_objetivos.md](01_vision_y_objetivos.md) | Propósito, objetivos por rol, alcance v2.0, fuera de alcance |
| [02_descripcion_general.md](02_descripcion_general.md) | Stack tecnológico, arquitectura general, integraciones externas, API REST |
| [03_actores_y_roles.md](03_actores_y_roles.md) | 4 roles + n8n, matriz RBAC, rutas públicas |
| [04_modelo_de_datos.md](04_modelo_de_datos.md) | 15 entidades JPA, ERD, seed data |
| [05_reglas_de_negocio.md](05_reglas_de_negocio.md) | Reglas codificadas (RN-VUL, RN-SCAN, RN-RBAC, RN-AU) |
| [06_funcionalidades.md](06_funcionalidades.md) | 5 épicas, 9 historias de usuario |
| [07_flujos_principales.md](07_flujos_principales.md) | Login, escaneo→detección→notificación, triage y cierre VEX |
| [08_arquitectura_propuesta.md](08_arquitectura_propuesta.md) | Patrones aplicados, estructura de directorios, seguridad, env vars |
| [09_decisiones_y_supuestos.md](09_decisiones_y_supuestos.md) | 8 decisiones (mapeadas a ADRs) + 3 supuestos inferidos |
| [10_preguntas_abiertas.md](10_preguntas_abiertas.md) | 2 inconsistencias detectadas + 5 preguntas priorizadas |
| [13_n8n_automatizacion.md](13_n8n_automatizacion.md) | *(extra)* Pipeline de 49 nodos de n8n en detalle |

## Quick Start para Desarrolladores

1. Entender el dominio → [01](01_vision_y_objetivos.md), [03](03_actores_y_roles.md)
2. Entender los datos → [04](04_modelo_de_datos.md)
3. Entender las reglas → [05](05_reglas_de_negocio.md)
4. Entender la arquitectura → [02](02_descripcion_general.md), [08](08_arquitectura_propuesta.md), [13](13_n8n_automatizacion.md)
5. Implementar → [07](07_flujos_principales.md), [06](06_funcionalidades.md)
6. Antes de codificar → [10](10_preguntas_abiertas.md)

Para el "por qué" detrás de cada decisión, ir a `../docs/adr/`. Para el "cómo" en más profundidad (código, archivo:línea), ir a `../docs/architecture/`.

## Resumen Ejecutivo

GEF Secure cruza el inventario de activos contra GitHub Advisory DB y CISA KEV vía un pipeline externo en n8n, prioriza por criticidad de negocio, y gestiona el ciclo de vida de cada hallazgo con un modelo dual (detección técnica vs. triage analista) y cierre inspirado en VEX. Las decisiones de diseño relevantes están documentadas explícitamente — ver `docs/adr/`.

## KB generada en knowledge-base/

| Archivo | Líneas | Temas cubiertos |
|---------|--------|-----------------|
| 01_vision_y_objetivos.md | 47 | Propósito, 4 roles, alcance v2.0, fuera de alcance, métricas de éxito |
| 02_descripcion_general.md | 46 | Stack, arquitectura (diagrama), integraciones externas, API REST |
| 03_actores_y_roles.md | 30 | 4 roles + n8n, matriz RBAC, rutas públicas |
| 04_modelo_de_datos.md | 66 | 15 entidades, ERD, seed data |
| 05_reglas_de_negocio.md | 39 | 4 dominios de reglas (RN-VUL, RN-SCAN, RN-RBAC, RN-AU) |
| 06_funcionalidades.md | 96 | 5 épicas, 9 historias de usuario |
| 07_flujos_principales.md | 61 | 3 flujos end-to-end con diagramas de secuencia |
| 08_arquitectura_propuesta.md | 66 | Patrones, estructura de directorios, seguridad, env vars |
| 09_decisiones_y_supuestos.md | 51 | 8 decisiones + 3 supuestos con riesgo/validación |
| 10_preguntas_abiertas.md | 26 | 2 inconsistencias + 5 preguntas priorizadas |
| 13_n8n_automatizacion.md | 33 | Provisión del contenedor, pipeline de 49 nodos, credenciales |
