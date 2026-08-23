# Prompt — Rediseño integral de la sección Vulnerabilidades de GEF Secure

## Rol

Actuá como **Senior Cybersecurity Product Engineer + UX/UI Designer especializado en plataformas de Vulnerability Management / Vulnerability Intelligence**.

Tu objetivo es analizar el proyecto existente de **GEF Secure** y rediseñar en profundidad la sección **Vulnerabilidades**, tomando como base lo que ya está implementado y evitando crear funcionalidades desconectadas de la arquitectura, datos y flujos reales del sistema.

> IMPORTANTE: no quiero simplemente agregar gráficos para llenar espacio. Cada componente nuevo debe responder a una necesidad concreta de gestión, análisis, priorización o remediación de vulnerabilidades.

---

# 1. Contexto del proyecto

GEF Secure es una plataforma de gestión y notificación de vulnerabilidades que actualmente permite detectar vulnerabilidades asociadas a activos/software registrados, ejecutar escaneos, mantener trazabilidad de los resultados y trabajar con información proveniente de fuentes de vulnerabilidades.

El sistema cuenta además con automatizaciones mediante **n8n** y notificaciones mediante **Slack**, incluyendo un escaneo automático diario que funciona como uno de los principales puntos de entrada al sistema.

Actualmente existe una sección **Vulnerabilidades** que contiene principalmente un **tablero Kanban**.

El problema es que el Kanban permite gestionar el estado operativo de las vulnerabilidades, pero por sí solo no permite comprender correctamente:

- cuál es el nivel de riesgo actual;
- cuáles son las vulnerabilidades que requieren atención inmediata;
- qué activos concentran mayor riesgo;
- cómo evoluciona el backlog de vulnerabilidades;
- qué vulnerabilidades están vencidas;
- cuánto tarda el equipo en resolverlas;
- cuáles poseen explotación conocida;
- cómo se distribuyen por severidad;
- qué está ocurriendo con la remediación;
- si la situación de seguridad está mejorando o empeorando.

Por eso quiero transformar **Vulnerabilidades** en un módulo completo de **Vulnerability Management**, manteniendo el Kanban como una de sus herramientas pero complementándolo con las vistas necesarias.

---

# 2. Primera tarea obligatoria: analizar el proyecto real

ANTES de modificar código o proponer componentes, recorré el proyecto completo y analizá especialmente:

- frontend;
- backend;
- modelos y entidades;
- base de datos;
- endpoints/API;
- servicios;
- sistema de escaneos;
- historial de escaneos;
- activos;
- software/productos asociados a activos;
- vulnerabilidades;
- severidades;
- CVE/CVSS;
- estados actuales;
- responsables/usuarios si existen;
- timestamps disponibles;
- fuentes de vulnerabilidades;
- CISA KEV si está integrada;
- GitHub Advisory si está integrado;
- cualquier otra fuente existente;
- automatizaciones relacionadas;
- integración con n8n;
- notificaciones de Slack;
- dashboard general existente;
- diseño y componentes reutilizables del frontend.

No asumas que los nombres indicados en este documento coinciden exactamente con los del proyecto.

Usá los nombres, modelos, estados, rutas y estructuras que realmente existan.

Identificá primero qué información ya tenemos disponible y qué información sería necesario calcular, agregar o persistir.

---

# 3. Objetivo funcional

La sección **Vulnerabilidades** debe convertirse en el lugar central desde donde un usuario pueda responder rápidamente:

1. ¿Cuántas vulnerabilidades tengo abiertas?
2. ¿Cuáles son realmente prioritarias?
3. ¿Cuáles son críticas?
4. ¿Cuáles poseen explotación conocida?
5. ¿Qué activos están más expuestos?
6. ¿Qué vulnerabilidades están vencidas o próximas a vencer?
7. ¿Cuánto tiempo llevan abiertas?
8. ¿Cuántas vulnerabilidades nuevas aparecen?
9. ¿Cuántas estamos resolviendo?
10. ¿Nuestro backlog está creciendo o disminuyendo?
11. ¿Quién está trabajando sobre cada vulnerabilidad?
12. ¿En qué estado se encuentra cada remediación?
13. ¿Qué debería atender primero el equipo?

La interfaz debe permitir pasar de una visión ejecutiva/general a una investigación concreta de una vulnerabilidad sin perder contexto.

---

# 4. Arquitectura propuesta para Vulnerabilidades

La sección principal debería contener distintas vistas internas.

Como punto de partida, evaluar la siguiente estructura:

```text
Vulnerabilidades

[Resumen] [Análisis] [Listado] [Kanban]
```

Podés ajustar nombres, orden o agrupación si después de analizar el proyecto encontrás una alternativa mejor.

Sin embargo, las capacidades descriptas a continuación deben estar contempladas.

---

# 5. Vista 1 — Resumen

Crear una vista inicial que funcione como **Vulnerability Overview**.

No debe reemplazar al Dashboard general de la aplicación. Debe concentrarse exclusivamente en la situación de vulnerabilidades y remediación.

## 5.1 KPIs principales

Evaluar la implementación de tarjetas con:

- Vulnerabilidades abiertas.
- Vulnerabilidades críticas.
- Vulnerabilidades High.
- Vulnerabilidades con explotación conocida.
- Vulnerabilidades vencidas según SLA.
- Activos actualmente afectados.
- Vulnerabilidades nuevas en los últimos 7 días.
- Vulnerabilidades resueltas en los últimos 7 días.

Cuando tenga sentido, mostrar comparación contra el período anterior.

Ejemplos:

```text
Abiertas
124
+8 esta semana

Críticas
12
-3 respecto a la semana anterior

Fuera de SLA
17
+4 esta semana
```

Los textos son ejemplos. Adaptarlos a los datos reales disponibles.

## 5.2 Estado general de riesgo

Incluir una representación compacta del estado actual del backlog.

Por ejemplo:

```text
Critical   12
High       31
Medium     54
Low        27
```

Evitar visualizaciones innecesariamente complejas.

## 5.3 Atención inmediata

Agregar un bloque tipo:

**Requieren atención**

que muestre un pequeño ranking de las vulnerabilidades que deberían revisarse primero.

La selección NO debería depender exclusivamente del CVSS.

Considerar, según los datos existentes:

- severidad;
- CVSS;
- explotación conocida;
- presencia en CISA KEV;
- criticidad del activo;
- exposición del activo;
- antigüedad;
- vencimiento de SLA;
- cantidad de activos afectados;
- disponibilidad de fix/parche;
- estado actual.

Desde cada elemento debe poder abrirse el detalle correspondiente.

## 5.4 Activos con mayor riesgo

Mostrar los activos que concentran mayor cantidad o gravedad de vulnerabilidades.

Ejemplo conceptual:

```text
Servidor Producción 01     3 Critical | 8 High
API Gateway                2 Critical | 4 High
Servidor DB                1 Critical | 7 High
```

La métrica exacta debe adaptarse al modelo real del proyecto.

---

# 6. Vista 2 — Análisis

Esta vista debe responder principalmente a:

> ¿Qué está ocurriendo con nuestras vulnerabilidades y con el proceso de remediación?

## 6.1 Distribución por severidad

Mostrar distribución de:

- Critical;
- High;
- Medium;
- Low;
- Unknown, si corresponde.

Seleccionar el gráfico más apropiado según el diseño actual.

## 6.2 Evolución del backlog

Implementar un gráfico temporal que permita visualizar la evolución de las vulnerabilidades.

Idealmente incluir:

- vulnerabilidades nuevas;
- vulnerabilidades resueltas;
- total de vulnerabilidades abiertas.

Permitir períodos como:

- 7 días;
- 30 días;
- 90 días;
- período personalizado, solamente si tiene sentido dentro de la arquitectura actual.

Este gráfico es importante porque debe permitir identificar si el equipo está resolviendo vulnerabilidades más rápido de lo que aparecen.

## 6.3 Vulnerabilidades por estado

Mostrar cómo se distribuye el trabajo según el workflow real del sistema.

Por ejemplo, si el modelo termina utilizando:

```text
Detectada
En análisis
Priorizada
En remediación
En validación
Resuelta
```

mostrar la cantidad correspondiente.

NO crear estos estados automáticamente si el proyecto actualmente utiliza otros. Primero analizar el workflow existente y decidir si necesita ser mejorado.

## 6.4 Antigüedad del backlog

Agregar análisis de aging.

Ejemplo:

```text
0–7 días
8–30 días
31–60 días
61–90 días
+90 días
```

Esto permite detectar vulnerabilidades que permanecen abiertas durante demasiado tiempo.

## 6.5 Cumplimiento de SLA

Si el proyecto ya posee SLA o existe información suficiente para incorporarlo correctamente, mostrar:

- dentro de SLA;
- próximas a vencer;
- vencidas.

Además, evaluar métricas como:

