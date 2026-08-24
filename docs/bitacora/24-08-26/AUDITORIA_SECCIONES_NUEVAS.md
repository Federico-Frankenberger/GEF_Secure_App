# Auditoría dirigida — Informes, Configuración y Landing (2026-08-24)

Primera auditoría exhaustiva de estas 3 secciones (las más nuevas del
proyecto), que en las 5 corridas end-to-end previas solo tuvieron
verificación dirigida, no completa. Solo diagnóstico — sin cambios de código,
sin commits. Se usaron datos de prueba descartables donde hizo falta
reproducir algo en vivo, limpiados al terminar cada verificación.

## ⚠️ Aviso importante sobre esta corrida

Al reproducir en vivo el hallazgo #1 (borrado de un Entorno en uso), la
prueba **efectivamente borró el entorno real "Producción"** (no una copia de
prueba) — el `DELETE` no tiene ninguna protección, así que se ejecutó sin
aviso. Esto puso en `NULL` el `environment_id` de 2 activos reales
(`Backend Producción` id=4, `Database Producción` id=5). **Se detectó
inmediatamente y se reparó en el momento**: se recreó el entorno "Producción"
(mismo nombre/criticidad/descripción) y se reasignaron ambos activos. Los
datos quedaron funcionalmente restaurados, con dos diferencias cosméticas
residuales: el entorno recreado tiene `id=4` (antes `id=3`) y `createdAt` de
hoy (antes, la fecha del seed original). Ningún otro dato se vio afectado
(confirmado por consulta directa a la base tras la reparación). Este mismo
incidente es, a la vez, la evidencia en vivo del hallazgo #1 de abajo.

---

## 1. Resumen ejecutivo

De las 3 secciones, **Configuración es la más sólida** (RBAC, activar/
desactivar, asignación de activos, todo confirmado correcto) con una excepción
real y seria: el catálogo de Entornos no tiene ninguna protección de borrado.
**Informes tiene un bug de backend real y reproducible** que rompe la Ficha de
CVE/GHSA para cualquier caso cuyo GHSA asociado ya no exista en GitHub —
probable con el correr del tiempo, no un caso de laboratorio. **Landing está
limpia**, sin hallazgos.

## 2. Informes

### Verificado correcto (CONFIRMADO en vivo)
- RBAC: `ASSET_OWNER` recibe `403` en `/executive`, `/remediation`, `/cve/{id}/preview` — confirmado con token real.
- Generación de PDF: `executive`, `remediation`, `vulnerabilities` generan PDFs válidos (`200`, tamaño >50KB, cabecera `%PDF-1.5` real) con datos de la base real, no hardcodeados.
- `GET /cve/{identifier}/preview` para un identificador que no existe devuelve `200 {"found":false,...}` — limpio, no 404/500.

### Hallazgos

**[ALTO] [CONFIRMADO] La Ficha de CVE/GHSA (preview y PDF completo) rompe con 500 si el GHSA asociado ya no existe en GitHub**

Reproducido en vivo con datos reales: `GET /api/reports/cve/CVE-2024-10977` y su `/preview` devuelven `500` para un CVE que sí existe en la base, con hallazgos reales asociados.

Causa raíz (confirmada en logs): `GhsaAdvisoryService.getByGhsaId()` está anotado `@Transactional` y lanza `GhsaAdvisoryUnavailableException` cuando GitHub devuelve `404` (la advisory `GHSA-w22j-27h8-4gjq` ya no existe/cambió en GitHub). `ReportPdfService.fetchAdvisoryOrNull()` atrapa esa excepción y devuelve `null` a propósito (para degradar sin romper el informe) — pero como la excepción ya cruzó el borde de un método `@Transactional` que participa de la MISMA transacción que `generateCveReport()`/`previewCve()`, Spring ya marcó la transacción como `rollback-only` antes de que el `catch` la viera. Al terminar el método exterior, Spring intenta hacer commit, encuentra la marca, y tira `UnexpectedRollbackException` — que cae en el handler genérico (500), aunque el PDF/preview se hubiera armado bien en memoria.

```
org.springframework.transaction.UnexpectedRollbackException: Transaction silently rolled back because it has been marked as rollback-only
	at ...TransactionAspectSupport.commitTransactionAfterReturning
	at ...ReportPdfService$$SpringCGLIB$$0.generateCveReport
```

Impacto: cualquier CVE/GHSA cuya advisory sea retirada, renombrada, o deje de existir en GitHub (algo que pasa con el tiempo, GitHub sí retira advisories) rompe esta funcionalidad para ese caso puntual, sin recuperación posible desde el frontend.

