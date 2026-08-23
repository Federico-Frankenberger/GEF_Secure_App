# Funcionalidades

Organizadas por épica y luego por historia de usuario. Mapeadas a las páginas reales del frontend (`frontend/src/pages/`).

## Épica 1: Inventario de activos

### US-001 — Registrar y organizar activos por entorno
**Como** ADMIN o SECURITY_ANALYST
**Quiero** dar de alta activos (hosts) asociados a un entorno con criticidad de negocio
**Para** que el motor de scoring pondere correctamente el riesgo según dónde vive cada activo

**Criterios de aceptación**:
- [ ] CA-1: un activo pertenece a exactamente un entorno
- [ ] CA-2: el borrado es soft-delete (deletedAt), recuperable vía `/api/assets/deleted` + `/restore`

**Reglas relacionadas**: RN-RBAC-02

### US-002 — Importar inventario de software (SBOM)
**Como** SECURITY_ANALYST
**Quiero** importar un SBOM generado con Syft
**Para** poblar automáticamente los componentes de software instalados en un activo, sin cargarlos a mano

**Criterios de aceptación**:
- [ ] CA-1: preview antes de confirmar la importación (`POST /{id}/inventory/preview`)
- [ ] CA-2: límite de 15-20MB por archivo (multipart config)

**Reglas relacionadas**: —

## Épica 2: Escaneo de vulnerabilidades

### US-003 — Disparar un escaneo manual
**Como** SECURITY_ANALYST
**Quiero** disparar un escaneo por activo, por componente de software, por entorno o global
**Para** obtener el estado de vulnerabilidades actualizado bajo demanda

**Criterios de aceptación**:
- [ ] CA-1: la UI hace polling acotado (timeouts distintos por alcance: 30s/45s/60s/90s) hasta que el reporte esté listo
- [ ] CA-2: un doble click no dispara dos escaneos (cubierto por test `Assets.scan.test.tsx`)

**Reglas relacionadas**: RN-SCAN-01, RN-SCAN-02

### US-004 — Escaneo global automático diario
**Como** sistema
**Quiero** ejecutar un escaneo global sin intervención humana todos los días a las 09:00
**Para** mantener el inventario actualizado sin depender de que alguien lo dispare manualmente

**Criterios de aceptación**:
- [ ] CA-1: disparado por el trigger `Scan_Scheduler` de n8n, no por el backend

**Reglas relacionadas**: RN-SCAN-01

## Épica 3: Gestión de vulnerabilidades (Resumen, Análisis, Listado, Kanban)

Módulo con 4 vistas sobre la misma ruta (`/kanban`, `frontend/src/pages/Kanban.tsx`
exporta `Vulnerabilidades`) y el mismo modal de detalle compartido — el Kanban ya
no es la única vista de este módulo, es una de cuatro.

### US-010 — Ver el riesgo agregado y qué requiere atención ahora
**Como** cualquier rol autenticado
**Quiero** ver, al entrar al módulo, un resumen de riesgo (críticas abiertas, explotadas, próximas a vencer SLA) y la lista de hallazgos que requieren atención
**Para** saber qué mirar primero sin tener que interpretar el Kanban completo

**Criterios de aceptación**:
- [ ] CA-1: el botón "Ver Kanban" cambia al tab Kanban (prop `onGoToKanban`), no navega por router — ya está en la misma ruta (cubierto por `VulnerabilidadesResumen.test.tsx`)
- [ ] CA-2: la lista de "requiere atención" es la única fuente de verdad para el estado del sistema — el Dashboard deriva su banner de la misma lista, no de un campo agregado aparte (cubierto por `Dashboard.banner.test.tsx`)

**Reglas relacionadas**: —

### US-011 — Investigar el listado completo con filtros y SLA
**Como** SECURITY_ANALYST o ADMIN
**Quiero** una tabla filtrable/ordenable (severidad, estado, activo, componente, responsable, explotada, CISA KEV) con paginación server-side y una columna de estado de SLA
**Para** investigar hallazgos puntuales sin descargar todo el dataset al navegador

