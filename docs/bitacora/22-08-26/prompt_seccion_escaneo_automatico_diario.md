# Prompt: Crear una sección específica para el Escaneo Automático Diario

Quiero que analices el proyecto actual antes de realizar cualquier
modificación.

El sistema cuenta actualmente con un **escaneo automático diario
programado para ejecutarse a las 09:00 hs mediante n8n**.

n8n ejecuta el flujo correspondiente y posteriormente se envía mediante
un bot un **mensaje a Slack con información básica sobre el resultado
del escaneo**.

Ese mensaje contiene además un **enlace hacia la aplicación**,
permitiendo que el usuario acceda al sistema para consultar información
más detallada.

Actualmente, una vez dentro de la aplicación, el escaneo puede
consultarse desde el **Historial de Escaneos**.

Quiero mejorar específicamente esta experiencia.

> IMPORTANTE: todos los nombres, textos, rutas, botones, estados,
> estructuras y ejemplos incluidos en este prompt son únicamente
> **ejemplos conceptuales** cuando no coincidan exactamente con la
> implementación actual. Antes de realizar cambios, verificá siempre
> cómo funciona realmente el proyecto y respetá sus nombres,
> convenciones, arquitectura y comportamiento existentes.

------------------------------------------------------------------------

# 1. Contexto del flujo actual

Conceptualmente, el flujo actual es similar a:

``` text
09:00
  ↓
n8n
  ↓
Ejecución del escaneo automático
  ↓
Procesamiento y almacenamiento del resultado
  ↓
Generación/envío de información resumida
  ↓
Bot de Slack
  ↓
Usuario recibe la notificación
  ↓
Enlace hacia la aplicación
  ↓
Usuario accede al sistema
```

Este flujo es solamente una representación conceptual.

Analizá el proyecto y los workflows existentes para determinar cómo
funciona realmente.

------------------------------------------------------------------------

# 2. Problema actual

Actualmente el escaneo automático queda registrado y puede consultarse
dentro del:

**Historial de Escaneos**

El historial es correcto y necesario desde el punto de vista de:

-   trazabilidad;
-   auditoría;
-   consulta de ejecuciones anteriores;
-   seguimiento histórico.

Sin embargo, considero que el **escaneo automático diario tiene
suficiente importancia dentro del producto como para contar con una
sección específica**.

Esto es especialmente relevante porque la notificación enviada mediante
Slack funciona como uno de los principales puntos de entrada del usuario
hacia la aplicación.

El usuario recibe información resumida mediante Slack y accede
posteriormente al sistema para consultar el resultado con mayor
profundidad.

Actualmente esa información detallada queda principalmente dentro del
historial.

Quiero mejorar este flujo.

------------------------------------------------------------------------

# 3. Objetivo

Quiero crear una sección específica dentro de la aplicación destinada
al:

**Escaneo Automático**

El nombre anterior es solamente un ejemplo.

Si según las convenciones actuales del proyecto corresponde utilizar
otro nombre, analizalo y utilizá el más coherente.

El objetivo de esta sección es permitir visualizar de manera clara y
detallada el **último escaneo automático diario ejecutado mediante el
flujo de n8n**.

No quiero crear un segundo historial.

Quiero diferenciar:

``` text
Escaneo Automático
        ↓
Estado y resultado del proceso automático actual

Historial de Escaneos
        ↓
Trazabilidad de todas las ejecuciones
```

------------------------------------------------------------------------

# 4. Analizar primero la implementación existente

Antes de escribir código, analizá cómo funciona actualmente todo este
flujo.

Identificá:

-   dónde se encuentra el workflow de n8n;
-   cómo se programa la ejecución diaria;
-   cómo n8n inicia el escaneo;
-   qué endpoint o mecanismo utiliza;
-   cómo participa el backend;
-   cómo se genera el registro del escaneo;
-   cómo se almacenan sus resultados;
-   cómo queda asociado a los activos;
-   cómo se registran las vulnerabilidades encontradas;
-   cómo se identifica cada ejecución;
-   cómo aparece posteriormente dentro del historial;
-   cómo se genera el mensaje enviado a Slack;
-   qué información contiene actualmente;
-   cómo funciona el bot;
-   qué enlace contiene actualmente el mensaje;
-   a qué parte de la aplicación dirige;
-   si el enlace permite identificar de alguna manera el escaneo
    correspondiente.

