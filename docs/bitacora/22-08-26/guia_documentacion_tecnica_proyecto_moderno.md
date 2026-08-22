# Guía completa de documentación técnica para un proyecto de software moderno

> Plantilla general adaptable a proyectos web, mobile, APIs,
> microservicios, SaaS, sistemas internos, proyectos académicos y
> aplicaciones desplegadas con Docker/Cloud.

## 1. Información general del proyecto

### 1.1 Nombre del proyecto

-   Nombre oficial.
-   Nombre corto o identificador interno.
-   Versión actual.

### 1.2 Descripción

Explicar brevemente: - Qué es el sistema. - Qué problema resuelve. -
Para quién está pensado. - Cuál es su objetivo principal. - Cuáles son
sus principales funcionalidades.

### 1.3 Objetivos

**Objetivo general** - Objetivo principal del sistema.

**Objetivos específicos** - Objetivo específico 1. - Objetivo específico
2. - Objetivo específico 3.

### 1.4 Alcance

Definir claramente: - Qué incluye el sistema. - Qué no incluye. - Qué
funcionalidades están terminadas. - Qué funcionalidades están
planificadas. - Limitaciones conocidas.

### 1.5 Estado del proyecto

Ejemplo:

  Campo                  Valor
  ---------------------- --------------------------------
  Estado                 Desarrollo / Beta / Producción
  Versión                1.0.0
  Última actualización   YYYY-MM-DD
  Ambiente productivo    Sí / No

------------------------------------------------------------------------

## 2. Stack tecnológico

Documentar todas las tecnologías utilizadas.

  Área             Tecnología                       Versión   Uso
  ---------------- -------------------------------- --------- -----------------
  Frontend         React / Angular / Vue            X         Interfaz
  Backend          Java / Python / Node             X         API
  Framework        Spring Boot / FastAPI / NestJS   X         Backend
  Base de datos    PostgreSQL                       X         Persistencia
  Automatización   n8n                              X         Workflows
  Contenedores     Docker                           X         Infraestructura
  Proxy            Nginx / Traefik                  X         Reverse proxy
  CI/CD            GitHub Actions                   \-        Automatización
  Hosting          VPS / AWS / Azure                \-        Producción

También indicar: - Gestor de dependencias. - Runtime. - Herramientas de
testing. - Librerías importantes. - Servicios externos.

------------------------------------------------------------------------

## 3. Arquitectura del sistema

### 3.1 Visión general

Explicar la arquitectura utilizada: - Monolito. - Monolito modular. -
Cliente-servidor. - Microservicios. - Arquitectura por capas. - Clean
Architecture. - Hexagonal. - Event-driven.

### 3.2 Diagrama de arquitectura

Incluir un diagrama similar a:

``` text
Usuario
   |
   v
Frontend
   |
   v
API / Backend
   |
   +------> PostgreSQL
   |
   +------> Servicios externos
   |
   +------> Automatizaciones / Workers
```

Para proyectos más complejos conviene mantener diagramas C4: 1.
Contexto. 2. Contenedores. 3. Componentes. 4. Código, solo cuando aporte
valor.

### 3.3 Componentes

Por cada componente documentar: - Responsabilidad. - Tecnología. -
Comunicación con otros componentes. - Dependencias. - Entradas y
salidas.

------------------------------------------------------------------------

## 4. Estructura del repositorio

Mostrar la estructura principal.

``` text
project/
├── frontend/
├── backend/
├── database/
├── automation/
├── docker/
├── docs/
├── scripts/
├── tests/
├── .github/
├── docker-compose.yml
├── .env.example
└── README.md
```

Explicar qué contiene cada carpeta importante.

------------------------------------------------------------------------

## 5. Requisitos del sistema

### 5.1 Requisitos funcionales

Ejemplo: - RF-001: El usuario podrá iniciar sesión. - RF-002: El sistema
permitirá registrar activos. - RF-003: El sistema permitirá ejecutar
análisis. - RF-004: El sistema enviará notificaciones.

Cada requisito puede contener: - ID. - Nombre. - Descripción. -
Prioridad. - Estado. - Criterios de aceptación.

### 5.2 Requisitos no funcionales

Documentar: - Seguridad. - Rendimiento. - Disponibilidad. -
Escalabilidad. - Mantenibilidad. - Usabilidad. - Compatibilidad. -
Accesibilidad. - Observabilidad. - Recuperación ante fallos.

------------------------------------------------------------------------

## 6. Casos de uso y flujos

