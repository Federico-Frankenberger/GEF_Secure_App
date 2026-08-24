# Bucle de reapertura y duplicación de vulnerabilidades ya detectadas

## Contexto

El usuario pidió verificar tres cosas: (1) si una vulnerabilidad marcada como
`RESUELTA` puede volver a detectarse y generar un bucle de remediación sin
control, (2) si una vulnerabilidad ya detectada y todavía abierta (no
resuelta) se **duplica** al volver a aparecer en un escaneo posterior, y (3)
un barrido de comportamientos similares en el mismo dominio (escaneo/
remediación) que puedan tener el mismo tipo de problema. Se hicieron 4
auditorías de solo lectura (reconciliación de escaneos, máquina de estados de
triage, duplicación de hallazgos, y barrido de patrones similares) para
entender el comportamiento REAL del código, sin inventar nada.

**Resultado (2): NO hay duplicación** — el mecanismo ya está bien diseñado,
no requiere fix (detalle en su sección).

**Resultado (1) y (3): 6 problemas reales**, uno de ellos **CRÍTICO** y de
alcance mucho mayor que los otros — puede auto-resolver de golpe TODO el
inventario de vulnerabilidades abiertas de la organización. Detalle abajo,
en orden de severidad.

---

## 🔴 Hallazgo crítico (nuevo, mayor prioridad): `completeAutomatic()` sin guarda de idempotencia — un webhook duplicado puede auto-cerrar TODAS las vulnerabilidades abiertas

**Dónde:** `ScanService.java` — `complete()` (camino manual, líneas 78-105)
SÍ tiene una guarda explícita contra reintentos de n8n:
```java
// M-NUEVO-2: sin esta guarda, una entrega duplicada del mismo callback (n8n
// reintentando por un timeout de red, por ejemplo) volvia a correr applyLifecycle()...
if (!"RUNNING".equals(scan.getStatus())) return scan;
```
`completeAutomatic()` (camino automático, líneas 121-152) **no tiene ningún
equivalente**: cada invocación crea un `ScanReport` nuevo desde cero y lo
procesa, sin comprobar si ese resultado ya fue aplicado antes.

**Por qué esto es grave — secuencia real:**
1. n8n reintenta el POST a `/api/webhook/scan-report` sin `scanId` (mismo
   escenario que motivó la guarda M-NUEVO-2, pero del lado que quedó sin
   protección). La primera entrega ya creó `ScanReport#1` y corrió
   `applyLifecycle(scan#1)` normalmente.
2. La segunda entrega (mismo payload) crea `ScanReport#2`. Como
   `scan#2.softwareComponent`/`.asset`/`.environment` son siempre `null` en
   el camino automático, y ya no quedan huérfanos por vincular (la primera
   corrida ya los vinculó), `applyLifecycle(scan#2)` procesa **0 hallazgos
   propios**.
3. Al no tener alcance (asset/componente/entorno), `findOpenInScope(scan#2)`
   cae en la rama sin scope de `VulnerabilityAuditService.java:896-905`:
   ```java
   } else {
       return assetVulnerabilityRepository.findByDetectionStatus("OPEN");
   }
   ```
   — **todas** las `AssetVulnerability` `OPEN` de toda la organización.
4. Como el payload de `scan#2` tiene cobertura "completa" (mismos totales
   que el payload original), `hasIncompleteCoverage()` da `false`, y el loop
   de cierre por ausencia (líneas 760-768) marca `detectionStatus =
   RESOLVED` en cada una de esas filas, como si un escaneo global real las
   hubiera dejado de ver.

Un simple reintento de red (ya documentado como escenario real observado,
según el comentario M-NUEVO-2 del propio código) puede vaciar de un plumazo
el inventario de vulnerabilidades abiertas de todos los activos.

---

## Los 5 problemas de menor alcance (reapertura de casos puntuales)

### Mecanismo de fondo (para contexto de los 5 puntos siguientes)