No supongas ninguna implementación.

Verificá el código, configuración y workflows reales.

------------------------------------------------------------------------

# 5. Nueva sección de Escaneo Automático

La nueva sección debe funcionar como una **vista operativa del escaneo
automático diario**.

Cuando el usuario ingrese debería poder comprender rápidamente:

-   cuándo se ejecutó;
-   si terminó correctamente;
-   qué se analizó;
-   qué vulnerabilidades se encontraron;
-   cuáles representan novedades;
-   qué activos están afectados;
-   cuál fue el resultado general del escaneo.

La información exacta dependerá de los datos que actualmente tenga
disponibles el sistema.

------------------------------------------------------------------------

# 6. Información del escaneo

Como referencia conceptual, la sección podría mostrar información
similar a:

``` text
Último escaneo automático

Fecha: XX/XX/XXXX
Hora: 09:00
Estado: Completado
Duración: XX minutos
ID: XXXXX
```

Estos textos y campos son solamente ejemplos.

Utilizá los estados, nombres y datos que realmente existan en el
proyecto.

No agregues datos ficticios solamente para completar la interfaz.

------------------------------------------------------------------------

# 7. Resumen del resultado

Podría existir un resumen visual similar a:

``` text
Activos analizados              XX
Vulnerabilidades detectadas     XX
Vulnerabilidades nuevas         XX
Críticas                        XX
Altas                           XX
Medias                          XX
Bajas                           XX
```

Esto es solamente un ejemplo de presentación.

Analizá qué métricas pueden obtenerse realmente con la arquitectura y
modelo de datos actuales.

Mostrá únicamente información útil y disponible.

------------------------------------------------------------------------

# 8. Vulnerabilidades encontradas

La sección debería permitir visualizar las vulnerabilidades asociadas al
último escaneo automático.

Por ejemplo, conceptualmente podría existir una tabla similar a:

  Vulnerabilidad   Severidad   Activo    Estado
  ---------------- ----------- --------- -----------
  CVE-XXXX         Crítica     Ejemplo   Nueva
  CVE-YYYY         Alta        Ejemplo   Detectada

La estructura anterior es solamente un ejemplo.

Reutilizá las tablas, componentes y estructuras que ya utilice
actualmente el sistema para representar vulnerabilidades.

No dupliques componentes si ya existen soluciones reutilizables.

------------------------------------------------------------------------

# 9. Vulnerabilidades nuevas

Quiero que tenga especial relevancia la posibilidad de comprender:

**¿Qué vulnerabilidades nuevas aparecieron en este escaneo?**

Analizá cómo determina actualmente el sistema qué vulnerabilidad
representa una nueva detección.

Si esta información ya existe, reutilizala.

No desarrolles una nueva lógica paralela si el sistema ya resuelve este
problema.

------------------------------------------------------------------------

# 10. Slack como punto de entrada

Slack debe entenderse como una **notificación resumida que lleva al
usuario hacia la aplicación**.

No quiero modificar innecesariamente este concepto.

El flujo esperado es conceptualmente:

``` text
Escaneo automático
        ↓
Resultado
        ↓
Mensaje resumido en Slack
        ↓
Enlace incluido en la notificación
        ↓
Aplicación
        ↓
Consulta detallada del escaneo
```

El texto exacto del mensaje de Slack debe obtenerse del
workflow/configuración actual.

No asumas que existen textos específicos como:

-   "Ver escaneo completo";
-   "Ver detalles";
-   "Revisar vulnerabilidades";
-   u otros textos similares.

Si aparecen ejemplos de este tipo durante el análisis, deben
considerarse únicamente ejemplos conceptuales.

Respetá el mensaje real existente salvo que sea estrictamente necesario
modificar algo para implementar esta funcionalidad.