Por cada flujo importante indicar: - Actor. - Precondiciones. - Flujo
principal. - Flujos alternativos. - Resultado esperado. - Errores
posibles.

Ejemplo:

### CU-001 --- Iniciar un escaneo

**Actor:** Usuario autorizado.

**Precondiciones:** - Usuario autenticado. - Activo registrado.

**Flujo:** 1. El usuario selecciona el activo. 2. Solicita un análisis.
3. El backend valida la solicitud. 4. Se ejecuta el proceso. 5. Se
almacenan los resultados. 6. El usuario consulta el resultado.

------------------------------------------------------------------------

## 7. Modelo de dominio

Documentar los principales conceptos del negocio: - Entidades. -
Agregados. - Relaciones. - Reglas de negocio. - Estados. - Transiciones.

Ejemplo:

``` text
Organización
   |
   +-- Usuarios
   |
   +-- Entornos
          |
          +-- Activos
                 |
                 +-- Software
                 |
                 +-- Escaneos
                        |
                        +-- Hallazgos
```

------------------------------------------------------------------------

## 8. Base de datos

### 8.1 Motor

-   Motor.
-   Versión.
-   Encoding.
-   Zona horaria.
-   Configuración relevante.

### 8.2 Modelo de datos

Incluir: - Diagrama entidad-relación. - Tablas. - Relaciones. - Claves
primarias. - Claves foráneas. - Índices. - Restricciones.

### 8.3 Diccionario de datos

Ejemplo:

  Tabla   Campo   Tipo      Nullable   Descripción
  ------- ------- --------- ---------- ---------------
  users   id      UUID      No         Identificador
  users   email   VARCHAR   No         Correo
  users   role    VARCHAR   No         Rol

### 8.4 Migraciones

Documentar: - Herramienta. - Cómo crear migraciones. - Cómo
ejecutarlas. - Cómo revertirlas. - Política de migraciones en
producción.

### 8.5 Backups

Indicar: - Frecuencia. - Retención. - Ubicación. - Cifrado. -
Procedimiento de restauración.

------------------------------------------------------------------------

## 9. API

Si existe una API, documentar cada endpoint.

``` text
POST /api/v1/auth/login
GET  /api/v1/users
GET  /api/v1/assets
POST /api/v1/scans
GET  /api/v1/scans/{id}
```

Por endpoint: - Método HTTP. - Ruta. - Descripción. - Autenticación. -
Roles permitidos. - Parámetros. - Request. - Response. - Códigos HTTP. -
Errores. - Ejemplos.

Preferentemente mantener una especificación OpenAPI/Swagger actualizada.

### Versionado

Definir estrategia:

``` text
/api/v1/...
/api/v2/...
```

------------------------------------------------------------------------

## 10. Autenticación y autorización

Documentar: - Sistema de autenticación. - JWT, OAuth2, sesiones, API
Keys, etc. - Access tokens. - Refresh tokens. - Expiración. -
Revocación. - Recuperación de contraseña. - MFA, si existe.

### Roles y permisos

  Rol       Usuarios   Activos   Escaneos       Configuración
  --------- ---------- --------- -------------- ---------------
  Admin     CRUD       CRUD      Ejecutar/Ver   Sí
  Analyst   Ver        Ver       Ejecutar/Ver   No
  Viewer    Ver        Ver       Ver            No

Es recomendable utilizar RBAC o ABAC cuando corresponda.

------------------------------------------------------------------------

## 11. Seguridad

### 11.1 Gestión de secretos

Nunca guardar secretos reales en Git.

Usar:

``` text
.env
Secret Manager
Variables del proveedor
Docker Secrets
Vault
```

Mantener `.env.example` sin credenciales.

### 11.2 Controles

Documentar: - Validación de entradas. - Autorización. - Hash de
contraseñas. - HTTPS/TLS. - CORS. - CSRF cuando corresponda. - Rate
limiting. - Protección contra fuerza bruta. - Sanitización. - Headers de
seguridad. - Gestión de archivos. - Control de dependencias. - Principio
de mínimo privilegio.

### 11.3 Threat model

Para sistemas importantes documentar: - Activos críticos. - Fronteras de
confianza. - Amenazas. - Vectores de ataque. - Mitigaciones. - Riesgo
residual.

Puede utilizarse STRIDE u otra metodología.

### 11.4 Gestión de vulnerabilidades

Definir: - Escaneo de dependencias. - SAST. - DAST. - SBOM. - Escaneo de
imágenes Docker. - Frecuencia. - Responsables. - Política de
actualización.

