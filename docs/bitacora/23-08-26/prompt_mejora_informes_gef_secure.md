# Prompt para Claude Code — Auditoría y mejora integral de la sección de Informes

## Contexto

Estoy desarrollando una aplicación de gestión y notificación de vulnerabilidades llamada **GEF Secure**.

El proyecto ya se encuentra bastante avanzado y cuenta con distintas funcionalidades relacionadas con:

- gestión de activos;
- detección y seguimiento de vulnerabilidades;
- integración con fuentes como GitHub Advisory Database y CISA KEV;
- priorización de vulnerabilidades;
- escaneos automáticos y manuales;
- seguimiento de remediaciones;
- estados de vulnerabilidades;
- responsables;
- historial;
- métricas;
- auditoría;
- generación de algunos reportes o informes.

Actualmente existe una sección denominada **Informes**, pero considero que está demasiado básica y quiero mejorarla para que tenga una utilidad real dentro de una aplicación moderna de gestión de vulnerabilidades.

No quiero que implementes directamente una solución genérica sin revisar el proyecto.

Tu primera tarea debe ser **analizar el estado actual del proyecto y de la sección de Informes**, comprender qué información existe realmente y recién después diseñar e implementar la mejora.

---

# Objetivo principal

Transformar la sección actual de **Informes** en un verdadero **Centro de Informes de Seguridad**, útil tanto para perfiles técnicos como para responsables de gestión.

La sección debería permitir analizar información histórica, comunicar el estado de seguridad, evaluar evolución, remediaciones, activos y escaneos, además de generar informes exportables.

Debe diferenciarse claramente del Dashboard.

La idea conceptual es:

- **Dashboard:** ¿cómo estamos ahora?
- **Informes:** ¿qué ocurrió durante un período, cómo evolucionó la seguridad y cómo puedo documentarlo o comunicarlo?

---

# 1. Auditoría inicial obligatoria

Antes de modificar código, revisá completamente cómo está implementada actualmente la sección de Informes.

Analizá como mínimo:

- frontend;
- backend;
- modelos;
- entidades;
- DTOs/schemas;
- servicios;
- repositorios;
- endpoints;
- base de datos;
- generación de PDF o archivos;
- métricas existentes;
- gráficos existentes;
- filtros;
- sistema de permisos;
- roles;
- componentes reutilizables;
- historial;
- auditoría;
- escaneos;
- vulnerabilidades;
- activos;
- remediaciones.

Identificá exactamente:

1. qué funcionalidades ya existen;
2. qué métricas están disponibles;
3. qué datos pueden obtenerse actualmente;
4. qué datos todavía no existen;
5. qué componentes pueden reutilizarse;
6. qué endpoints pueden reutilizarse;
7. qué lógica está duplicada;
8. qué funcionalidades del Dashboard no deberían duplicarse;
9. qué partes de Informes están demasiado básicas;
10. qué mejoras pueden implementarse sin alterar innecesariamente la arquitectura actual.

No asumas estructuras, nombres de archivos, endpoints, tablas ni modelos.

Debés descubrirlos revisando el código real.

---

# 2. No romper funcionalidades existentes

La mejora debe respetar la arquitectura actual.

No reescribas módulos completos si no es necesario.

Priorizá:

- reutilización;
- bajo acoplamiento;
- consistencia con el código existente;
- mantenibilidad;
- escalabilidad;
- compatibilidad con funcionalidades actuales.

No elimines funcionalidades existentes de Informes salvo que estén claramente obsoletas y exista una mejora equivalente.

---

# 3. Propuesta conceptual de la nueva sección

Luego de analizar el proyecto, evaluá si tiene sentido organizar Informes mediante subsecciones o pestañas similares a:

- Resumen ejecutivo
- Vulnerabilidades
- Remediación
- Activos
- Escaneos
- Auditoría

Estos nombres son orientativos.

No los implementes obligatoriamente si el proyecto actual requiere una organización mejor.

La estructura final debe surgir del análisis real.

---

# 4. Resumen ejecutivo