------------------------------------------------------------------------

# 11. Mejorar la continuidad Slack → Aplicación

Este es uno de los objetivos principales.

Actualmente el usuario recibe la notificación mediante Slack y dispone
de un enlace hacia la aplicación.

Quiero analizar si ese acceso puede llevar al usuario de manera natural
hacia la nueva sección de Escaneo Automático.

Conceptualmente quiero evitar una experiencia como:

``` text
Slack
  ↓
Aplicación
  ↓
Historial
  ↓
Buscar el escaneo
  ↓
Abrir el resultado
```

Y acercarnos a una experiencia similar a:

``` text
Slack
  ↓
Enlace incluido actualmente en la notificación
  ↓
Aplicación
  ↓
Escaneo Automático
  ↓
Información detallada
```

Estos flujos son solamente representaciones conceptuales.

Primero verificá cómo funciona actualmente el enlace enviado mediante
Slack.

------------------------------------------------------------------------

# 12. Identificación del escaneo

Analizá si actualmente cada ejecución cuenta con un identificador que
permita acceder específicamente a ella.

Si la arquitectura actual lo permite, evaluá si el enlace utilizado
desde Slack puede conducir al escaneo correspondiente.

Una ruta conceptual podría ser similar a:

``` text
/scans/{scanId}
```

o:

``` text
/automatic-scan/{scanId}
```

Estas rutas son exclusivamente ejemplos.

**No implementes literalmente ninguna de estas rutas sin revisar primero
el routing actual del proyecto.**

Si ya existe una ruta adecuada, reutilizala.

------------------------------------------------------------------------

# 13. Relación con el Historial de Escaneos

El historial debe continuar funcionando.

No quiero eliminarlo ni reemplazarlo.

Conceptualmente:

``` text
Escaneo Automático
        │
        └── Vista especializada del proceso automático

Historial de Escaneos
        │
        ├── Escaneo actual
        ├── Escaneo anterior
        ├── Escaneo anterior
        └── ...
```

El mismo escaneo automático debe continuar apareciendo dentro del
historial.

La nueva sección simplemente proporciona otra forma de visualizarlo
según su importancia dentro del flujo del producto.

------------------------------------------------------------------------

# 14. Una única fuente de verdad

No quiero que la nueva sección genere un registro independiente del
escaneo.

Debe reutilizar el mismo registro y los mismos resultados que
actualmente utiliza el historial.

Evitar:

-   duplicación de entidades;
-   duplicación de registros;
-   duplicación de resultados;
-   duplicación de vulnerabilidades;
-   duplicación de lógica;
-   duplicación de consultas innecesarias;
-   estados inconsistentes.

Conceptualmente:

``` text
              MISMO ESCANEO
                    │
           ┌────────┴────────┐
           ↓                 ↓
Escaneo Automático      Historial
     (vista)             (trazabilidad)
```

------------------------------------------------------------------------

# 15. Reutilizar la arquitectura existente

Antes de crear nuevos elementos, verificá si pueden reutilizarse:

-   endpoints;
-   servicios;
-   repositories;
-   DTOs;
-   modelos;
-   queries;
-   componentes React/frontend;
-   tablas;
-   cards;
-   badges;
-   layouts;
-   componentes de vulnerabilidades;
-   componentes del historial.

Creá nuevos componentes o endpoints únicamente cuando realmente sean
necesarios.

------------------------------------------------------------------------

# 16. Integración UX/UI

La nueva sección debe sentirse como una parte natural del producto.

Respetá completamente:

-   navegación actual;
-   sidebar;
-   layout;
-   tipografía;
-   colores;
-   cards;
-   tablas;
-   badges;
-   espaciados;
-   responsive design;
-   patrones UX/UI existentes.

No quiero una pantalla visualmente independiente del resto de la
aplicación.

------------------------------------------------------------------------

# 17. Estados del escaneo

La interfaz debe representar correctamente los estados que realmente
maneje el sistema.

Por ejemplo, podrían existir estados conceptuales como:

``` text
Completado
En ejecución
Fallido
```

Pero estos nombres son únicamente ejemplos.

