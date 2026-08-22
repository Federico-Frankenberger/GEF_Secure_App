# Prompt --- Automatización completa del despliegue de n8n para el MVP

Actuá como un **Arquitecto de Software Senior, DevOps Engineer y
especialista en n8n, Docker y automatización de infraestructura**.

Antes de realizar cualquier propuesta, **analizá exhaustivamente tanto
el proyecto completo como el archivo
`GEF_Secure_Analisis_Estrategico_MVP.md`**.

El objetivo es que primero comprendas el estado actual de la
implementación, la arquitectura existente, las tecnologías utilizadas y
la forma en que interactúan los distintos componentes. Luego, compará
ese estado con lo definido en el documento para generar una propuesta de
implementación consistente con el proyecto.

No supongas información que no exista. Si detectás diferencias entre el
proyecto y el documento, documentalas y justificá las decisiones que
propongas.

Una vez finalizado el análisis, generá un **documento técnico
profesional en formato PDF** cuyo objetivo sea dejar **n8n completamente
integrado al proyecto**, funcionando como un servicio interno de la
aplicación y **sin requerir ninguna configuración manual** luego del
despliegue.

## Objetivo principal

Quiero que, al ejecutar únicamente:

``` bash
docker compose up -d
```

todo el ecosistema quede completamente operativo.

Esto incluye:

-   Backend.
-   Frontend.
-   Base de datos.
-   n8n.
-   Todos los servicios auxiliares necesarios.

El desarrollador **no debe ingresar a la interfaz de n8n para configurar
absolutamente nada**.

Todo debe quedar inicializado automáticamente.

------------------------------------------------------------------------

# Metodología obligatoria

Seguí estrictamente este orden:

1.  Analizar completamente el proyecto.
2.  Analizar el archivo `GEF_Secure_Analisis_Estrategico_MVP.md`.
3.  Comparar el proyecto con el documento.
4.  Detectar diferencias, faltantes y mejoras.
5.  Definir la arquitectura recomendada para la integración de n8n.
6.  Elaborar el documento técnico en formato PDF.

No avances al siguiente punto sin haber completado el anterior.

------------------------------------------------------------------------

# Analizá y documentá

Necesito que determines exactamente qué debe hacerse para que n8n quede
completamente funcional desde el primer inicio.

El documento debe explicar cómo automatizar completamente la
infraestructura.

## 1. Inicialización automática

Determinar cómo automatizar:

-   Creación automática del usuario administrador.
-   Configuración inicial de n8n.
-   Generación y persistencia de la Encryption Key.
-   Timezone.
-   URL pública.
-   Webhook URL.
-   Configuración del owner.
-   Configuración general del servicio.

Todo debe quedar listo automáticamente al iniciar Docker.

## 2. Workflows

Analizar cuál es la mejor estrategia para que:

-   Los workflows existan desde el primer inicio.
-   Se importen automáticamente.
-   Queden activos automáticamente.
-   Se actualicen cuando cambien en el repositorio.
-   Puedan versionarse con Git.
-   No requieran importaciones manuales.

Si existe una estrategia mejor que importar archivos JSON manualmente,
proponerla y justificarla.

## 3. Credenciales

Determinar cómo evitar tener que crear manualmente las credenciales de
n8n.

Analizar cuál es la mejor estrategia entre:

-   Variables de entorno.
-   Scripts de bootstrap.
-   API REST de n8n.
-   Provisioning.
-   Base de datos inicial.
-   Export/Import.
-   Seed automático.
-   Cualquier otra alternativa recomendada.

Explicar cuál es la solución más profesional y por qué.

## 4. Docker

Analizar qué modificaciones deben realizarse en:

-   docker-compose.yml
-   Dockerfile
-   Entrypoints
-   Scripts de inicialización
-   Volúmenes
-   Redes
-   Healthchecks
-   Depends_on
-   Restart Policies

para garantizar que toda la infraestructura quede completamente
operativa desde el primer inicio.

## 5. Backend

Determinar cómo debe integrarse el backend con n8n.

Explicar:

-   URLs internas.
-   Endpoints recomendados.
-   Autenticación.
-   Manejo de errores.
-   Reintentos.
-   Timeouts.
-   Health Checks.
-   Buenas prácticas de integración.

## 6. Frontend

Determinar cómo debe interactuar el frontend con los procesos ejecutados
por n8n sin depender de la interfaz web de n8n.

Explicar:

-   Flujo recomendado.
-   Endpoints.
-   Seguimiento del estado de las ejecuciones.
-   Polling o WebSockets, según corresponda.
-   Buenas prácticas para desacoplar el frontend de n8n.

## 7. Variables de entorno

Generar un archivo **`.env.example`** completo con todas las variables
necesarias para que el sistema funcione correctamente.

Para cada variable indicar:

-   Nombre.
-   Descripción.
-   Valor de ejemplo.
-   Si es obligatoria.
-   Consideraciones de seguridad.

## 8. Procedimiento completo de despliegue

Documentar paso a paso cómo debe ejecutarse el proyecto desde cero.

El flujo ideal debe ser únicamente:

``` bash
git clone ...
cp .env.example .env
docker compose up -d
```

Y a partir de ese momento debe quedar automáticamente disponible:

-   La base de datos.
-   El backend.
-   El frontend.
-   n8n completamente configurado.
-   Los workflows importados.
-   Los workflows activos.
-   Todas las credenciales necesarias.
-   Toda la comunicación entre servicios funcionando correctamente.

No debe ser necesario ingresar a la interfaz de n8n para realizar
ninguna configuración manual.

## 9. Validación del despliegue

Crear un checklist completo para verificar que:

-   Todos los contenedores iniciaron correctamente.
-   La base de datos está disponible.
-   n8n responde correctamente.
-   Los workflows fueron cargados.
-   Los workflows están activos.
-   El backend puede ejecutar workflows.
-   El frontend puede utilizar toda la funcionalidad del sistema.
-   Todas las integraciones funcionan correctamente.

## 10. Resolución de problemas

Incluir una sección de troubleshooting con:

-   Problemas frecuentes.
-   Posibles causas.
-   Soluciones.
-   Comandos de diagnóstico.
-   Revisión de logs.
-   Verificaciones recomendadas.

## 11. Mejoras recomendadas

Si durante el análisis detectás oportunidades para mejorar la
arquitectura, proponelas y justificá cada una.

Evaluá especialmente:

-   Automatización del despliegue.
-   Escalabilidad.
-   Seguridad.
-   Mantenibilidad.
-   Versionado de workflows.
-   Integración entre backend y n8n.
-   Organización general del proyecto.

Priorizá siempre soluciones utilizadas en entornos profesionales,
reproducibles y fáciles de mantener.

# Formato del resultado

El resultado debe entregarse como un **documento técnico profesional en
formato PDF**, con calidad suficiente para formar parte de la
documentación oficial del proyecto.

Debe incluir:

-   Portada.
-   Índice automático.
-   Secciones jerárquicas.
-   Diagramas cuando aporten valor.
-   Tablas.
-   Ejemplos de configuración.
-   Fragmentos de código.
-   Checklists.
-   Recomendaciones.
-   Buenas prácticas.
-   Conclusiones finales.

El objetivo es obtener una guía completa que permita a cualquier
desarrollador clonar el repositorio, ejecutar `docker compose up -d` y
disponer de un entorno totalmente funcional, sin realizar
configuraciones manuales dentro de n8n.
