# Prompt para auditoría y mejora profunda del Dashboard

Quiero que realices una **auditoría profunda de UX/UI y funcionalidad de
la sección Dashboard** del proyecto antes de realizar cualquier
modificación.

El objetivo es transformar el dashboard actual en una interfaz
**moderna, profesional, clara y realmente útil**, manteniendo la
identidad visual y la arquitectura existente del proyecto.

Utiliza la skill `frontend-design` como referencia principal para el
análisis y la implementación.

## 1. Analizar primero el Dashboard actual

Antes de modificar código, revisa completamente la implementación actual
de la sección Dashboard.

Analiza:

-   estructura general de la página;
-   distribución de los componentes;
-   jerarquía visual;
-   orden de la información;
-   cards existentes;
-   métricas mostradas;
-   gráficos actuales;
-   tablas o listados;
-   estados de carga;
-   estados vacíos;
-   alertas o indicadores;
-   uso de colores;
-   tipografía;
-   iconografía;
-   espaciados;
-   tamaños;
-   alineaciones;
-   responsive design;
-   consistencia visual;
-   facilidad para interpretar rápidamente la información;
-   posibles elementos redundantes;
-   información importante que actualmente esté demasiado escondida;
-   información secundaria que esté ocupando demasiado protagonismo.

No realices cambios todavía.

## 2. Entender cuál debe ser el objetivo real del Dashboard

El Dashboard debe funcionar como una **vista ejecutiva y operativa del
estado de seguridad del sistema**.

Una persona que ingresa debería poder entender rápidamente:

-   cuál es el estado general de seguridad;
-   cuántas vulnerabilidades existen;
-   cuáles requieren atención prioritaria;
-   cómo se distribuyen según severidad;
-   qué activos están más afectados;
-   si la situación está mejorando o empeorando;
-   qué ocurrió en los últimos escaneos;
-   qué vulnerabilidades nuevas aparecieron;
-   cuáles fueron resueltas;
-   qué elementos requieren una acción inmediata.

Revisa si actualmente el dashboard permite responder estas preguntas de
forma rápida.

## 3. Revisar la organización de la información

Evalúa si la estructura actual es la correcta.

No mantengas la distribución actual simplemente porque ya existe.

Determina cuál debería ser la jerarquía visual ideal.

Por ejemplo, analiza si tendría sentido organizar el dashboard en
niveles como:

### Nivel 1 --- Estado general

Información que debería poder interpretarse en pocos segundos.

Ejemplos:

-   nivel general de riesgo;
-   vulnerabilidades críticas;
-   vulnerabilidades altas;
-   total de vulnerabilidades activas;
-   activos afectados;
-   último escaneo;
-   variación respecto del escaneo anterior.

### Nivel 2 --- Evolución y tendencias

Información que permita entender cómo cambia la situación con el tiempo.

### Nivel 3 --- Distribución del riesgo

Información sobre severidades, activos, software, categorías u otras
dimensiones relevantes.

### Nivel 4 --- Elementos que requieren atención

Información accionable.

Ejemplos:

-   activos con mayor riesgo;
-   vulnerabilidades críticas recientes;
-   vulnerabilidades sin resolver;
-   vulnerabilidades que reaparecieron;
-   software más afectado;
-   alertas prioritarias.

No tomes estos ejemplos como requisitos obligatorios.

Determina qué estructura tiene realmente sentido según los datos y
funcionalidades disponibles en el proyecto.

## 4. Revisar profundamente las métricas actuales

Analiza cada métrica que actualmente muestra el Dashboard.

Para cada una determina:

-   qué información aporta;
-   si es realmente útil;
-   si está duplicada;
-   si debería mantenerse;
-   si debería eliminarse;
-   si debería cambiar su posición;
-   si debería destacarse más;
-   si debería acompañarse con contexto adicional.

No agregues métricas únicamente para llenar espacio.

Cada elemento del Dashboard debe responder una pregunta concreta del
usuario.

## 5. Analizar si hacen falta nuevos gráficos