Solución recomendada: `getByGhsaId()` no necesita compartir la transacción del caller (es una llamada HTTP externa + posible lectura de caché, no escribe nada que dependa de la transacción exterior) — cambiar a `@Transactional(propagation = Propagation.REQUIRES_NEW)`, o quitarle `@Transactional` si no escribe nada propio. Alternativa más simple: que `fetchAdvisoryOrNull` no dependa de atrapar la excepción para degradar, sino que el propio `getByGhsaId` maneje el 404 internamente y devuelva `null`/`Optional.empty()` en vez de lanzar, evitando que la excepción cruce el borde transaccional en absoluto.

Archivos: `backend/src/main/java/com/gef/gefsecureapp/service/ReportPdfService.java` (líneas 190, 223, 295-304), `backend/src/main/java/com/gef/gefsecureapp/service/GhsaAdvisoryService.java` (línea 44-45).

Tests necesarios: uno que fuerce `GhsaAdvisoryService` a lanzar la excepción dentro de `generateCveReport`/`previewCve` y confirme que el método SÍ completa (PDF/preview sin descripción), en vez de propagar `UnexpectedRollbackException` — hoy no existe ningún test que cubra este camino.

**[MEDIO] [CONFIRMADO] El parámetro `days` de `/api/reports/remediation` y `/api/reports/vulnerabilities` no valida entrada**

- `days=abc` → `500` genérico (`MethodArgumentTypeMismatchException` sin handler dedicado en `GlobalExceptionHandler`, cae al catch-all).
- `days=-5` → `200`, genera un PDF igual (con una ventana de tiempo invertida/sin sentido) en vez de rechazar con `400`.

Archivos: `backend/src/main/java/com/gef/gefsecureapp/controller/ReportController.java` (líneas 72, 79). Solución recomendada: agregar `@Min(1)` al parámetro y un `@ExceptionHandler(MethodArgumentTypeMismatchException.class)` en `GlobalExceptionHandler` (mismo patrón que ya usa para `MethodArgumentNotValidException`).

## 3. Configuración

### Verificado correcto (CONFIRMADO en vivo, con datos de prueba descartables)
- RBAC: `ANALYST` recibe `403` en `PATCH /users/{id}/active` y en `POST /ecosystems`; `ASSET_OWNER` recibe `403` en `GET /api/users`.
- Ciclo completo activar/desactivar: usuario nuevo → login OK → desactivado → login rechazado (`401`, mismo mensaje genérico anti-enumeración) → borrado de limpieza sin dependencias, OK.
- Guarda de autodesactivación: `ADMIN` intentando desactivarse a sí mismo → `409` con mensaje claro.
- `UserDTO.Request` (usado por el `PUT` genérico) **no tiene** el campo `active` — confirmado por código que no existe ninguna vía de bypass de la guarda de autodesactivación a través del PUT genérico (el mapper no podría tocar ese campo aunque quisiera).
- Asignación de activos: crear activo de prueba → `ASSET_OWNER` sin acceso (`404`) → asignar vía `POST /assets/{id}/assignments` → acceso inmediato (`200`) → confirmado también en la vista inversa `GET /users/{id}/assignments` → desasignar y borrar, limpio.
- Buscador de la tabla de usuarios: filtro por `.includes()` sobre 4 campos, sin riesgo de excepción con substrings vacíos o caracteres especiales (revisión de código, ya tenía verificación en vivo de una sesión anterior).

### Hallazgos

**[CRÍTICO] [CONFIRMADO — reproducido en vivo por accidente, ver aviso al inicio] Borrar un Entorno en uso no tiene ninguna protección**

`DELETE /api/environments/{id}` no verifica si hay `assets` apuntando a ese entorno. La FK `fk_assets_environment` tiene `ON DELETE SET NULL` (no `NO ACTION`/`RESTRICT`), así que el borrado **siempre tiene éxito (`204`)**, y cualquier activo que apuntaba a ese entorno queda con `environment_id = NULL` en silencio — sin error, sin confirmación, sin aviso al ADMIN de cuántos activos se van a desvincular.

Esto es inconsistente con el propio patrón ya usado en `UserService.delete()` (que sí detecta la violación de integridad de `asset_vulnerabilities` y da un mensaje claro) — acá ni siquiera hay una violación que atrapar, porque el `ON DELETE SET NULL` la evita a nivel de base, ocultando el problema en vez de superficiarlo.

Mismo patrón aplica, en menor medida, a `AssetTypeController`/`EcosystemController` — pero esos catálogos son texto libre sin FK real (confirmado: `SoftwareComponent.ecosystem`/`Asset.assetType` no tienen `@ManyToOne`), así que borrarlos no corrompe ninguna fila -- solo hace que componentes existentes con ese valor empiecen a mostrarse como "no reconocido" (badge agregado en la ronda de remediación anterior) sin aviso. Ver hallazgo BAJO más abajo.

Impacto real: cualquier `ADMIN` puede, sin querer (un doble click, un id equivocado en una llamada directa a la API), desvincular todos los activos de un entorno completo — incluida "Producción" — sin ninguna confirmación de "este entorno tiene N activos, ¿seguro?".