**Criterios de aceptación**:
- [ ] CA-1: el estado de SLA (Vencido / Próximo a vencer / En plazo) se calcula por `dueDate` — vencido si ya pasó, próximo si faltan menos de 7 días, en plazo si faltan 7 o más (`slaStateOf`, cubierto por `slaStateOf.test.ts`)
- [ ] CA-2: cambiar cualquier filtro vuelve a la primera página; guardar un hallazgo desde el detalle refresca el listado sin resetear los filtros activos

**Reglas relacionadas**: —

### US-005 — Triagear un hallazgo en el Kanban
**Como** SECURITY_ANALYST
**Quiero** mover un hallazgo entre columnas DETECTADA → EN_ANALISIS → RESUELTA
**Para** llevar el estado de análisis de forma visual y auditable

**Criterios de aceptación**:
- [ ] CA-1: las transiciones inválidas están bloqueadas por `TRANSICIONES_PERMITIDAS`
- [ ] CA-2: AUDITOR no puede arrastrar tarjetas (`isAuditor` deshabilita drag-and-drop en la UI, y el backend igual lo rechazaría)

**Reglas relacionadas**: RN-VUL-01, RN-VUL-03, RN-RBAC-03

### US-006 — Cerrar un hallazgo con justificación VEX
**Como** SECURITY_ANALYST
**Quiero** cerrar una vulnerabilidad indicando MITIGADA / NO_APLICA / RIESGO_ACEPTADO con justificación
**Para** que el cierre quede defendible ante una auditoría externa

**Criterios de aceptación**:
- [ ] CA-1: `justification` es obligatorio
- [ ] CA-2: RIESGO_ACEPTADO exige `acceptedBy` + `riskAcceptedUntil`

**Reglas relacionadas**: RN-VUL-04

## Épica 4: Dashboard y reportes

### US-007 — Ver MTTR y KPIs en el Dashboard
**Como** cualquier rol autenticado
**Quiero** ver MTTR declarado, tasa de recurrencia y desgloses por severidad
**Para** entender la salud de la remediación de un vistazo

**Criterios de aceptación**:
- [ ] CA-1: MTTR se muestra en horas si es menor a 1 día, en días con 1 decimal en caso contrario
- [ ] CA-2: MTTR **verificado** se muestra junto al declarado — solo cuenta cierres con `evidenceLevel` E4+ (verificación técnica real, ej. un inventario posterior que confirma la versión corregida), no una declaración humana. Devuelve vacío si todavía no hay ningún cierre con esa evidencia, nunca un número inventado

**Reglas relacionadas**: RN-VUL-06

### US-008 — Exportar reportes PDF
**Como** SECURITY_ANALYST
**Quiero** exportar un reporte ejecutivo, por escaneo, por comparación o por CVE
**Para** compartir el estado de seguridad fuera del sistema

**Criterios de aceptación**:
- [ ] CA-1: timeout de exportación de 30s (mayor al resto de la API, por el costo de generar PDF)

**Reglas relacionadas**: —

## Épica 5: Administración y RBAC

### US-009 — Gestionar usuarios y su scoping de activos
**Como** ADMIN
**Quiero** crear usuarios con un rol y, si son ASSET_OWNER, asignarles activos específicos
**Para** limitar el acceso según responsabilidad real

**Criterios de aceptación**:
- [ ] CA-1: ASSET_OWNER sin asignaciones no ve ningún activo
- [ ] CA-2: el catálogo de tipos de activo/ecosistemas es editable solo por ADMIN

**Reglas relacionadas**: RN-RBAC-01, RN-RBAC-02

## Épica 6: Landing pública

### US-012 — Presentar el producto antes del login
**Como** visitante no autenticado
**Quiero** ver una landing comercial en `/` que explique el producto (problema/solución, cómo funciona, features, arquitectura de seguridad, FAQ, contacto)
**Para** entender de qué se trata GEF Secure antes de pedir acceso

**Criterios de aceptación**:
- [ ] CA-1: un usuario ya autenticado que llega a `/` es redirigido a `/dashboard` — la landing nunca se le muestra a una sesión activa (requiere usuario Y token juntos en localStorage, no solo uno de los dos — cubierto por `Landing.auth.test.tsx`)
- [ ] CA-2: sin sesión, `/` muestra la landing completa, no un formulario de login directo

**Reglas relacionadas**: —