------------------------------------------------------------------------

## 12. Configuración

Crear una referencia de variables de entorno.

  Variable       Obligatoria   Ejemplo              Descripción
  -------------- ------------- -------------------- ---------------
  DATABASE_URL   Sí            `postgresql://...`   Conexión DB
  JWT_SECRET     Sí            `change-me`          Firma JWT
  API_PORT       No            `8080`               Puerto
  LOG_LEVEL      No            `INFO`               Nivel de logs

Nunca colocar secretos reales en la documentación.

Explicar diferencias entre: - Desarrollo. - Testing. - Staging. -
Producción.

------------------------------------------------------------------------

## 13. Instalación local

### Prerrequisitos

Ejemplo: - Git. - Docker. - Docker Compose. - Java/Python/Node cuando
corresponda.

### Clonar

``` bash
git clone <repository>
cd <project>
```

### Configurar

``` bash
cp .env.example .env
```

### Levantar

``` bash
docker compose up -d
```

### Verificar

``` bash
docker compose ps
```

Indicar URLs locales y credenciales de desarrollo seguras cuando
correspondan.

------------------------------------------------------------------------

## 14. Docker y contenedores

Documentar cada servicio:

  Servicio   Imagen         Puerto   Dependencias
  ---------- -------------- -------- --------------
  frontend   app-frontend   3000     backend
  backend    app-backend    8080     postgres
  postgres   postgres       5432     \-
  worker     app-worker     \-       backend

Explicar: - Dockerfiles. - Compose. - Volúmenes. - Networks. - Health
checks. - Variables. - Persistencia. - Restart policies.

------------------------------------------------------------------------

## 15. Despliegue

Documentar paso a paso cómo desplegar.

### Ambientes

-   Development.
-   Testing.
-   Staging.
-   Production.

### Infraestructura

Explicar: - Servidor/VPS/cloud. - Sistema operativo. - Reverse proxy. -
DNS. - SSL. - Firewall. - Puertos. - Docker. - Base de datos. -
Almacenamiento.

### Flujo

``` text
Developer
   |
   v
Git
   |
   v
CI/CD
   |
   v
Build + Tests
   |
   v
Registry
   |
   v
Production
```

### Rollback

Explicar cómo volver a una versión estable anterior.

------------------------------------------------------------------------

## 16. CI/CD

Documentar pipeline.

Ejemplo:

``` text
push
  -> lint
  -> unit tests
  -> integration tests
  -> security checks
  -> build
  -> image
  -> deploy
  -> smoke test
```

Indicar: - Triggers. - Branches. - Secrets. - Artefactos. - Condiciones
de despliegue. - Estrategia de rollback.

------------------------------------------------------------------------

## 17. Estrategia de Git

### Branches

Ejemplo:

``` text
main
develop
feature/*
fix/*
hotfix/*
```

O trunk-based development si el equipo lo utiliza.

### Commits

Elegir una convención, por ejemplo Conventional Commits:

``` text
feat: add asset scanner
fix: correct vulnerability matching
docs: update API documentation
test: add scanner integration tests
refactor: simplify matching service
chore: update dependencies
```

### Pull Requests

Definir: - Revisión mínima. - Tests obligatorios. - Checks. - Reglas
para merge. - Protección de ramas.

------------------------------------------------------------------------

## 18. Testing

### Tipos

-   Unitarios.
-   Integración.
-   End-to-end.
-   API.
-   Seguridad.
-   Rendimiento.
-   Smoke.
-   Regresión.

### Ejecución

``` bash
<test-command>
```

### Cobertura

Indicar: - Herramienta. - Objetivo de cobertura. - Exclusiones
justificadas.

### Estrategia

Explicar qué se prueba en cada nivel y qué debe bloquear un despliegue.

------------------------------------------------------------------------

## 19. Observabilidad

### Logs

Definir: - Formato. - Niveles. - Correlation/trace ID. - Datos que nunca
deben loguearse. - Retención.

### Métricas

Ejemplos: - Requests. - Latencia. - Error rate. - CPU. - RAM. - Disco. -
Conexiones DB. - Jobs fallidos.

### Trazas

Para sistemas distribuidos: - OpenTelemetry. - Trace ID. - Spans.

### Alertas

Documentar: - Qué genera una alerta. - Severidad. - Canal. -
Responsable.

------------------------------------------------------------------------

## 20. Manejo de errores

Definir una estructura consistente.

``` json
{
  "code": "ASSET_NOT_FOUND",
  "message": "Asset not found",
  "traceId": "..."
}
```

