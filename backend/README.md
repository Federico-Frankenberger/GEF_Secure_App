# Backend — GEF Secure

Spring Boot 3 / Java 21. Paquete raíz: `com.gef.gefsecureapp`.

## Build y ejecución

```bash
./gradlew bootRun        # levantar la app (perfil dev por defecto)
./gradlew build          # compilar + generar el jar
./gradlew test           # correr los tests
```

En Windows usar `gradlew.bat` en lugar de `./gradlew`. Normalmente el backend se levanta vía `docker compose up -d` desde la raíz del repo (ver README principal); estos comandos son para desarrollo/debug local contra un Postgres ya levantado.

## Estructura de paquetes (`src/main/java/com/gef/gefsecureapp/`)

| Paquete | Contenido |
|---|---|
| `config/` | Configuración de la app, validación de secrets al arranque (`SecretsValidator`) |
| `controller/` | 15 controllers REST |
| `dto/` | Objetos de transferencia request/response |
| `exception/` | `GlobalExceptionHandler` + excepciones propias |
| `mapper/` | Conversión entidad ↔ DTO |
| `model/` | 15 entidades JPA |
| `repository/` | Repositorios Spring Data |
| `security/` | JWT (filtro, servicio de tokens) |
| `service/` | 13 servicios con la lógica de negocio |
| `util/` | Utilidades (ej. `PurlParser`) |
| `validation/` | Validadores custom |

Detalle de entidades, servicios y flujos: [`docs/architecture/02-backend.md`](../docs/architecture/02-backend.md).

## Tests

`./gradlew test` corre todo `src/test/java/...`: mayormente tests unitarios de servicios (con repositorios mockeados), algunos tests de mapper/DTO, un par de tests de controller y uno de repositorio (`@DataJpaTest`), más `BackendApplicationTests` como smoke test de carga de contexto. La cobertura está sesgada hacia la capa de servicio; hay poca cobertura de integración full-stack (`@SpringBootTest`).

## Convención de esquema — importante

El proyecto **no usa Flyway ni Liquibase**. La configuración es `spring.jpa.hibernate.ddl-auto=validate`: Hibernate valida que las entidades coincidan con el schema, pero **nunca lo crea ni lo migra**. El schema real vive en `init/` (raíz del repo), como scripts SQL numerados e idempotentes que corren una sola vez contra un volumen de Postgres nuevo (montados en `docker-entrypoint-initdb.d`).

**Si agregás un campo o una entidad nueva**: sumá un script nuevo `init/NN-descripcion.sql` (siguiente número disponible) con el `ALTER TABLE`/`CREATE TABLE` correspondiente. No dependas de que Hibernate genere el DDL — con `ddl-auto=validate` simplemente fallaría al arrancar si el schema no coincide.

Por qué se decidió así y el detalle de la evolución del schema: [`docs/architecture/05-database.md`](../docs/architecture/05-database.md), [`docs/adr/0002-esquema-sql-manual-sin-migraciones.md`](../docs/adr/0002-esquema-sql-manual-sin-migraciones.md).

## Ver también

- [`docs/architecture/06-vulnerability-lifecycle.md`](../docs/architecture/06-vulnerability-lifecycle.md) — modelo dual de estado (detección vs. triage), máquina de estados, VEX.