Evaluá la posibilidad de incorporar un informe ejecutivo pensado para una persona que no necesita revisar CVE por CVE.

Debería mostrar únicamente información relevante.

Analizá si el proyecto dispone de datos suficientes para mostrar métricas como:

- postura general de seguridad;
- vulnerabilidades abiertas;
- vulnerabilidades críticas;
- vulnerabilidades altas;
- vulnerabilidades incluidas en CISA KEV;
- vulnerabilidades vencidas por SLA;
- activos afectados;
- MTTR;
- nuevas vulnerabilidades del período;
- vulnerabilidades resueltas;
- vulnerabilidades reabiertas;
- evolución del riesgo;
- evolución del backlog;
- activos con mayor exposición.

No inventes métricas que el sistema no pueda calcular correctamente.

Si una métrica requiere nueva lógica, documentalo y decidí si realmente vale la pena incorporarla.

---

# 5. Informe de vulnerabilidades

Evaluá crear una vista analítica de vulnerabilidades que permita analizar:

- distribución por severidad;
- distribución por estado;
- vulnerabilidades KEV;
- vulnerabilidades no KEV;
- vulnerabilidades zero-day si el proyecto maneja este concepto;
- distribución de CVSS;
- riesgo calculado por la aplicación;
- vulnerabilidades nuevas;
- vulnerabilidades resueltas;
- vulnerabilidades reabiertas;
- vulnerabilidades antiguas;
- Top CVE;
- Top vulnerabilidades por riesgo;
- evolución temporal.

Reutilizá la información disponible en el sistema.

---

# 6. Informe de remediación

Analizá en profundidad toda la información relacionada con remediaciones.

Si el proyecto lo permite, considerar:

- MTTR;
- MTTR por severidad;
- MTTR declarado;
- MTTR verificado;
- porcentaje de cumplimiento de SLA;
- vulnerabilidades fuera de SLA;
- vulnerabilidades resueltas por período;
- aging;
- riesgo aceptado;
- no aplica;
- mitigaciones;
- remediaciones verificadas;
- responsables;
- evolución de tiempos de resolución.

Esta sección debería permitir responder:

> ¿La organización está resolviendo las vulnerabilidades de forma eficiente?

---

# 7. Informe de activos

Evaluá incorporar análisis por activos.

Posibles métricas:

- activos más expuestos;
- activos con más vulnerabilidades;
- activos con vulnerabilidades críticas;
- activos con vulnerabilidades KEV;
- criticidad del activo;
- riesgo acumulado;
- cantidad de software vulnerable;
- evolución del riesgo del activo;
- entornos más afectados.

El objetivo sería responder:

> ¿Dónde está concentrado el riesgo?

---

# 8. Informe de escaneos

Analizá los datos disponibles de los escaneos.

Podrían incluir:

- cantidad de escaneos;
- escaneos automáticos;
- escaneos manuales;
- escaneos exitosos;
- escaneos con errores;
- vulnerabilidades detectadas;
- activos analizados;
- duración promedio;
- evolución de detecciones;
- comparación entre escaneos;
- últimas ejecuciones.

No duplicar la pantalla de historial de escaneos.

Informes debe aportar análisis agregado.

---

# 9. Informe de auditoría

Si el sistema registra eventos de auditoría, analizar la posibilidad de aprovecharlos para informes.

Por ejemplo:

- cambios de estado;
- responsables;
- usuario que realizó una acción;
- fecha;
- evidencias;
- justificaciones;
- aceptación de riesgo;
- vulnerabilidades marcadas como no aplicables;
- remediaciones;
- verificaciones.

El objetivo sería permitir reconstruir:

> quién hizo qué, cuándo y por qué.

---

# 10. Generador de informes

Evaluá incorporar un botón principal similar a:

**Generar informe**

El usuario debería poder configurar el informe antes de generarlo.

Analizá la posibilidad de soportar filtros como:

- tipo de informe;
- período;
- entorno;
- activos;
- severidad;
- estado;
- responsable;
- origen del escaneo;
- KEV;
- criticidad.

También evaluar opciones como:

- incluir gráficos;
- incluir métricas;
- incluir vulnerabilidades;
- incluir evidencias;
- incluir recomendaciones.

No agregar filtros que no tengan sentido con los datos existentes.

---

# 11. Exportación

Revisá qué formatos soporta actualmente el proyecto.

Idealmente evaluar:

- PDF;
- CSV.

Si actualmente ya existe generación de PDF, reutilizarla o mejorarla.

No implementar una nueva librería si la actual puede extenderse correctamente.

Los PDFs deberían tener una apariencia profesional y consistente con la identidad visual de GEF Secure.

---

# 12. Informes recientes

Evaluá si tiene sentido persistir o registrar informes generados.

Una posible sección:

**Informes recientes**

Con datos como:

- nombre;
- tipo;
- período;
- usuario;
- fecha;
- filtros;
- formato;
- acciones.

Acciones posibles:

- visualizar;
- volver a descargar;
- regenerar.

Antes de implementar persistencia nueva, revisar si el proyecto ya cuenta con mecanismos equivalentes.

---

# 13. Comparación temporal

Analizá si es posible comparar períodos.

Por ejemplo:

- últimos 7 días vs período anterior;
- últimos 30 días vs período anterior;
- mes actual vs mes anterior;
- escaneo actual vs escaneo anterior.

Mostrar tendencias como:

- ↑ aumentó;
- ↓ disminuyó;
- → estable.

Esto debería utilizarse únicamente en métricas donde tenga sentido.

---

# 14. Filtros globales

Evaluá implementar filtros globales en Informes.

Ejemplos:

- período;
- entorno;
- activo;
- severidad;
- responsable.

Los filtros deberían actualizar coherentemente:

- KPIs;
- gráficos;
- tablas;
- exportaciones.

Evitar filtros duplicados o inconsistentes.

---

# 15. UX/UI

Analizá también el diseño actual de Informes.

Quiero que la sección se vea moderna y profesional.

Revisar:

- jerarquía visual;
- espaciado;
- tarjetas;
- gráficos;
- navegación;
- filtros;
- tablas;
- estados vacíos;
- estados de carga;
- errores;
- responsive;
- accesibilidad;
- consistencia con el resto de GEF Secure.

No hacer un rediseño completamente desconectado del diseño actual.

Debe sentirse parte de la misma aplicación.

---

# 16. Gráficos

No agregar gráficos solamente por estética.

Cada gráfico debe responder una pregunta concreta.

Evaluar únicamente gráficos realmente útiles como:

- tendencia temporal;
- distribución por severidad;
- distribución por estado;
- evolución de vulnerabilidades;
- cumplimiento SLA;
- aging;
- activos con mayor riesgo;
- vulnerabilidades nuevas vs resueltas.

Evitar dashboards saturados.

---

# 17. Evitar duplicar el Dashboard

Revisá el Dashboard actual antes de diseñar Informes.

Si un gráfico o KPI ya aparece en el Dashboard, determinar si:

- tiene sentido reutilizarlo;
- tiene sentido ampliarlo con dimensión temporal;
- debe mantenerse solamente en Dashboard.

No copiar el Dashboard dentro de Informes.

---

# 18. Backend

Revisá si los endpoints actuales son suficientes.

Si hacen falta endpoints nuevos:

- seguir las convenciones del proyecto;
- evitar endpoints excesivamente específicos;
- evitar lógica de negocio en controllers/routes;
- reutilizar services/repositories;
- evitar consultas N+1;
- cuidar rendimiento;
- utilizar agregaciones eficientes.

Si existen grandes volúmenes de información, evaluar paginación.

---

# 19. Seguridad y permisos

Revisá qué roles pueden acceder actualmente a Informes.

Determinar si todos los usuarios deben ver la misma información.

Considerar:

- administrador;
- responsables;
- usuarios técnicos;
- perfiles de lectura;
- otros roles existentes.

No inventar roles nuevos.

Utilizar únicamente los roles realmente existentes en el proyecto.

---

# 20. Estados de interfaz

La nueva sección debe contemplar correctamente:

- loading;
- error;
- empty state;
- datos parciales;
- filtros sin resultados;
- error al generar informe;
- informe generado correctamente.

---

# 21. Rendimiento

Evitar cargar todos los datos de la aplicación para construir los informes.

Analizar:

- agregaciones en backend;
- consultas SQL;
- índices;
- caching si realmente fuera necesario;
- carga diferida;
- paginación;
- filtros desde backend.

No introducir optimizaciones prematuras.

---

# 22. Tests

Revisá la estrategia de testing existente.

Agregar o actualizar tests para las funcionalidades nuevas.

Como mínimo analizar:

- tests de servicios;
- tests de endpoints;
- filtros;
- cálculos;
- permisos;
- generación de informes;
- métricas;
- casos sin datos;
- errores.

No romper tests existentes.

---

# 23. Calidad de métricas

Todas las métricas deben tener una definición clara.

Antes de implementar una métrica como:

- MTTR;
- SLA;
- aging;
- riesgo;
- vulnerabilidad resuelta;
- vulnerabilidad reabierta;

revisar cómo está definida actualmente dentro del proyecto.

No introducir una segunda definición diferente.

---

# 24. Plan de implementación

Antes de modificar código, generá internamente un plan de implementación dividido por etapas.

Ejemplo:

1. auditoría;
2. diseño de información;
3. backend;
4. frontend;
5. exportación;
6. tests;
7. revisión final.

Después implementá progresivamente.

---

# 25. Resultado esperado

Al finalizar, la sección de Informes debería permitir que un usuario pueda comprender:

1. cuál fue el estado de seguridad durante un período;
2. cómo evolucionaron las vulnerabilidades;
3. cuáles fueron las áreas más afectadas;
4. cómo evolucionó el riesgo;
5. qué activos concentran mayor exposición;
6. qué tan eficiente fue la remediación;
7. qué ocurrió durante los escaneos;
8. qué acciones fueron realizadas;
9. si se cumplieron los SLA;
10. cómo comunicar esa información mediante un informe profesional.

---

# 26. Restricciones importantes

No:

- inventar datos;
- inventar endpoints existentes;
- inventar roles;
- inventar entidades;
- crear funcionalidades sin revisar primero el código;
- duplicar información del Dashboard;
- romper compatibilidad;
- reescribir innecesariamente módulos estables;
- cambiar arquitectura sin una justificación importante;
- agregar dependencias innecesarias;
- agregar gráficos decorativos;
- llenar la pantalla de KPIs sin valor.

Sí:

- analizar;
- reutilizar;
- simplificar;
- mejorar;
- integrar;
- mantener consistencia;
- justificar decisiones;
- aplicar buenas prácticas.

---

# 27. Revisión final

Después de implementar la mejora, realizar una revisión completa.

Verificar:

- frontend;
- backend;
- endpoints;
- permisos;
- consultas;
- métricas;
- filtros;
- gráficos;
- exportación;
- responsive;
- UX;
- errores;
- tests;
- consistencia visual.

Confirmar que no se hayan introducido regresiones.

---

# 28. Informe final de cambios

Al terminar, mostrarme un resumen indicando:

## Estado anterior

Qué tenía originalmente Informes.

## Problemas detectados

Qué limitaciones encontraste.

## Cambios realizados

Qué se agregó, modificó o reutilizó.

## Backend

Endpoints, servicios o consultas modificadas.

## Frontend

Pantallas, componentes y gráficos modificados.

## Base de datos

Cambios realizados, si existieron.

## Tests

Qué tests fueron agregados o actualizados.

## Decisiones descartadas

Qué funcionalidades evaluaste pero decidiste no implementar y por qué.

## Resultado final

Cómo quedó organizada la nueva sección de Informes.

---

# Criterio principal

La prioridad no es agregar la mayor cantidad posible de funcionalidades.

La prioridad es transformar **Informes** en una sección coherente, útil, profesional y basada en los datos reales disponibles dentro de GEF Secure.

Primero comprender el proyecto.

Después diseñar.

Finalmente implementar.