Documentar: - Excepciones controladas. - Errores de validación. -
Errores internos. - Códigos HTTP. - Reintentos. - Timeouts. - Circuit
breakers si corresponde.

------------------------------------------------------------------------

## 21. Procesos asíncronos y automatizaciones

Si existen workers, colas, cron jobs o herramientas como n8n,
documentar: - Nombre. - Objetivo. - Trigger. - Entradas. - Salidas. -
Dependencias. - Credenciales requeridas. - Reintentos. - Timeout. -
Manejo de errores. - Idempotencia. - Logs. - Alertas.

Ejemplo:

``` text
Nuevo escaneo
    |
    v
Workflow
    |
    +--> consultar fuente
    +--> normalizar datos
    +--> detectar coincidencias
    +--> persistir
    +--> notificar
```

------------------------------------------------------------------------

## 22. Integraciones externas

Por cada integración: - Servicio. - Objetivo. - API utilizada. -
Autenticación. - Límites. - Rate limits. - Timeout. - Reintentos. -
Webhooks. - Errores. - Fallback. - Dependencia contractual.

------------------------------------------------------------------------

## 23. Trazabilidad

Para sistemas donde sea importante reconstruir acciones, documentar
identificadores como:

``` text
user_id
request_id
trace_id
scan_id
asset_id
job_id
notification_id
```

Registrar: - Quién. - Qué. - Cuándo. - Sobre qué recurso. - Resultado.

------------------------------------------------------------------------

## 24. Auditoría

Definir qué eventos quedan auditados: - Login. - Cambios de permisos. -
Creación/eliminación. - Cambios de configuración. - Ejecución de
procesos críticos. - Exportaciones. - Operaciones administrativas.

Un registro puede incluir:

``` text
timestamp
user_id
action
resource
resource_id
ip
result
metadata
```

------------------------------------------------------------------------

## 25. Rendimiento y escalabilidad

Documentar: - Límites conocidos. - Carga esperada. - Concurrencia. -
Índices DB. - Caché. - Paginación. - Procesamiento batch. - Colas. -
Escalado horizontal/vertical. - Pruebas de carga.

------------------------------------------------------------------------

## 26. Disponibilidad y recuperación

Incluir: - RTO. - RPO. - Backups. - Restauración. - Redundancia. -
Procedimiento ante caída. - Dependencias críticas. - Disaster Recovery.

------------------------------------------------------------------------

## 27. Privacidad y datos

Documentar: - Datos personales almacenados. - Finalidad. - Retención. -
Eliminación. - Exportación. - Encriptación. - Accesos. - Logs con datos
sensibles. - Requisitos regulatorios aplicables.

------------------------------------------------------------------------

## 28. Dependencias

Mantener inventario de: - Librerías. - Frameworks. - Servicios. -
Imágenes Docker. - APIs externas.

Para dependencias críticas: - Versión. - Licencia. - Responsable. -
Motivo. - Política de actualización.

Mantener lockfiles en el repositorio.

------------------------------------------------------------------------

## 29. SBOM

En proyectos con foco en seguridad es recomendable generar un Software
Bill of Materials.

Formatos comunes: - CycloneDX. - SPDX.

Puede incluir: - Paquete. - Versión. - Tipo. - Licencia. - PURL. - Hash.

------------------------------------------------------------------------

## 30. ADR --- Architecture Decision Records

Las decisiones arquitectónicas importantes deberían quedar registradas.

Ejemplo:

``` text
ADR-001 — PostgreSQL como base de datos

Estado: Aceptado
Fecha: YYYY-MM-DD

Contexto:
...

Decisión:
...

Alternativas:
...

Consecuencias:
...
```

Guardar normalmente en:

``` text
docs/adr/
```

------------------------------------------------------------------------

## 31. Runbooks

Los runbooks explican cómo operar y recuperar el sistema.

Ejemplos: - Backend caído. - Base de datos sin conexión. - Disco
lleno. - Certificado vencido. - Workflow detenido. - Cola bloqueada. -
API externa caída. - Restauración de backup.

Cada runbook: 1. Síntoma. 2. Diagnóstico. 3. Comandos. 4. Solución. 5.
Verificación. 6. Escalamiento.

------------------------------------------------------------------------

## 32. Troubleshooting

Tabla rápida:

  Problema            Posible causa    Solución
  ------------------- ---------------- -------------------------
  Backend no inicia   DB caída         Revisar conexión
  401                 Token inválido   Renovar autenticación
  Workflow detenido   Servicio caído   Revisar logs
  DB llena            Disco            Liberar/ampliar espacio

