# Flujos Principales

## Flujo 1: Login

**Disparador**: usuario abre el frontend sin sesión activa
**Actor**: cualquier usuario

**Pasos**:
1. `RequireAuth` detecta ausencia de token en `localStorage` y redirige a `/login` guardando la ruta de origen.
2. Usuario envía credenciales (o usa un botón de demo-login por rol) → `POST /api/auth/login`.
3. Backend valida contra `users` (BCrypt) y emite un JWT (`jwt.expiration-minutes`, 8h default).
4. Frontend guarda `gef_token`/`gef_user` en `localStorage`, `AuthContext` marca `isAuthenticated=true`, redirige a la ruta original.

**Diagrama de secuencia**:
```
Usuario → Login.tsx → POST /api/auth/login → AuthService → JwtService
                                            ← JWT + datos de usuario
Login.tsx → localStorage.set(gef_token) → redirect a ruta protegida
```

**Casos de error**:
- Credenciales inválidas → 401, mostrado en el form sin detalle (no revela si el usuario existe).
- Token expirado en cualquier request posterior → interceptor de axios limpia sesión y redirige a `/login` con flag de "sesión expirada" en `sessionStorage`.

## Flujo 2: Escaneo → detección → notificación

**Disparador**: botón "Escanear" (por activo/componente de software/entorno/global) o `Scan_Scheduler` de n8n (diario 09:00)
**Actor**: SECURITY_ANALYST o el sistema (scheduler)

**Pasos**:
1. Backend (`N8nWebhookService`) o el scheduler de n8n disparan el pipeline (`POST /webhook/auditoria-automatizada` con `{activo_name, entorno, scan_id}` si viene del backend).
2. n8n hace fetch a GitHub Advisory DB + CISA KEV, deduplica, sincroniza el catálogo de software.
3. n8n cruza los hallazgos contra el inventario real (`Check_Internal_Assets`, `Filter_Matched_Assets`) y descarta lo que está en la whitelist (`Log_Ignored_Vulnerabilities`).
4. `Risk_Assessment_Engine` (nodo Code) calcula prioridad combinando CVSS + criticidad del entorno + CISA KEV + zero-day.
5. n8n persiste los hallazgos (`Persist_Audit_Findings`) y llama de vuelta al backend (`POST /api/webhook/vulnerabilities`, autenticado con `X-Internal-Token`) para que el sistema de registro quede actualizado.
6. Backend aplica la lógica de ciclo de vida (`VulnerabilityAuditService.applyLifecycle`): crea o reabre `AssetVulnerability`, registra `VulnerabilityAudit`.
7. n8n notifica a Slack (`Notify_Security_Status`) y hace un callback de estadísticas (`Persist_Scan_Statistics`).
8. El watchdog de `ScanService` cierra el `ScanReport` si queda RUNNING más de 5 minutos sin actualización.

**Diagrama de secuencia**:
```
Backend/Scheduler → n8n (webhook) → GitHub Advisories / CISA KEV
                                  → Risk_Assessment_Engine
                  ← POST /api/webhook/vulnerabilities (X-Internal-Token)
Backend → VulnerabilityAuditService.applyLifecycle() → DB
n8n → Slack (notify) + POST /api/webhook/scan-report (stats)
```

**Casos de error**:
- n8n falla y nunca llama de vuelta → el watchdog cierra el `ScanReport` como no completado tras el timeout.
- Fallo en cualquier nodo del pipeline → rama `Error_Trigger` registra en `system_errors` y notifica a un canal de Slack de desarrollo.

## Flujo 3: Triage y cierre VEX

**Disparador**: analista abre el Kanban
**Actor**: SECURITY_ANALYST

**Pasos**:
1. Analista arrastra una tarjeta de DETECTADA a EN_ANALISIS — validado contra `TRANSICIONES_PERMITIDAS`.
2. Al cerrar (mover a RESUELTA), se abre un modal que exige outcome VEX + justificación (+ `acceptedBy`/`riskAcceptedUntil` si es RIESGO_ACEPTADO).
3. Backend registra el cambio en `StateTransition` (append-only, con nivel de evidencia E0–E6) y actualiza `RemediationCycle`.
4. Si un escaneo posterior vuelve a detectar la misma vulnerabilidad, `detectionStatus` vuelve a OPEN y `triageStatus` se fuerza a DETECTADA automáticamente (reapertura).

**Casos de error**:
- Intento de cerrar sin justificación → rechazado por validación de backend antes de persistir.