`AssetVulnerability` (una fila por `(software_component_id, cve_id)`, con
`UNIQUE` en base) tiene dos ejes de estado separados a propósito:
`detectionStatus` (`OPEN`/`RESOLVED`, lo controla el sistema según los
escaneos) y `triageStatus` (`DETECTADA`/`EN_ANALISIS`/`RESUELTA`, lo controla
el analista vía Kanban). `applyLifecycle(ScanReport)` decide entre 3 ramas
por hallazgo: crear (nuevo), actualizar in-place (ya abierto), o reabrir
(`detectionStatus != OPEN` → fuerza `triageStatus = DETECTADA`, incrementa
`reopenCount`, nuevo `RemediationCycle`/`StateTransition`). Esto es correcto
y esperado para el caso normal — una vulnerabilidad que sigue presente debe
poder reabrirse sin límite de veces; eso no es un bug en sí mismo.

**1. Reapertura que NUNCA ocurre — huérfanos con reconciliación tardía.**
`reconcileOrphanScanLinks()` (cada 30 min) vincula hallazgos sin `scan_id` al
escaneo automático más cercano (ventana 12h) con un `UPDATE` directo — **sin
volver a invocar `applyLifecycle()`**. Si la reaparición de un caso
`RESUELTA` llega por esta vía tardía, el caso **nunca se reabre**: el Kanban
sigue mostrándolo resuelto indefinidamente aunque el escáner lo haya vuelto
a ver.

**2. Reapertura que tampoco ocurre — `RESUELTA` manual sin cierre automático
previo de `detectionStatus`.** Si un analista marca `RESUELTA` a mano antes
de que el sistema ponga `detectionStatus = RESOLVED` (nunca hubo una corrida
con cobertura completa que confirmara la ausencia), la condición de reapertura
(`detectionStatus != OPEN`) no se cumple. Una reaparición del CVE cae en la
rama "ya abierto" (solo actualiza métricas) y **nunca fuerza `triageStatus`
de vuelta a `DETECTADA`** — el caso queda oculto como resuelto mientras los
datos de fondo se actualizan en silencio.

**3. Cierre automático por ausencia deja `triageStatus` congelado
(variante del mismo problema, en el sentido inverso).** Si el escaneo deja
de ver un CVE que un analista tiene en `EN_ANALISIS`, `detectionStatus` pasa
a `RESOLVED` pero **`triageStatus` se queda en `EN_ANALISIS` para siempre**
— y como el DTO que lee el Kanban no expone `detectionStatus` en absoluto,
no hay ninguna señal visible de que el sistema ya lo dio por resuelto.
Además, el cierre automático **tampoco setea `resolvedAt`**, así que ese
caso **nunca aparece en ninguna métrica de "resueltos"** (`resolvedThisMonth`,
`countResolvedSince`, etc.) — queda invisible en ambos sentidos. Efecto
secundario menor: si el analista luego lo cierra manualmente sin saber que
ya había sido auto-resuelto, `recordManualTransition` sobrescribe
`RemediationCycle.closedAt` con el timestamp manual, perdiendo el momento
real del cierre automático (el `StateTransition` histórico sí sobrevive).

**4. Campos VEX/cierre que quedan obsoletos tras una reapertura automática.**
La reapertura manual (`updateStatus()`) sí limpia `resolvedAt`, `outcome`,
`mitigationControl`, `justification`, `acceptedBy`, `riskAcceptedUntil` al
salir de `RESUELTA`. La reapertura automática de `applyLifecycle()` **no
limpia ninguno** — un caso con `outcome = RIESGO_ACEPTADO` y
`riskAcceptedUntil` vencido puede reabrirse por escaneo y seguir mostrando
"riesgo aceptado hasta [fecha pasada]" en un caso que ya está `DETECTADA` de
nuevo.

