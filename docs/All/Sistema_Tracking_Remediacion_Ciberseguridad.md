# Sistema de Tracking de Remediación (Ciberseguridad)

## ¿Qué es?

En ciberseguridad, un **Sistema de Tracking de Remediación** no es simplemente una lista de vulnerabilidades. Es un flujo de trabajo completo que garantiza que cada vulnerabilidad detectada sea gestionada hasta su resolución, con trazabilidad, responsables, evidencia y auditoría.

---

# Flujo completo de remediación

## 1. Detección de la vulnerabilidad

Todo comienza cuando se identifica una vulnerabilidad. Puede provenir de distintas fuentes:

- Escáneres automáticos (Nessus, OpenVAS, Qualys, etc.).
- Análisis SAST o DAST.
- Pentesting.
- Auditorías de seguridad.
- Reportes de usuarios.
- Sistemas SIEM.
- Bug Bounty.
- Revisión manual.

En este momento se genera un **caso de remediación**.

### Información inicial

- ID único.
- Fecha de detección.
- Fuente.
- Activo afectado.
- Descripción.
- Evidencia.
- CVE (si existe).
- CVSS.
- Criticidad.
- Estado inicial: **Nueva**.

---

## 2. Análisis y validación

No toda vulnerabilidad detectada requiere una corrección inmediata. Primero debe validarse.

Durante esta etapa se responde:

- ¿Es un falso positivo?
- ¿Es explotable?
- ¿Qué activos afecta?
- ¿Qué impacto tendría?
- ¿Existe una mitigación temporal?
- ¿Qué prioridad tiene?

También se realiza un análisis de riesgo.

### Ejemplo

```text
Activo:
Servidor Web Producción

Vulnerabilidad:
SQL Injection

Impacto:
Alto

Probabilidad:
Alta

Riesgo:
Crítico
```

---

## 3. Priorización

La prioridad no depende únicamente del CVSS.

También se consideran:

- Sistema afectado.
- Datos comprometidos.
- Exposición a Internet.
- Clientes afectados.
- Requisitos regulatorios.
- Facilidad de explotación.
- Existencia de exploits públicos.

| CVSS | Sistema | Prioridad |
|------:|----------|-----------|
| 9.8 | Producción | Crítica |
| 9.8 | Desarrollo | Media |
| 6.5 | Producción | Alta |

---

## 4. Asignación

Una vez priorizada, se asigna a un responsable.

Puede asignarse a:

- Equipo DevOps
- Equipo Infraestructura
- Equipo Desarrollo
- Equipo DBA
- Equipo Cloud
- Responsable específico

Se registra:

- Responsable.
- Equipo.
- Fecha de asignación.
- Fecha límite.
- SLA.

### Ejemplo

```text
Responsable:
Juan Pérez

Equipo:
Backend

Fecha límite:
12/08

SLA:
72 horas
```

---

## 5. Plan de remediación

Antes de modificar nada se define qué se va a hacer.

### Problema

```text
Dependencia Log4j vulnerable
```

### Plan

- Actualizar Log4j.
- Ejecutar pruebas.
- Desplegar en staging.
- Validar.
- Desplegar en producción.

Este plan queda registrado para auditoría.

---

## 6. Ejecución

Es la implementación de la solución.

Durante esta etapa el sistema registra:

- Quién hizo el cambio.
- Cuándo.
- Qué cambios realizó.
- Commits asociados.
- Tickets relacionados.
- Despliegues.
- Versiones.

### Estados típicos

```text
Nueva
↓
En análisis
↓
Asignada
↓
En desarrollo
↓
En pruebas
↓
Pendiente de validación
```

---

## 7. Evidencias

Toda remediación debe poder demostrarse.

El sistema permite adjuntar:

- Capturas.
- Reportes del escáner.
- Resultados de pruebas.
- Logs.
- Commits.
- Pull Requests.
- Documentación.
- Archivos PDF.

### Ejemplo

```text
PR #251

Actualización:
Spring Boot 3.4

Resultado Scan:
Sin vulnerabilidades

Capturas

Reporte PDF
```

---

## 8. Verificación

Una persona distinta al responsable verifica que el problema realmente desapareció.

Se ejecutan nuevamente:

- Escáneres.
- Pruebas de penetración.
- Validaciones manuales.
- Pruebas funcionales.

Resultado:

- ✅ Vulnerabilidad corregida.
- ❌ Continúa siendo explotable.

Si falla, vuelve al desarrollador.

---

## 9. Cierre

Solo cuando la vulnerabilidad fue validada se puede cerrar.

Se registra:

- Fecha de cierre.
- Responsable.
- Tiempo de resolución.
- Evidencia final.
- Versión donde quedó solucionada.

Estado final:

```text
Cerrada
```

---

## 10. Auditoría e historial

Todo queda almacenado.

```text
05/08  Se detectó
06/08  Se asignó
07/08  Se desarrolló
08/08  Se desplegó
09/08  Se verificó
09/08  Se cerró
```

Nunca se elimina información.

---

# Dashboard de seguimiento

## Resumen

- Vulnerabilidades abiertas.
- En progreso.
- Vencidas.
- Críticas.
- Cerradas este mes.
- Tiempo promedio de resolución (MTTR).

## Gráficos

- Vulnerabilidades por severidad.
- Vulnerabilidades por estado.
- Vulnerabilidades por responsable.
- Vulnerabilidades por proyecto.
- Tendencia mensual.
- Cumplimiento de SLA.
- Tiempo medio hasta la remediación.

## Filtros

- Proyecto.
- Cliente.
- Activo.
- Responsable.
- Severidad.
- Estado.
- Fecha.
- CVE.
- Etiquetas.

---

# Modelo de estados recomendado

```text
Nueva
   │
   ▼
En análisis
   │
   ▼
Validada
   │
   ▼
Priorizada
   │
   ▼
Asignada
   │
   ▼
En remediación
   │
   ▼
En pruebas
   │
   ▼
Pendiente de verificación
   │
   ├───────────────┐
   ▼               │
Verificada         │
   │               │
   ▼               │
Cerrada ◄──────────┘
        (si falla la verificación vuelve a "En remediación")
```

---

# Más allá del seguimiento

Los sistemas de remediación modernos no solo registran el avance de las vulnerabilidades, sino que funcionan como una **plataforma de gestión del ciclo de vida de la remediación**.

Integran información de escáneres, herramientas de desarrollo (Git, Jira, Azure DevOps), pipelines de CI/CD y soluciones SIEM para automatizar tareas, medir indicadores (como MTTR y cumplimiento de SLA), generar alertas por vencimientos y mantener un historial completo para auditorías y cumplimiento normativo (ISO 27001, PCI DSS, NIST, entre otros).

De esta forma, la organización puede demostrar no solo que detecta vulnerabilidades, sino que cuenta con un proceso controlado, medible y trazable para resolverlas.