- porcentaje de cumplimiento;
- vulnerabilidades vencidas por severidad.

Si actualmente NO existe un modelo de SLA, documentar qué sería necesario implementar antes de construir esta funcionalidad.

No inventar datos.

## 6.6 Tiempo de remediación

Si los timestamps disponibles lo permiten, calcular métricas como:

- Mean Time To Remediate (MTTR);
- tiempo promedio por severidad;
- evolución del tiempo de resolución.

Ejemplo:

```text
Critical    2.4 días
High        5.8 días
Medium      12.1 días
```

Solo implementar métricas que puedan calcularse correctamente con los datos reales.

## 6.7 Fuentes de vulnerabilidades

Si existen múltiples fuentes integradas, mostrar cómo se distribuyen las detecciones o referencias.

Por ejemplo:

- CISA KEV;
- GitHub Advisory;
- NVD;
- otras fuentes existentes.

Evitar duplicar una misma vulnerabilidad únicamente porque proviene de más de una fuente.

---

# 7. Vista 3 — Listado de vulnerabilidades

Además del Kanban debe existir una vista orientada a investigación, búsqueda y operación masiva.

Implementar una tabla/listado profesional.

## Información relevante

Evaluar columnas como:

- CVE / identificador;
- vulnerabilidad;
- activo;
- software/producto;
- severidad;
- CVSS;
- prioridad;
- estado;
- responsable;
- explotación conocida;
- CISA KEV;
- fecha de detección;
- antigüedad;
- SLA;
- última actualización.

No mostrar veinte columnas simultáneamente si perjudica la UX.

Definir cuáles son principales y cuáles pueden quedar ocultas/configurables o dentro del detalle.

## Filtros

Agregar filtros útiles, por ejemplo:

- severidad;
- estado;
- activo;
- software;
- responsable;
- fuente;
- explotación conocida;
- CISA KEV;
- estado de SLA;
- rango de fechas.

Agregar búsqueda por:

- CVE;
- nombre;
- activo;
- software.

Los filtros deben poder combinarse.

## Ordenamiento

Permitir ordenar, como mínimo, por criterios relevantes disponibles:

- prioridad;
- CVSS;
- fecha de detección;
- antigüedad;
- vencimiento;
- severidad.

---

# 8. Vista 4 — Kanban de remediación

Conservar el Kanban actual, pero analizarlo en profundidad.

El objetivo del Kanban debe quedar claramente definido:

> gestionar el workflow de análisis y remediación de vulnerabilidades.

No debe intentar funcionar simultáneamente como dashboard, listado completo y herramienta analítica.

## 8.1 Workflow

Analizar los estados actuales del proyecto.

Evaluar si representan correctamente un ciclo de gestión similar a:

```text
Detectada
↓
En análisis
↓
Priorizada
↓
En remediación
↓
En validación
↓
Resuelta
```

Esto es solamente una referencia.

Si los estados actuales son adecuados, mantenerlos.

Si son insuficientes, proponer una migración clara y justificarla.

## 8.2 Tarjetas

Las tarjetas deberían permitir reconocer rápidamente:

- CVE;
- título/nombre;
- severidad;
- CVSS;
- activo afectado;
- responsable;
- prioridad;
- antigüedad;
- SLA;
- explotación conocida / KEV cuando corresponda.

No saturar visualmente la tarjeta.

Usar jerarquía visual para destacar solamente la información necesaria para tomar decisiones.

## 8.3 Interacciones

Evaluar:

- drag & drop entre estados;
- filtros;
- búsqueda;
- asignación de responsable;
- acceso al detalle;
- indicadores de vencimiento;
- actualización del estado;
- historial de cambios.

Cada movimiento importante debería conservar trazabilidad si la arquitectura del sistema lo permite.

---

# 9. Detalle de vulnerabilidad

Revisar también la pantalla/modal/drawer actual de detalle.

Desde Resumen, Análisis, Listado o Kanban, el usuario debería poder llegar al mismo detalle de vulnerabilidad.

El detalle debería centralizar información como:

## Identificación

- CVE;
- nombre/descripción;
- severidad;
- CVSS;
- fuente/origen.

## Contexto

- activo afectado;
- software/producto;
- versión afectada;
- entorno, si existe;
- primera detección;
- última detección.

## Inteligencia de riesgo

Cuando exista información real:

- explotación conocida;
- CISA KEV;
- exploit disponible;
- referencias externas;
- fix/parche disponible;
- versión corregida.

## Gestión