Solución recomendada: replicar el patrón de `UserService.delete()` — antes de borrar, contar activos con ese `environment_id`; si hay alguno, rechazar con `409` y un mensaje claro ("No se puede eliminar: hay N activo(s) en este entorno. Reasignalos primero."). Alternativa: cambiar el `ON DELETE` de la FK a `RESTRICT`/`NO ACTION` (como ya tiene `scan_reports_environment_id_fkey`) y dejar que el `DataIntegrityViolationException` ya manejado por `GlobalExceptionHandler` lo cubra (aunque con el mensaje genérico, no uno específico).

Archivos: `backend/src/main/java/com/gef/gefsecureapp/controller/EnvironmentController.java` (línea 60-65), `backend/src/main/java/com/gef/gefsecureapp/service/EnvironmentService.java` (si se crea, hoy la lógica vive toda en el controller), migración de FK si se opta por esa vía.

Tests necesarios: test de integración/unitario que confirme rechazo al borrar un `Environment` con `Asset`s asociados.

**[BAJO] [CONFIRMADO] Borrar un Ecosistema/Tipo de Host en uso no avisa del impacto**

Confirmado con un ecosistema de prueba sin uso (sin efecto). Por análisis de código: como no hay FK, el borrado de un ecosistema/tipo de host que SÍ está en uso por componentes reales tiene éxito sin aviso, y esos componentes empiezan a mostrar el badge "no reconocido" (o pierden la opción correspondiente en el `<select>` de edición) sin que el ADMIN se entere de qué componentes se vieron afectados. Menor severidad que el de Entornos porque no hay pérdida de dato relacional, solo una degradación silenciosa de la validación.

## 4. Landing

### Verificado correcto (CONFIRMADO en vivo)
- Pública de verdad: `curl` sin token → `200`.
- Mismos headers de seguridad que el resto del sitio (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, CSP) — sin excepción especial ni relajación.
- El proxy `/api/*` de nginx sigue exigiendo auth (`401`) incluso llamado desde el origen de la Landing — no hay ninguna fuga de datos reales por ahí.
- Por código: la redirección a `/dashboard` para un usuario ya autenticado está implementada correctamente (`Landing.tsx`, `if (isAuthenticated) return <Navigate to="/dashboard" replace />`) — mismo patrón ya usado y confirmado en otras rutas protegidas de la app.
- Componentes de `frontend/src/components/landing/*`: todo contenido estático/marketing, sin llamadas a APIs externas de terceros (analytics, fonts vía Google Fonts ya contemplado en el CSP existente) — consistente con el resto del sitio.

### Sin hallazgos relevantes en esta sección.

## 5. Matriz de hallazgos

| ID | Severidad | Estado | Sección | Problema |
|---|---|---|---|---|
| CFG-ENV-DELETE | CRÍTICO | CONFIRMADO (repro en vivo) | Configuración | Borrar un Entorno en uso no tiene protección — desvincula activos reales en silencio |
| RPT-GHSA-404 | ALTO | CONFIRMADO (repro en vivo) | Informes | Ficha de CVE/GHSA rompe con 500 si el GHSA ya no existe en GitHub |
| RPT-DAYS-VALIDATION | MEDIO | CONFIRMADO (repro en vivo) | Informes | `days` sin validar: no-numérico → 500, negativo → aceptado sin sentido |
| CFG-CATALOG-DELETE | BAJO | CONFIRMADO (parcial) / análisis de código | Configuración | Borrar Ecosistema/Tipo de Host en uso no avisa impacto |

## 6. Top problemas

1. **CFG-ENV-DELETE** — el más serio: puede desvincular activos de producción reales sin ninguna confirmación (y de hecho lo hizo, por accidente, durante esta misma auditoría).
2. **RPT-GHSA-404** — rompe una funcionalidad de cara al usuario (Ficha de CVE/GHSA) para datos que envejecen naturalmente; no es un caso de laboratorio, es cuestión de tiempo.
3. **RPT-DAYS-VALIDATION** — menor, pero un `500` por un parámetro mal tipeado es exactamente el tipo de detalle que ya se corrigió en otros endpoints de este mismo proyecto.

## 7. Conclusión

**No, estas 3 secciones no estaban tan sólidas como el resto del sistema** — y esta auditoría lo confirma con evidencia en vivo, no solo con sospecha. Informes y Landing están cerca (Landing sin hallazgos, Informes con un bug real pero acotado a un caso de borde específico). Configuración tiene el hallazgo más serio de esta corrida: el borrado de Entornos sin protección, que además se demostró destructivo en la práctica durante la propia verificación. Antes de confiar en Configuración al mismo nivel que el resto del sistema, correspondería cerrar CFG-ENV-DELETE — es exactamente el mismo tipo de bug (falta de guardas en un `delete()`) que ya se corrigió para usuarios en la ronda de remediación anterior, solo que nunca se replicó para entornos.