**5. Métrica `reopenedCasesCount` inconsistente (afecta Informes →
Remediación Y Dashboard).** A diferencia de sus métricas hermanas del mismo
DTO (`outcomeBreakdown`, `evidenceLevelBreakdown`, que sí filtran por
`since`), cuenta `reopenCount > 0` de forma lifetime, ignorando la ventana
de período. Además solo cuenta reaperturas automáticas (`reopenCount` nunca
se incrementa en el camino manual) — subestima la tasa real de recurrencia.
Este mismo cálculo se reutiliza tal cual en `DashboardService.getStats()`
para `recurrenceRate`, así que el bug afecta dos superficies, no solo una.

## Verificación de duplicación (pregunta 2) — sin bugs encontrados

Cuando un escaneo vuelve a detectar un CVE que ya estaba abierto (no
resuelto) en un activo: sí se inserta una fila nueva en `vulnerabilities_audit`
por cada escaneo, pero es un log histórico intencional (insertado por n8n,
documentado como "hallazgo puntual e inmutable" separado del "estado
persistente"). Las vistas de usuario (Kanban, Listado, Resumen, Análisis)
leen exclusivamente de `AssetVulnerability` (`UNIQUE(software_component_id,
cve_id)`, sin duplicados posibles), y `applyLifecycle()` en la rama "ya
abierto" actualiza esa fila in-place sin crear una segunda. El `id` que usa
el frontend como key de React es el de `AssetVulnerability`, estable. **No
se requiere ningún cambio para este punto.**

## Otros ángulos revisados sin encontrar bugs (para que quede documentado)

- Único otro `@Scheduled` del backend (`closeStaleRunningScans()`, watchdog
  de escaneos colgados): no tiene el mismo patrón que el bug de huérfanos —
  nada depende downstream de que marque `FAILED` un scan.
- `dueDate` se recalcula correctamente en las 3 ramas de `applyLifecycle`;
  `priority` no se puede editar manualmente (`@Mapping(ignore=true)`), así
  que no hay forma de que quede desalineado con `dueDate`.
- `reopenCount` es correctamente un contador acumulado de por vida — no
  debería resetearse, y no lo hace.
- `evidenceLevel` de `StateTransition` es append-only, no puede quedar
  "colgado" de un ciclo anterior.
- El resto de las métricas snapshot (MTTR, SLA, distribución por prioridad)
  son deliberadamente estado-actual, no series temporales — está bien que
  no filtren por `days`.

## Fuera de alcance de este fix (decisión de producto, no bug)

No hay mecanismo de "falso positivo confirmado, no reabrir" (suppress/
whitelist) ni cooldown/ventana de gracia tras resolver antes de permitir una
reapertura automática. Es una funcionalidad nueva, no una corrección — queda
fuera de este plan salvo que se pida explícitamente después de estos fixes.

---

## Plan de corrección (orden de implementación por severidad)

### Fix 0 — CRÍTICO: idempotencia de `completeAutomatic()`

`backend/src/main/java/com/gef/gefsecureapp/service/ScanService.java`:
agregar la misma guarda que ya tiene `complete()` (chequear
`"RUNNING".equals(...)` o equivalente antes de procesar) al inicio de
`completeAutomatic()`, para que una entrega duplicada del webhook sea un
no-op en vez de reprocesar `applyLifecycle` con un scope vacío. Evaluar
también si `findOpenInScope()` debería directamente rechazar/no-opear
cuando el `ScanReport` no tiene NINGÚN scope (asset/componente/entorno todos
null) en vez de caer en "todas las OPEN de la organización" — como defensa
en profundidad adicional a la guarda de idempotencia, no como sustituto.

### Fix 1-4 — reapertura de casos puntuales (`VulnerabilityAuditService.java`)

1. **Unificar la condición de reapertura** (arregla los problemas 1 y 2 de
   la lista de 5): la rama de reapertura de `applyLifecycle()` debe
   dispararse si `detectionStatus != OPEN` **O** `triageStatus == RESUELTA`
   (hoy solo mira `detectionStatus`).
2. **Reparar la reconciliación de huérfanos** (problema 1): tras
   `reconcileOrphansToNearestAutomaticScan()`, volver a pasar los hallazgos
   recién vinculados por la lógica de `applyLifecycle` (refactor: separar la
   lógica "por hallazgo" en un método reusable que reciba una lista de
   findings, no solo un `ScanReport` completo).
3. **Cierre automático por ausencia también debe forzar `triageStatus =
   RESUELTA`** (problema 3, decisión confirmada con el usuario: se cierra
   automáticamente igual que los demás casos, sin importar si un analista lo
   tenía en `EN_ANALISIS`) y setear `resolvedAt` para que aparezca en las
   métricas de resueltos.
4. **Limpiar campos VEX al reabrir automáticamente** (problema 4): mismos
   campos que ya limpia `updateStatus()` (`resolvedAt`, `outcome`,
   `mitigationControl`, `justification`, `acceptedBy`, `riskAcceptedUntil`).
5. **Corregir `reopenedCasesCount`** (problema 5, afecta Informes y
   Dashboard): reemplazar el conteo lifetime por una query sobre
   `state_transitions` que cuente transiciones `fromState = 'RESUELTA'`
   dentro de la ventana `days`, sin filtrar por `actorType`.

### Tests (TDD — test primero, confirmar rojo, luego el fix en verde)

- Nuevo test: segunda entrega del webhook automático (mismo payload/reintento)
  no debe volver a correr `applyLifecycle` ni auto-cerrar nada — cubre el
  Fix 0.
- Nuevo test: reaparición de un caso `RESUELTA` manualmente con
  `detectionStatus` aún `OPEN` → debe reabrir.
- Nuevo test: `reconcileOrphanScanLinks()` con un huérfano de un
  `AssetVulnerability` `RESUELTA` → debe quedar reabierto, no solo linkeado.
- Nuevo test: cierre automático por ausencia con `triageStatus = EN_ANALISIS`
  → verificar el comportamiento acordado (punto 3) y que `resolvedAt` quede
  seteado.
- Nuevo test: reapertura automática limpia `outcome`/`resolvedAt`/etc.
- Nuevo test: `getRemediationAnalysis(days)` con reaperturas dentro/fuera de
  ventana y de ambos orígenes (automático/manual).
- Correr `./gradlew test` completo antes y después de cada fix (baseline +
  verificación incremental).

### Verificación en vivo

- Simular una entrega duplicada del webhook automático contra los
  contenedores reales y confirmar que NO se resuelve nada de más.
- Simular el escenario de huérfano tardío y confirmar reapertura en Kanban.
- Confirmar que un caso `RIESGO_ACEPTADO` reabierto por escaneo ya no
  muestra datos VEX viejos.
- Confirmar en Informes → Remediación y en Dashboard que
  `reopenedCasesCount`/`recurrenceRate` cambian al variar el período.

## Archivos a tocar

- `backend/src/main/java/com/gef/gefsecureapp/service/ScanService.java`
  (Fix 0 — guarda de idempotencia).
- `backend/src/main/java/com/gef/gefsecureapp/service/VulnerabilityAuditService.java`
  (Fix 1-5 — condición de reapertura, cierre por ausencia, limpieza VEX,
  refactor de `applyLifecycle` para reuso desde reconciliación,
  `getRemediationAnalysis`).
- `backend/src/main/java/com/gef/gefsecureapp/repository/AssetVulnerabilityRepository.java`
  y/o `StateTransitionRepository.java` (nueva query con ventana `days`).
- `backend/src/test/java/com/gef/gefsecureapp/service/ScanServiceTest.java`
  y `VulnerabilityAuditServiceTest.java` (los tests nuevos descritos arriba).

No hay cambios de frontend necesarios — todo esto es corrección de lógica de
backend que ya está expuesta por endpoints/DTOs existentes (salvo que, al
resolver el punto 3, se decida exponer `detectionStatus` en el DTO del
Kanban — a confirmar).