- prioridad;
- estado;
- responsable;
- SLA;
- fecha límite;
- notas/comentarios si existen.

## Trazabilidad

Mostrar un timeline cuando los datos lo permitan:

```text
Detectada
Asignada
En análisis
En remediación
Validada
Resuelta
```

Incluir fecha, usuario y cambio realizado cuando esa información exista.

---

# 10. Sistema de priorización

Analizar si actualmente el sistema utiliza solamente severidad/CVSS para priorizar.

Si es así, evaluar una estrategia de **risk-based vulnerability prioritization**.

No hace falta crear un algoritmo artificialmente complejo.

La prioridad podría considerar variables existentes como:

```text
Severidad / CVSS
+
Explotación conocida
+
CISA KEV
+
Criticidad del activo
+
Exposición
+
Antigüedad
+
SLA
+
Disponibilidad de fix
```

NO implementar una fórmula arbitraria sin justificarla.

Primero determinar qué datos posee realmente GEF Secure.

Luego proponer un modelo simple, explicable y mantenible.

El usuario debería poder entender por qué una vulnerabilidad recibió determinada prioridad.

Ejemplo conceptual:

```text
Prioridad: CRÍTICA

Motivos:
• CVSS 9.8
• Explotación conocida
• Incluida en CISA KEV
• Activo crítico de producción
• SLA vencido
```

Esto aporta mucho más valor que mostrar únicamente `CVSS: 9.8`.

---

# 11. Relación entre vulnerabilidades y activos

Aprovechar el modelo de activos existente.

Desde Vulnerabilidades debería ser posible comprender:

```text
Vulnerabilidad
      ↓
Software afectado
      ↓
Activo
      ↓
Entorno / contexto
```

siempre respetando la estructura real del proyecto.

Una misma vulnerabilidad puede afectar varios activos y esto debe modelarse correctamente, evitando duplicaciones conceptuales incorrectas.

---

# 12. Relación con los escaneos

La vulnerabilidad no debe quedar desconectada de su origen.

Cuando sea posible, conservar relación con:

- scan ID / identificador de escaneo;
- tipo de escaneo;
- fecha de detección;
- primera detección;
- última detección;
- escaneo automático/manual;
- fuente que produjo el match.

Desde el detalle de una vulnerabilidad debería poder investigarse de dónde surgió.

Y desde un escaneo debería poder navegarse hacia las vulnerabilidades detectadas.

---

# 13. Integración con el escaneo automático diario

GEF Secure posee un escaneo automático diario ejecutado mediante n8n y comunicado mediante Slack.

Analizar cómo conectar correctamente este flujo con Vulnerabilidades.

Ejemplo conceptual:

```text
Escaneo automático diario
        ↓
Nuevas vulnerabilidades detectadas
        ↓
Priorización
        ↓
Vulnerability Management
        ↓
Kanban / remediación
```

Una vulnerabilidad nueva detectada por el escaneo debería aparecer naturalmente dentro del flujo de gestión sin requerir duplicaciones manuales.

---

# 14. UX/UI

Quiero que la sección tenga apariencia de producto SaaS moderno de ciberseguridad.

Antes de diseñar componentes nuevos:

1. revisar el design system actual;
2. identificar componentes reutilizables;
3. revisar tipografía, spacing, colores y jerarquías;
4. revisar responsive design;
5. mantener coherencia con el resto de GEF Secure.

Evitar:

- dashboards saturados;
- exceso de cards;
- gráficos decorativos;
- colores sin significado;
- repetir la misma información en varias vistas;
- tablas imposibles de leer;
- mostrar todos los datos simultáneamente;
- crear una interfaz estilo "demo" que no pueda sostenerse con datos reales.

Cada vista debe tener una función clara:

```text
RESUMEN
¿Qué requiere mi atención?

ANÁLISIS
¿Qué está pasando con el riesgo y la remediación?

LISTADO
¿Qué vulnerabilidades existen y cómo puedo investigarlas?

KANBAN
¿En qué estado está el trabajo de remediación?

DETALLE
¿Qué necesito saber y hacer respecto de esta vulnerabilidad?
```

---

# 15. Evitar duplicar el Dashboard general

Revisar el Dashboard existente de GEF Secure antes de implementar esta sección.

Si alguna métrica ya existe allí, decidir si:

- tiene sentido repetirla porque es necesaria dentro del contexto de Vulnerabilidades;
- debe mostrarse de manera más específica;
- o debe evitarse para no duplicar información.

El Dashboard general debe responder a la salud general del sistema.