Primero verificá qué estados existen realmente en el backend/modelo
actual y utilizá esos estados.

No agregues nuevos estados sin necesidad.

------------------------------------------------------------------------

# 18. Navegación

Analizá dónde debería ubicarse esta nueva sección dentro de la
navegación existente.

Una estructura conceptual podría ser:

``` text
Dashboard
Activos
Vulnerabilidades
Escaneo Automático
Historial
...
```

Esto es solamente un ejemplo.

No reorganices toda la navegación.

Integrá la nueva sección donde tenga mayor sentido dentro de la
estructura actual.

------------------------------------------------------------------------

# 19. Dashboard

Si el Dashboard actual lo permite y resulta coherente con su diseño,
evaluá agregar un pequeño acceso o resumen del último escaneo
automático.

Por ejemplo:

``` text
Último escaneo automático

Estado: Completado
Hora: 09:00
Vulnerabilidades detectadas: XX

[Acceso al detalle]
```

Todo lo anterior es solamente un ejemplo conceptual.

No agregues este componente si genera redundancia o no encaja con la
arquitectura actual.

------------------------------------------------------------------------

# 20. Alcance estricto

Mantené esta tarea acotada.

El objetivo es:

> Crear una sección específica dentro de la aplicación para visualizar
> en profundidad el escaneo automático diario ejecutado mediante n8n,
> mejorando especialmente la continuidad entre la notificación recibida
> en Slack y la consulta detallada dentro de la aplicación.

No quiero:

-   rediseñar el sistema completo;
-   modificar los escaneos manuales;
-   eliminar el historial;
-   crear otro historial;
-   rediseñar n8n;
-   rediseñar completamente las notificaciones de Slack;
-   agregar funcionalidades que no estén relacionadas con este objetivo;
-   realizar refactors generales innecesarios.

Realizá únicamente los cambios necesarios para implementar correctamente
esta mejora.

------------------------------------------------------------------------

# 21. Metodología

Trabajá en este orden:

## Fase 1 --- Análisis

Analizá el flujo actual real:

``` text
n8n → escaneo → persistencia → Slack → enlace → aplicación
```

## Fase 2 --- Diagnóstico

Explicá cómo funciona actualmente y qué cambios mínimos son necesarios.

## Fase 3 --- Propuesta

Definí cómo debería funcionar la nueva sección y cómo debería integrarse
con el flujo existente.

## Fase 4 --- Implementación

Implementá los cambios respetando la arquitectura existente y
reutilizando todo lo posible.

## Fase 5 --- Validación

Comprobá que:

-   el escaneo automático continúa ejecutándose correctamente;
-   los resultados continúan almacenándose correctamente;
-   continúa apareciendo en el historial;
-   Slack continúa funcionando;
-   el enlace hacia la aplicación continúa funcionando;
-   la nueva sección obtiene información real del escaneo;
-   no existen datos duplicados;
-   no se afectaron los escaneos manuales;
-   no se introdujeron regresiones.

------------------------------------------------------------------------

# Resultado esperado

Conceptualmente, la experiencia final debería ser similar a:

``` text
09:00
  ↓
n8n ejecuta el escaneo automático
  ↓
El resultado se procesa y almacena
  ↓
Se envía mediante el bot información básica a Slack
  ↓
El usuario recibe la notificación
  ↓
Accede mediante el enlace incluido en el mensaje
  ↓
Ingresa a la aplicación
  ↓
Accede a la sección del Escaneo Automático
  ↓
Consulta el resultado en profundidad
```

El **Historial de Escaneos debe continuar existiendo como mecanismo de
trazabilidad histórica**.

La nueva sección debe darle visibilidad y relevancia al escaneo
automático diario sin duplicar información ni modificar innecesariamente
el resto del sistema.

**Recordatorio final:** cualquier texto, nombre de sección, ruta, botón,
estado, métrica o estructura presentada en este prompt que no coincida
explícitamente con el proyecto debe interpretarse únicamente como un
ejemplo. Analizá siempre la implementación real antes de tomar
decisiones.