------------------------------------------------------------------------

## 33. Mantenimiento

Definir tareas: - Actualizar dependencias. - Actualizar imágenes. -
Renovar certificados. - Revisar backups. - Limpiar logs. - Revisar
vulnerabilidades. - Optimizar DB. - Revisar alertas. - Rotar secretos.

Indicar periodicidad y responsable.

------------------------------------------------------------------------

## 34. Versionado y releases

Usar una política consistente, por ejemplo Semantic Versioning:

``` text
MAJOR.MINOR.PATCH
2.1.3
```

Mantener:

``` text
CHANGELOG.md
```

Por release: - Nuevas funciones. - Cambios. - Bugs corregidos. -
Breaking changes. - Migraciones necesarias. - Riesgos conocidos.

------------------------------------------------------------------------

## 35. Compatibilidad

Indicar versiones soportadas: - Navegadores. - Sistemas operativos. -
Docker. - Runtime. - Base de datos. - Dispositivos.

------------------------------------------------------------------------

## 36. Accesibilidad

Para interfaces: - Navegación por teclado. - Labels. - Contraste. -
Focus. - HTML semántico. - Lectores de pantalla. - WCAG objetivo.

------------------------------------------------------------------------

## 37. Convenciones de desarrollo

Documentar: - Nombres. - Formato. - Linter. - Formatter. - Estructura. -
Manejo de excepciones. - DTOs/schemas. - Comentarios. - Logging. -
Imports. - Reglas arquitectónicas.

------------------------------------------------------------------------

## 38. Guía para contribuir

Crear `CONTRIBUTING.md` cuando corresponda.

Debe explicar: - Cómo preparar el entorno. - Cómo crear una rama. -
Convención de commits. - Tests. - Pull Requests. - Revisión. -
Definition of Done.

------------------------------------------------------------------------

## 39. Licencia

Agregar:

``` text
LICENSE
```

Indicar: - Licencia. - Copyright. - Restricciones. - Licencias de
terceros cuando sean relevantes.

------------------------------------------------------------------------

## 40. Responsables y ownership

Ejemplo:

  Área              Responsable
  ----------------- -----------------
  Backend           Equipo Backend
  Frontend          Equipo Frontend
  Infraestructura   DevOps
  Seguridad         Security
  Base de datos     Backend/DBA

En equipos puede utilizarse:

``` text
CODEOWNERS
```

------------------------------------------------------------------------

## 41. Roadmap técnico

Separar: \### Corto plazo - Deuda técnica prioritaria. - Bugs
críticos. - Mejoras inmediatas.

### Mediano plazo

-   Nuevas integraciones.
-   Mejoras de arquitectura.

### Largo plazo

-   Escalabilidad.
-   Alta disponibilidad.
-   Evolución tecnológica.

------------------------------------------------------------------------

## 42. Deuda técnica

Registrar: - ID. - Descripción. - Impacto. - Riesgo. - Prioridad. -
Responsable. - Fecha objetivo.

No mezclar deuda técnica con bugs sin diferenciarlos.

------------------------------------------------------------------------

## 43. Limitaciones conocidas

Ejemplo:

``` text
- Máximo de X operaciones simultáneas.
- Integración Y depende de disponibilidad externa.
- Función Z todavía no soporta ...
```

------------------------------------------------------------------------

## 44. Glosario

  Término   Significado
  --------- --------------------------------------
  Asset     Recurso gestionado
  SBOM      Software Bill of Materials
  CVE       Common Vulnerabilities and Exposures
  RBAC      Role-Based Access Control
  RTO       Recovery Time Objective
  RPO       Recovery Point Objective

------------------------------------------------------------------------

## 45. FAQ técnica

Preguntas frecuentes: - ¿Cómo levanto el proyecto? - ¿Dónde están los
logs? - ¿Cómo ejecuto los tests? - ¿Cómo creo una migración? - ¿Cómo
restauro la DB? - ¿Cómo agrego una variable? - ¿Cómo hago un deploy? -
¿Cómo revierto una versión?

------------------------------------------------------------------------

# Estructura recomendada de `/docs`