El módulo Vulnerabilidades debe responder específicamente a la **gestión del riesgo de vulnerabilidades**.

---

# 16. Backend y modelo de datos

No resolver esto únicamente desde frontend con datos mockeados.

Analizar qué necesita cada nueva funcionalidad.

Para cada métrica determinar:

```text
Dato ya disponible
Dato calculable
Dato que requiere nuevo endpoint
Dato que requiere modificar el modelo
Dato que actualmente no existe
```

Si hacen falta nuevos endpoints, implementarlos siguiendo la arquitectura existente.

Si hacen falta cambios de base de datos, utilizar migraciones según las herramientas que ya utilice el proyecto.

No romper compatibilidad con los flujos actuales.

---

# 17. Performance

Considerar que la cantidad de vulnerabilidades puede crecer significativamente.

Evitar descargar todas las vulnerabilidades al frontend para calcular métricas.

Para listados grandes utilizar, según corresponda:

- paginación;
- filtros server-side;
- sorting server-side;
- endpoints agregados para analytics.

Evitar consultas N+1.

Revisar índices de base de datos si se incorporan consultas frecuentes por:

- severidad;
- estado;
- activo;
- CVE;
- fecha;
- responsable;
- SLA.

---

# 18. Seguridad

Mantener las reglas de autenticación y autorización existentes.

Si existen roles/permisos, revisar qué acciones puede realizar cada perfil.

Por ejemplo, diferenciar cuando corresponda entre:

- visualizar;
- asignar;
- cambiar estado;
- modificar prioridad;
- cerrar/resolver vulnerabilidad.

No implementar permisos aislados del modelo general de autorización del proyecto.

---

# 19. Estados vacíos y casos especiales

Diseñar correctamente estados como:

- todavía no existen vulnerabilidades;
- ningún resultado coincide con los filtros;
- todavía no existen suficientes datos históricos para calcular tendencias;
- no existe información de SLA;
- vulnerabilidad sin CVSS;
- vulnerabilidad sin responsable;
- activo eliminado/inactivo;
- fuente externa sin información disponible.

No mostrar `0`, `NaN`, gráficos vacíos o datos engañosos cuando en realidad falta información.

---

# 20. Responsive

La sección debe funcionar correctamente en diferentes resoluciones.

Priorizar especialmente desktop, ya que es una herramienta de gestión, pero asegurar comportamiento razonable en tablet y mobile.

El Kanban puede requerir scroll horizontal controlado en resoluciones pequeñas.

Las tablas deben tener una estrategia responsive clara.

---

# 21. Accesibilidad

Mantener buenas prácticas básicas:

- contraste suficiente;
- estados que no dependan únicamente del color;
- labels/tooltips cuando corresponda;
- navegación coherente;
- elementos interactivos identificables;
- soporte razonable de teclado.

---

# 22. Qué NO quiero

No quiero que simplemente hagas:

```text
+ 4 cards
+ 3 gráficos
+ una tabla
```

sin analizar el producto.

Tampoco quiero copiar literalmente interfaces de otras herramientas.

Quiero que estudies el proyecto y determines qué necesita **GEF Secure específicamente**.

No agregues:

- métricas que no puedan calcularse;
- datos mock como solución definitiva;
- gráficos decorativos;
- funcionalidades empresariales extremadamente complejas que no aporten al alcance actual;
- dependencias nuevas innecesarias;
- abstracciones prematuras.

---

# 23. Proceso de trabajo obligatorio

Realizá el trabajo por etapas.

## Fase 1 — Auditoría

Analizar la implementación actual de Vulnerabilidades.

Documentar:

- componentes actuales;
- endpoints utilizados;
- modelos;
- estados;
- datos disponibles;
- problemas UX;
- problemas funcionales;
- funcionalidades faltantes;
- duplicaciones con otras secciones.

## Fase 2 — Diseño funcional

Antes de modificar código, definir la arquitectura final del módulo.

Entregar algo similar a:

```text
Vulnerabilidades
│
├── Resumen
│   ├── KPIs
│   ├── Atención inmediata
│   ├── Estado de riesgo
│   └── Activos con mayor riesgo
│
├── Análisis
│   ├── Severidad
│   ├── Evolución del backlog
│   ├── Nuevas vs resueltas
│   ├── Aging
│   ├── SLA
│   └── MTTR
│
├── Listado
│   ├── Búsqueda
│   ├── Filtros
│   ├── Ordenamiento
│   └── Detalle
│
└── Kanban
    ├── Workflow
    ├── Asignación
    ├── SLA
    └── Remediación
```

