# KPIs más utilizados en la industria para Sistemas de Tracking de Remediación

# Introducción

Los KPIs (Key Performance Indicators) permiten medir la eficiencia del proceso de gestión y remediación de vulnerabilidades. Son utilizados por equipos de Seguridad, SOC, DevSecOps, CISO, auditores y áreas de Compliance para evaluar el estado de seguridad de la organización, detectar cuellos de botella y demostrar el cumplimiento de políticas y normativas como NIST, ISO 27001, CIS Controls y PCI DSS.

---

# 1. MTTR (Mean Time To Remediate)

## ¿Qué mide?

El tiempo promedio que tarda una organización en corregir una vulnerabilidad desde que fue detectada hasta que se valida su remediación.

## ¿Por qué es importante?

Es el principal indicador de eficiencia del proceso de remediación. Un MTTR bajo reduce la ventana de exposición y el riesgo de explotación.

## Fórmula

```text
MTTR = Σ(Tiempo de remediación de cada vulnerabilidad) / Total de vulnerabilidades cerradas
```

## Interpretación

- Bajo → Excelente capacidad de respuesta.
- Alto → Existen demoras en el proceso.

## Dashboard

- MTTR general.
- MTTR por severidad.
- MTTR por proyecto.
- MTTR por responsable.
- Evolución mensual.

---

# 2. Cumplimiento de SLA

## ¿Qué mide?

El porcentaje de vulnerabilidades corregidas dentro del tiempo comprometido por la organización.

## ¿Por qué es importante?

Permite saber si los equipos cumplen los objetivos establecidos.

## Fórmula

```text
Cumplimiento SLA =
(Vulnerabilidades cerradas dentro del SLA /
Total de vulnerabilidades cerradas) × 100
```

## Dashboard

- % SLA general.
- SLA por severidad.
- SLA por equipo.
- Vulnerabilidades vencidas.

---

# 3. Backlog de Vulnerabilidades

## ¿Qué mide?

La cantidad de vulnerabilidades abiertas en un momento determinado.

## ¿Por qué es importante?

Un backlog creciente indica acumulación de deuda de seguridad.

## Dashboard

- Total abiertas.
- Abiertas por severidad.
- Abiertas por proyecto.
- Tendencia histórica.

---

# 4. Vulnerabilidades Abiertas vs Cerradas

## ¿Qué mide?

Compara las vulnerabilidades detectadas con las remediadas durante un período.

## ¿Por qué es importante?

Permite saber si la organización reduce o aumenta su deuda técnica.

## Dashboard

- Detectadas por mes.
- Cerradas por mes.
- Balance mensual.

---

# 5. Aging de Vulnerabilidades

## ¿Qué mide?

La antigüedad de las vulnerabilidades que permanecen abiertas.

## ¿Por qué es importante?

Ayuda a identificar vulnerabilidades olvidadas o incumplimientos de SLA.

## Rangos habituales

- 0–30 días
- 31–60 días
- 61–90 días
- Más de 90 días

---

# 6. Tiempo Promedio por Estado

## ¿Qué mide?

El tiempo promedio que una vulnerabilidad permanece en cada etapa del flujo.

## Estados típicos

- Nueva
- En análisis
- Asignada
- En remediación
- En pruebas
- Pendiente de verificación
- Cerrada

## ¿Por qué es importante?

Permite detectar cuellos de botella específicos del proceso.

---

# 7. Vulnerabilidades por Severidad

## ¿Qué mide?

Distribución de vulnerabilidades según su criticidad.

## Clasificación

- Crítica
- Alta
- Media
- Baja

## ¿Por qué es importante?

Facilita la priorización de esfuerzos y la evaluación del riesgo global.

---

# 8. Vulnerabilidades por Responsable

## ¿Qué mide?

La cantidad de vulnerabilidades asignadas a cada persona o equipo.

## ¿Por qué es importante?

Permite equilibrar la carga de trabajo e identificar equipos saturados.

---

# 9. Tiempo Promedio por Criticidad

## ¿Qué mide?

El tiempo de remediación según el nivel de severidad.

## Ejemplo

- Críticas → 24 horas
- Altas → 3 días
- Medias → 10 días
- Bajas → 30 días

## ¿Por qué es importante?

Permite verificar que las vulnerabilidades más graves reciben atención prioritaria.

---

# 10. Reincidencia de Vulnerabilidades

## ¿Qué mide?

La cantidad de vulnerabilidades que reaparecen después de haber sido cerradas.

## ¿Por qué es importante?

Indica la calidad de las remediaciones y la madurez del proceso.

---

# KPIs complementarios

Aunque no siempre forman parte del dashboard ejecutivo, también son ampliamente utilizados:

- MTTD (Mean Time To Detect).
- MTTV (Mean Time To Verify).
- Tiempo hasta la asignación.
- Tiempo hasta el inicio de la remediación.
- Tasa de remediación.
- Riesgo residual.
- Vulnerabilidades por activo.
- Vulnerabilidades por proyecto.
- Vulnerabilidades vencidas.
- Distribución por tipo de vulnerabilidad (OWASP, CWE, CVE).
- Tendencia del riesgo.
- Cobertura de escaneos.
- Vulnerabilidades detectadas por herramienta.
- Porcentaje de falsos positivos.
- Eficiencia del proceso de remediación.

---

# Dashboard recomendado para un CISO

## Vista Ejecutiva

- MTTR.
- Cumplimiento de SLA.
- Backlog.
- Vulnerabilidades críticas abiertas.
- Aging.
- Riesgo residual.
- Tendencia mensual.
- Reincidencias.

## Vista Operativa

- Vulnerabilidades por estado.
- Vulnerabilidades por responsable.
- Vulnerabilidades por proyecto.
- Vulnerabilidades por activo.
- Tiempo promedio por estado.
- Tiempo promedio por criticidad.
- Vulnerabilidades vencidas.
- Balance abiertas vs cerradas.

---

# KPIs mínimos para un MVP

1. MTTR.
2. Cumplimiento de SLA.
3. Backlog de vulnerabilidades.
4. Vulnerabilidades abiertas vs. cerradas.
5. Aging de vulnerabilidades.
6. Tiempo promedio por estado.
7. Vulnerabilidades por severidad.
8. Vulnerabilidades por responsable.
9. Tiempo promedio por criticidad.
10. Reincidencia de vulnerabilidades.

Estos diez indicadores representan el conjunto de KPIs más utilizado en la industria y proporcionan una visión completa del rendimiento del proceso de remediación tanto a nivel operativo como ejecutivo.