``` text
docs/
├── README.md
├── architecture/
│   ├── overview.md
│   ├── c4-context.md
│   ├── c4-containers.md
│   └── data-flow.md
├── adr/
│   ├── ADR-001.md
│   └── ADR-002.md
├── api/
│   ├── overview.md
│   └── authentication.md
├── database/
│   ├── model.md
│   ├── migrations.md
│   └── backups.md
├── deployment/
│   ├── local.md
│   ├── staging.md
│   ├── production.md
│   └── rollback.md
├── security/
│   ├── security.md
│   ├── threat-model.md
│   └── vulnerability-management.md
├── testing/
│   └── testing-strategy.md
├── operations/
│   ├── monitoring.md
│   ├── logging.md
│   └── runbooks/
├── integrations/
├── workflows/
├── requirements/
├── diagrams/
├── troubleshooting.md
├── glossary.md
└── roadmap.md
```

# Archivos recomendados en la raíz

``` text
project/
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── LICENSE
├── SECURITY.md
├── CODEOWNERS
├── .env.example
├── docker-compose.yml
└── docs/
```

# Qué debería contener el README principal

El `README.md` no debería contener toda la documentación. Debe funcionar
como puerta de entrada.

Contenido recomendado: 1. Nombre. 2. Descripción. 3. Captura o diagrama.
4. Funcionalidades. 5. Stack. 6. Requisitos. 7. Instalación rápida. 8.
Ejecución. 9. Tests. 10. Configuración básica. 11. Enlace a
documentación completa. 12. Licencia.

# Documentación mínima para considerar el proyecto bien documentado

Para un proyecto pequeño: - README. - Instalación. - Configuración. -
Arquitectura. - API. - Base de datos. - Testing. - Deployment.

Para un proyecto profesional: - Todo lo anterior. - Seguridad. -
CI/CD. - Observabilidad. - ADR. - Runbooks. - Backups. - Disaster
Recovery. - Ownership. - Versionado. - Changelog. - Contributing. -
Threat model. - Dependencias/SBOM.

# Regla importante: documentación viva

La documentación técnica debe evolucionar junto con el código.

Una funcionalidad no debería considerarse completamente terminada
cuando: - Cambia la API y no se actualiza OpenAPI. - Cambia una variable
y no se actualiza `.env.example`. - Cambia la arquitectura y no se
actualizan los diagramas. - Cambia el despliegue y no se actualiza el
procedimiento. - Se toma una decisión arquitectónica importante y no
existe ADR. - Se incorpora un procedimiento operativo crítico y no
existe runbook.

# Checklist final

-   [ ] README actualizado.
-   [ ] Objetivo y alcance definidos.
-   [ ] Stack y versiones documentados.
-   [ ] Arquitectura explicada.
-   [ ] Diagramas actualizados.
-   [ ] Estructura del repositorio explicada.
-   [ ] Requisitos funcionales documentados.
-   [ ] Requisitos no funcionales documentados.
-   [ ] Modelo de dominio documentado.
-   [ ] Base de datos documentada.
-   [ ] API documentada.
-   [ ] Autenticación documentada.
-   [ ] Roles y permisos documentados.
-   [ ] Seguridad documentada.
-   [ ] Variables de entorno documentadas.
-   [ ] Instalación local reproducible.
-   [ ] Docker documentado.
-   [ ] Deployment documentado.
-   [ ] Rollback documentado.
-   [ ] CI/CD documentado.
-   [ ] Estrategia Git documentada.
-   [ ] Tests documentados.
-   [ ] Logs y métricas documentados.
-   [ ] Manejo de errores documentado.
-   [ ] Procesos asíncronos documentados.
-   [ ] Integraciones documentadas.
-   [ ] Auditoría y trazabilidad documentadas.
-   [ ] Backups y recuperación documentados.
-   [ ] Dependencias controladas.
-   [ ] SBOM cuando corresponda.
-   [ ] ADR para decisiones importantes.
-   [ ] Runbooks para incidentes.
-   [ ] Troubleshooting.
-   [ ] Política de mantenimiento.
-   [ ] Versionado y CHANGELOG.
-   [ ] Limitaciones conocidas.
-   [ ] Glosario.
-   [ ] Responsables definidos.
-   [ ] Roadmap técnico.
-   [ ] Deuda técnica registrada.
-   [ ] Documentación revisada junto con cada cambio relevante.

------------------------------------------------------------------------

## Nota

No todos los proyectos necesitan las 45 secciones desde el primer día.
La documentación debe ser proporcional al tamaño, criticidad y etapa del
sistema. La clave es que una persona nueva pueda comprender qué hace el
proyecto, levantarlo, modificarlo, probarlo, desplegarlo y diagnosticar
problemas sin depender exclusivamente del conocimiento de sus autores.