Revisa los gráficos existentes y determina si realmente ayudan a
interpretar el estado de seguridad.

Evalúa si debería incorporarse algún gráfico nuevo.

**NO agregues gráficos simplemente para hacer el dashboard más visual.**

Cada gráfico nuevo debe tener una utilidad concreta.

Analiza especialmente si sería útil mostrar información como:

-   evolución de vulnerabilidades a lo largo del tiempo;
-   vulnerabilidades nuevas vs. resueltas;
-   distribución por severidad;
-   vulnerabilidades por activo;
-   activos con mayor nivel de riesgo;
-   vulnerabilidades por software;
-   tendencia de vulnerabilidades críticas;
-   evolución entre escaneos;
-   distribución según estado;
-   vulnerabilidades más recurrentes;
-   tiempo promedio hasta resolución;
-   cambios detectados entre escaneos;
-   vulnerabilidades detectadas durante los últimos días;
-   relación entre activos y cantidad de vulnerabilidades.

Estos son únicamente ejemplos.

Primero verifica qué datos existen realmente en el sistema y cuáles
pueden obtenerse de manera confiable.

No inventes información ni agregues gráficos que requieran datos
inexistentes.

## 6. Seleccionar correctamente el tipo de gráfico

Para cada gráfico existente o propuesto, analiza si el tipo de
visualización es el adecuado.

Considera:

-   line charts para evolución temporal;
-   bar charts para comparaciones;
-   stacked bars cuando sea importante comparar composición;
-   donut/pie únicamente cuando realmente ayuden a representar
    proporciones simples;
-   tablas cuando sea más importante mostrar datos concretos;
-   indicadores numéricos cuando un gráfico no aporte valor adicional.

Evita dashboards saturados de gráficos circulares o visualizaciones
decorativas.

## 7. Mejorar el diseño visual

Quiero que el Dashboard tenga una apariencia moderna de producto SaaS
profesional de ciberseguridad.

Revisa especialmente:

-   jerarquía visual;
-   composición;
-   grid;
-   tamaños de las cards;
-   bordes;
-   sombras;
-   radios;
-   espaciados;
-   separación entre secciones;
-   densidad de información;
-   tipografía;
-   tamaños de títulos;
-   subtítulos;
-   etiquetas;
-   iconos;
-   estados hover;
-   tooltips;
-   responsive;
-   comportamiento en pantallas grandes;
-   comportamiento en notebook;
-   comportamiento en mobile.

El diseño debe sentirse:

-   moderno;
-   limpio;
-   tecnológico;
-   profesional;
-   sobrio;
-   fácil de interpretar;
-   consistente.

Evita:

-   exceso de efectos;
-   gradientes innecesarios;
-   cards dentro de cards sin necesidad;
-   colores demasiado saturados;
-   demasiadas sombras;
-   exceso de información;
-   decoración sin utilidad;
-   apariencia de template genérico generado por IA.

## 8. Mantener la identidad visual del proyecto

No reemplaces arbitrariamente:

-   colores principales;
-   tipografías;
-   componentes;
-   iconografía;
-   sistema de diseño;
-   librerías existentes.

Primero identifica qué sistema visual utiliza actualmente el proyecto.

Reutiliza los componentes existentes siempre que tenga sentido.

Si detectas inconsistencias en el sistema visual, proponlas como mejora.

## 9. Mejorar la interpretación de severidades

Analiza especialmente cómo se representan:

-   Critical;
-   High;
-   Medium;
-   Low;
-   Informational, si existe.

La severidad debe identificarse rápidamente sin convertir toda la
pantalla en colores fuertes.

Usa el color como indicador semántico, no como decoración.

## 10. Revisar estados especiales

Verifica cómo se comporta el Dashboard cuando:

-   no existen vulnerabilidades;
-   no existen activos;
-   todavía no se realizó ningún escaneo;
-   un escaneo está ejecutándose;
-   falla la carga de datos;
-   existen miles de vulnerabilidades;
-   existen muchos activos;
-   existen datos incompletos.

Diseña estados vacíos y estados de carga profesionales si actualmente no
existen.

