# 0002 — Esquema de base de datos vía scripts SQL manuales, sin herramienta de migraciones

## Status

Accepted

## Context

El esquema de PostgreSQL evolucionó de forma continua a lo largo del proyecto: creación de tablas base, seed de datos de ejemplo, separación de activos en jerarquía host/software, autenticación, RBAC, soft-delete, trazabilidad de escaneos, catálogos configurables, cache de advisories GHSA, ciclos de remediación con auditoría append-only, outcomes VEX, variables de prioridad y fecha límite, escala de evidencia, y el flag `exposed` de activos. Todo esto quedó materializado en **26 archivos SQL numerados secuencialmente en `init/`** (`00_...sql` a `25_...sql`), montados por Docker en `/docker-entrypoint-initdb.d` y ejecutados en orden **una sola vez**, contra un volumen de Postgres nuevo.

El backend usa `spring.jpa.hibernate.ddl-auto=validate`: Hibernate valida que las entidades JPA coincidan con el esquema existente, pero nunca lo crea ni lo modifica. No hay Flyway ni Liquibase en el classpath.

## Decision

Mantener el esquema como una secuencia de scripts SQL idempotentes y ordenados numéricamente, sin adoptar una herramienta de migraciones formal. Cada cambio de esquema se agrega como un nuevo script numerado (`init/26_...sql`, etc.), nunca editando un script ya aplicado.

Esto funciona porque el modelo de despliegue real del proyecto es "volumen de Postgres nuevo por entorno" (desarrollo local y el entorno de demo/staging actual), no una flota de bases de datos productivas en distintas versiones de esquema que necesiten actualizarse in-place de forma controlada.

## Consequences

**Positive**
- Cero dependencias adicionales (no hace falta Flyway/Liquibase en el `build.gradle` ni tablas de control de versión de esquema como `flyway_schema_history`).
- El historial de scripts numerados *es* el changelog del modelo de datos: leer `init/00` a `init/25` en orden cuenta la evolución completa del dominio (ver `docs/architecture/05-database.md`).
- Simplicidad total para el caso de uso real: `docker compose down -v && docker compose up -d` reconstruye el esquema completo desde cero de forma determinística.

**Negative**
- No hay mecanismo para migrar una base de datos **existente** con datos reales de una versión de esquema a la siguiente sin intervención manual — el README ya advierte esto explícitamente para instalaciones limpias vs. bases con datos.
- No hay rollback automático de un script aplicado a medias si falla en producción.
- Si el proyecto necesitara múltiples entornos productivos persistentes (no solo "volumen nuevo por demo/staging"), este enfoque dejaría de ser sostenible y habría que migrar a Flyway/Liquibase retomando los scripts existentes como baseline — algo a resolver antes de un despliegue comercial con clientes en producción.

## Alternatives Considered

- **Flyway**: hubiera dado versionado de esquema, migraciones repetibles y control de qué se aplicó en qué base. Descartado por overhead innecesario dado que el proyecto no corre contra bases persistentes de larga vida entre releases — el patrón de despliegue es recrear el volumen.
- **Liquibase (changelogs XML/YAML)**: mismas ventajas que Flyway con mayor expresividad de changesets, pero mayor curva de aprendizaje y verbosidad para un equipo pequeño. Mismo motivo de descarte.
- **`ddl-auto=update`**: dejar que Hibernate genere y actualice el esquema automáticamente a partir de las entidades. Descartado deliberadamente: da control nulo sobre nombres de columnas/constraints/índices, no soporta bien varias de las evoluciones reales que ocurrieron (splits de tablas, backfills de datos, constraints CHECK), y es una práctica generalmente desaconsejada más allá de prototipos descartables.