Modificar esta estructura cuando el análisis del proyecto demuestre que existe una alternativa mejor.

## Fase 3 — Modelo de datos/API

Identificar cambios necesarios de backend y base de datos.

No implementar analytics incorrectamente desde frontend.

## Fase 4 — Implementación frontend

Implementar progresivamente las vistas respetando el diseño actual.

## Fase 5 — Integración

Conectar:

```text
Escaneos → Vulnerabilidades → Priorización → Remediación → Resolución
```

## Fase 6 — Testing

Verificar:

- cálculos;
- filtros;
- paginación;
- permisos;
- cambios de estado;
- drag & drop;
- navegación;
- responsive;
- estados vacíos;
- errores de API.

Ejecutar los tests existentes y agregar tests donde sean necesarios.

---

# 24. Criterio de finalización

La tarea NO está terminada simplemente cuando las nuevas pantallas renderizan.

Debe quedar un flujo coherente en el que:

```text
1. Una vulnerabilidad es detectada.
2. El sistema conserva su contexto y origen.
3. Puede ser analizada.
4. Puede ser priorizada.
5. Puede asignarse.
6. Puede gestionarse mediante el Kanban.
7. Puede remediarse.
8. Puede validarse/cerrarse.
9. Su historial queda disponible.
10. Los indicadores reflejan automáticamente ese cambio.
```

---

# 25. Resultado esperado

Al finalizar, la sección Vulnerabilidades debería sentirse como un módulo completo de gestión y no como un Kanban aislado.

La jerarquía conceptual debe ser:

```text
VULNERABILIDADES

        ┌───────────────┐
        │    Resumen    │
        │ Qué requiere  │
        │ mi atención   │
        └───────┬───────┘
                │
        ┌───────▼───────┐
        │    Análisis   │
        │ Qué está      │
        │ ocurriendo    │
        └───────┬───────┘
                │
        ┌───────▼───────┐
        │    Listado    │
        │ Investigar y  │
        │ filtrar       │
        └───────┬───────┘
                │
        ┌───────▼───────┐
        │     Kanban    │
        │ Gestionar la  │
        │ remediación   │
        └───────────────┘
```

Las cuatro vistas deben trabajar sobre la **misma información y el mismo dominio**, no convertirse en cuatro funcionalidades independientes.

Un cambio realizado en una vulnerabilidad debe reflejarse correctamente en las métricas, análisis, listado y Kanban.

---

# 26. Prioridad de implementación

Si el alcance resulta grande, priorizar en este orden:

### Prioridad 1 — Fundamental

- Resumen de vulnerabilidades.
- Priorización.
- Listado profesional.
- Mejora del Kanban.
- Detalle de vulnerabilidad.
- Navegación entre vistas.

### Prioridad 2 — Gestión

- SLA.
- Aging.
- responsables.
- trazabilidad.
- workflow de remediación.

### Prioridad 3 — Analytics

- evolución temporal;
- nuevas vs resueltas;
- MTTR;
- tendencias;
- análisis histórico.

No sacrificar consistencia del modelo para implementar más gráficos.

---

# 27. Entrega final

Una vez terminada la implementación, entregar un informe breve indicando:

1. Qué encontraste originalmente.
2. Qué problemas tenía la sección.
3. Qué arquitectura final elegiste.
4. Qué vistas fueron agregadas.
5. Qué cambios hiciste en frontend.
6. Qué cambios hiciste en backend.
7. Qué cambios hiciste en base de datos.
8. Cómo funciona la priorización.
9. Cómo funciona el workflow de remediación.
10. Qué métricas se implementaron y cómo se calculan.
11. Qué tests agregaste/modificaste.
12. Qué decisiones importantes tomaste y por qué.
13. Qué mejoras futuras quedarían fuera del alcance actual.

---

# Regla final

**No implementes a ciegas este documento como una especificación rígida.**

Usalo como objetivo funcional y de producto.

Primero entendé cómo funciona GEF Secure actualmente y luego adaptá la solución a su arquitectura real.

La prioridad es conseguir una sección de Vulnerabilidades que sea:

- útil;
- coherente;
- moderna;
- trazable;
- escalable;
- comprensible;
- orientada a riesgo;
- orientada a remediación;
- integrada con el resto del producto.

El Kanban debe seguir existiendo, pero debe convertirse en **la vista operativa de remediación dentro de un módulo de Vulnerability Management mucho más completo**.
