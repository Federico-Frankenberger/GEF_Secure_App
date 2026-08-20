# Caja Negra y Caja Blanca en Ciberseguridad

## Introducción

En ciberseguridad, los conceptos de **caja negra (Black Box)** y **caja
blanca (White Box)** describen principalmente cuánta información tiene
el analista de seguridad sobre el sistema que está evaluando.

También existe un enfoque intermedio denominado **caja gris (Gray
Box)**.

------------------------------------------------------------------------

## 1. Caja Negra (Black Box)

En una evaluación de **caja negra**, el analista tiene poco o ningún
conocimiento previo sobre el funcionamiento interno del sistema.

El objetivo es aproximarse a la perspectiva de un atacante externo que
intenta descubrir qué recursos y servicios se encuentran expuestos.

### Información disponible

Por ejemplo, el analista podría recibir únicamente:

-   Una dirección IP.
-   Un dominio.
-   Una URL.
-   Un rango de direcciones IP autorizado para el análisis.

Normalmente no dispone de:

-   Código fuente.
-   Credenciales internas.
-   Arquitectura del sistema.
-   Configuración de servidores.
-   Información de la base de datos.
-   Inventario interno de software.

### Proceso conceptual

``` text
Internet
   |
   v
[ Aplicación / Servidor ]
   ^
   |
Analista
(sin información interna)
```

El análisis puede comenzar identificando qué existe y qué está expuesto
dentro del alcance autorizado:

1.  Reconocimiento del objetivo.
2.  Identificación de hosts.
3.  Descubrimiento de puertos.
4.  Identificación de servicios.
5.  Detección de tecnologías y versiones.
6.  Identificación de posibles vulnerabilidades.
7.  Evaluación de los resultados.

### Ventajas

-   Se aproxima a la perspectiva de un atacante externo.
-   Permite conocer qué información puede descubrirse públicamente.
-   Ayuda a detectar servicios innecesariamente expuestos.
-   Permite evaluar la superficie de ataque externa.

### Desventajas

-   Tiene menor visibilidad sobre el funcionamiento interno.
-   Puede no detectar vulnerabilidades presentes en código o
    configuraciones internas.
-   Determinados problemas pueden ser difíciles de identificar
    únicamente desde el exterior.

------------------------------------------------------------------------

## 2. Caja Blanca (White Box)

En una evaluación de **caja blanca**, el analista dispone de información
amplia sobre el sistema.

Puede conocer su arquitectura, código, configuraciones, dependencias e
infraestructura.

### Información disponible

Dependiendo del alcance, puede incluir:

-   Código fuente.
-   Arquitectura.
-   Credenciales de prueba.
-   Configuración de servidores.
-   Dependencias.
-   Base de datos.
-   Infraestructura.
-   Documentación técnica.
-   Archivos de configuración.

### Ejemplo conceptual

``` text
Proyecto
|
+-- backend/
|   +-- controllers/
|   +-- services/
|   +-- repositories/
|
+-- frontend/
+-- pom.xml
+-- Dockerfile
+-- docker-compose.yml
        |
        v
  Analisis de seguridad
```

Con esta información es posible analizar, entre otras cosas:

-   Vulnerabilidades en dependencias.
-   Errores de autenticación.
-   Errores de autorización.
-   Secretos o credenciales expuestas.
-   Configuraciones inseguras.
-   Problemas en el código.
-   Dependencias desactualizadas.
-   Riesgos asociados con la arquitectura.
-   Configuraciones de infraestructura.

### Ventajas

-   Proporciona mayor cobertura.
-   Facilita la identificación de problemas internos.
-   Permite analizar código y configuraciones.
-   Es especialmente útil durante el desarrollo seguro de software.

### Desventajas

-   No representa exactamente la perspectiva inicial de un atacante
    externo.
-   Requiere acceso a información sensible del sistema.
-   Puede requerir mayor conocimiento técnico de la arquitectura y
    tecnologías utilizadas.

------------------------------------------------------------------------

## 3. Caja Gris (Gray Box)

La **caja gris** representa un enfoque intermedio.

El analista tiene cierta información sobre el sistema, pero no acceso
completo.

Por ejemplo, podría disponer de:

-   Una cuenta de usuario estándar.
-   Documentación parcial.
-   Información básica sobre la arquitectura.
-   Acceso limitado a determinados componentes.

### Comparación

  Modalidad   Información disponible   Ejemplo
  ----------- ------------------------ -----------------------------------------
  Black Box   Mínima                   IP, dominio o URL
  Gray Box    Parcial                  IP + usuario de prueba
  White Box   Amplia                   Código + arquitectura + configuraciones

De manera conceptual:

``` text
             Informacion disponible

Caja Negra        Caja Gris        Caja Blanca
    |                 |                 |
    v                 v                 v
  Minima            Parcial            Amplia
```

------------------------------------------------------------------------

## 4. Aplicación en un sistema de análisis de vulnerabilidades

Estos conceptos también pueden utilizarse para diferenciar estrategias
de análisis dentro de una plataforma de gestión de vulnerabilidades.

### Escaneo externo: aproximación Black Box

Un sistema puede analizar un activo desde el exterior:

``` text
Host
 |
 v
Descubrimiento de puertos
 |
 v
Servicios
 |
 v
Versiones
 |
 v
Vulnerabilidades conocidas
```

Esto permite determinar principalmente **qué está expuesto**.

Por ejemplo:

``` text
Host: servidor-01

Puerto 22
└── OpenSSH

Puerto 80
└── Nginx

Puerto 443
└── Nginx
```

Posteriormente, las versiones detectadas pueden correlacionarse con
fuentes de vulnerabilidades conocidas.

### Agente interno: aproximación White Box

Otra posibilidad es instalar un **agente dentro del host**.

Este agente podría recopilar información como:

``` text
Host
|
+-- Sistema operativo
+-- Software instalado
+-- Paquetes
+-- Dependencias
+-- Versiones
+-- Contenedores
+-- Librerias
```

Esto proporciona mucha más visibilidad sobre lo que realmente existe
dentro del activo.

Por ejemplo:

``` text
Servidor Ubuntu
|
+-- nginx 1.x
+-- openssl 3.x
+-- docker
+-- python
+-- postgresql
+-- librerias del proyecto
```

Con esa información, el sistema puede realizar una correlación más
precisa contra bases de datos de vulnerabilidades.

------------------------------------------------------------------------

## 5. Combinación de Black Box y White Box

Una plataforma de análisis de vulnerabilidades puede utilizar ambos
enfoques.

``` text
                 ACTIVO
                /      \
               /        \
      Escaneo externo   Agente
        Black Box      White Box
             |             |
             +------|------+
                    v
          Correlacion de datos
                    |
                    v
          Vulnerabilidades
                    |
                    v
           Evaluacion de riesgo
                    |
                    v
             Notificaciones
```

El escaneo externo permite responder:

> ¿Qué servicios y tecnologías están expuestos?

Mientras que el agente permite responder:

> ¿Qué software, paquetes y dependencias existen realmente dentro del
> host?

La combinación proporciona una visión más completa de la superficie de
ataque.

------------------------------------------------------------------------

## 6. Diferencia principal

La diferencia fundamental puede resumirse de la siguiente manera:

**Black Box → observa el sistema principalmente desde afuera.**

**White Box → analiza el sistema teniendo conocimiento y visibilidad
interna.**

**Gray Box → utiliza información y accesos parciales.**

En una plataforma de gestión de vulnerabilidades, combinar información
externa e interna puede mejorar la identificación, correlación y
priorización de vulnerabilidades.