## 11. Revisar interacciones

Analiza si las cards, gráficos o indicadores deberían permitir:

-   abrir detalles;
-   aplicar filtros;
-   navegar hacia vulnerabilidades;
-   navegar hacia activos;
-   visualizar un escaneo;
-   consultar información relacionada.

El Dashboard no debe ser solamente una pantalla informativa.

Debe ayudar al usuario a llegar rápidamente a la información que
necesita.

## 12. Revisar posibles filtros

Determina si tendría sentido incorporar filtros globales como:

-   rango temporal;
-   entorno;
-   activo;
-   severidad;
-   estado.

No agregues filtros si no aportan valor real.

## 13. Revisar responsive design

Evalúa específicamente:

### Desktop grande

Evitar que las cards queden demasiado extendidas o con espacios vacíos
innecesarios.

### Notebook

Debe seguir siendo cómodo y legible.

### Tablet

Los componentes deben reorganizarse correctamente.

### Mobile

Las métricas y gráficos deben seguir siendo comprensibles sin generar
scroll horizontal innecesario.

## 14. Realizar primero un informe

**ANTES DE MODIFICAR CÓDIGO**, genera un informe dividido en:

### Problemas detectados

Lista concreta de problemas encontrados.

### Elementos que funcionan correctamente

Qué partes deberían mantenerse.

### Elementos que deberían reorganizarse

Explica por qué.

### Elementos que deberían eliminarse

Solo si realmente existen elementos innecesarios.

### Nuevos elementos recomendados

Incluye métricas, gráficos o componentes únicamente cuando tengan
utilidad real.

### Nueva estructura propuesta

Describe el Dashboard de arriba hacia abajo.

### Justificación UX

Explica brevemente por qué esta estructura sería mejor.

## 15. Clasificar las mejoras

Clasifica las mejoras propuestas como:

-   **Alta prioridad**
-   **Media prioridad**
-   **Baja prioridad**

Prioriza cambios que mejoren realmente:

-   comprensión;
-   rapidez de lectura;
-   capacidad de detectar problemas;
-   navegación;
-   experiencia de usuario.

## 16. Implementación

Una vez finalizado el análisis, implementa la solución propuesta.

Durante la implementación:

-   mantén la lógica de negocio existente;
-   no modifiques endpoints innecesariamente;
-   no rompas contratos existentes;
-   no cambies modelos de datos sin necesidad;
-   reutiliza componentes;
-   respeta la arquitectura del proyecto;
-   evita duplicación;
-   mantén el código limpio;
-   crea componentes reutilizables cuando tenga sentido.

Si para implementar una mejora visual necesitas información que
actualmente no proporciona el backend, primero identifica claramente esa
limitación.

No inventes datos en frontend para simular funcionalidad real.

## 17. Validación final

Después de implementar:

-   revisa visualmente todo el Dashboard;
-   verifica alineaciones;
-   verifica responsive;
-   revisa textos;
-   revisa gráficos;
-   revisa tooltips;
-   revisa estados vacíos;
-   revisa loading;
-   revisa errores;
-   verifica que ninguna funcionalidad anterior se haya roto.

Si el proyecto permite ejecutar frontend localmente, utiliza las
herramientas disponibles para inspeccionar el resultado real.

## 18. Resultado esperado

El resultado debe parecer un **Dashboard moderno de una plataforma SaaS
profesional de ciberseguridad**, pero sin perder la identidad de GEF
Secure.

La prioridad no es llenar la pantalla de información.

La prioridad es que el usuario pueda responder rápidamente:

1.  ¿Cuál es mi estado de seguridad?
2.  ¿Qué problemas son prioritarios?
3.  ¿Dónde están concentrados los riesgos?
4.  ¿La situación está mejorando o empeorando?
5.  ¿Qué cambió recientemente?
6.  ¿Dónde debo entrar para investigar o actuar?

**Primero analiza.**

**Después propone.**

**Finalmente implementa.**

No comiences realizando cambios visuales arbitrarios sin comprender
completamente la sección Dashboard y los datos disponibles.
