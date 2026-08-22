# Sistema de Tracking de Remediación de Vulnerabilidades — Documento Unificado

## Nota de consolidación

Este documento unifica tres fuentes de trabajo:

1. **`Tracking_Remediacion_Marco_de_Referencia_v3.docx`** — el documento más riguroso de los tres: define conceptualmente qué es un sistema de tracking, ancla cada afirmación fuerte a una fuente primaria verificada (NIST, CIS, CISA, PCI DSS, SSVC, EPSS, SANS), y advierte explícitamente sobre errores de vigencia normativa. Se usa como **columna vertebral estructural** del documento unificado.
2. **`Sistema_Tracking_Remediacion_Ciberseguridad.md`** — una descripción operativa del flujo de trabajo día a día (detección → análisis → asignación → remediación → verificación → cierre), con ejemplos concretos. Se integra como la **capa práctica** que muestra cómo se ve el modelo conceptual en un caso de uso real.
3. **`KPIs_Tracking_Remediacion_Industria.md`** — un catálogo de KPIs de uso común en la industria, con fórmulas y ejemplos. Se integra como la **capa de métricas de referencia rápida**, pero contrastada contra el análisis metodológico más profundo del marco de referencia (que señala trampas del denominador, ambigüedad del punto de anclaje temporal, y la diferencia entre métricas declarativas y verificadas).

**Regla de reconciliación aplicada:** donde el marco de referencia (fuente 1) contradice o matiza algo de las fuentes 2 y 3 —por ejemplo, plazos fijos por severidad vs. el modelo de cuatro variables de la BOD 26-04— se conserva el contenido de las fuentes 2 y 3 como *ejemplo ilustrativo de uso frecuente en la industria*, pero se marca explícitamente la discrepancia. Nada se descarta; se etiqueta.

Los tramos agregados que no provienen de ninguno de los tres documentos originales están marcados con **[Agregado]**.

---

## Índice

1. [Introducción y alcance](#1-introducción-y-alcance)
2. [Advertencia sobre vigencia normativa](#2-advertencia-sobre-vigencia-normativa)
3. [Definición y frontera conceptual](#3-definición-y-frontera-conceptual)
4. [La unidad del tracking](#4-la-unidad-del-tracking)
5. [Ciclo de vida completo](#5-ciclo-de-vida-completo)
6. [Flujo operativo paso a paso](#6-flujo-operativo-paso-a-paso)
7. [Los seis componentes del modelo](#7-los-seis-componentes-del-modelo)
8. [Estados, evidencia y transición](#8-estados-evidencia-y-transición)
9. [Plazos y criterio de priorización](#9-plazos-y-criterio-de-priorización)
10. [Verificación](#10-verificación)
11. [Recurrencia](#11-recurrencia)
12. [Auditoría](#12-auditoría)
13. [Métricas y KPIs](#13-métricas-y-kpis)
14. [Dashboards recomendados](#14-dashboards-recomendados)
15. [Madurez del programa](#15-madurez-del-programa)
16. [Modelo de datos de referencia](#16-modelo-de-datos-de-referencia)
17. [Roles, responsabilidades e integraciones [Agregado]](#17-roles-responsabilidades-e-integraciones-agregado)
18. [Evidencia de implementaciones reales](#18-evidencia-de-implementaciones-reales)
19. [Antipatrones](#19-antipatrones)
20. [Lista de verificación](#20-lista-de-verificación)
21. [Marco normativo y de plazos](#21-marco-normativo-y-de-plazos)
22. [Ámbito regional (Argentina)](#22-ámbito-regional-argentina)
23. [Glosario [Agregado]](#23-glosario-agregado)
24. [Cómo usar este documento](#24-cómo-usar-este-documento)
25. [Mapa de fuentes primarias](#25-mapa-de-fuentes-primarias)
26. [Referencias](#26-referencias)
27. [Anexo — Registro de contraste entre marcos (material interno, no citable)](#27-anexo--registro-de-contraste-entre-marcos-material-interno-no-citable)

---

## 1. Introducción y alcance

Los KPIs de remediación y los sistemas de tracking existen para responder una pregunta que un escáner de vulnerabilidades por sí solo no puede contestar: **¿la organización está corrigiendo lo que detecta, a tiempo, y de forma verificable?**

Son utilizados por equipos de Seguridad, SOC, DevSecOps, CISO, auditores y áreas de Compliance para evaluar el estado de seguridad de la organización, detectar cuellos de botella y demostrar cumplimiento de políticas y normativas como NIST, ISO 27001, CIS Controls y PCI DSS.

No existe una norma única que defina qué es un «sistema de tracking de remediación» ni un modelo de madurez obligatorio para esa capacidad. Lo que existe son estándares que regulan partes del problema (gestión de parches, controles de seguridad, plazos de corrección). Este documento sintetiza esas partes en un modelo único, y separa explícitamente:

- Lo que **puede afirmarse directamente**, con respaldo documental de una fuente primaria (NIST, CIS, CISA, PCI DSS).
- Lo que es una **síntesis técnica propia** derivada de esas fuentes (por ejemplo, los seis componentes del Capítulo 7, o la escala de madurez de verificación del Capítulo 10).
- Lo que es **práctica de industria de uso frecuente pero no normada** (los KPIs y ejemplos operativos de las fuentes 2 y 3 de este documento).

Mantener esa separación es lo que vuelve el documento defendible ante una auditoría, un tribunal académico, o simplemente ante un lector técnico exigente.

---

## 2. Advertencia sobre vigencia normativa

Buena parte de la bibliografía disponible sobre plazos de remediación —incluida bibliografía generada por otros sistemas de IA— cita como referencia vigente las directivas **BOD 19-02** y **BOD 22-01** de CISA. **Ambas fueron revocadas.**

El **10 de junio de 2026**, CISA emitió la **Binding Operational Directive 26-04** (*Prioritizing Security Updates Based on Risk*), que supersede y revoca expresamente la BOD 19-02 (2019) y la BOD 22-01 (2021). La nueva directiva abandona los plazos fijos derivados de severidad y los reemplaza por un modelo de **cuatro variables binarias** evaluadas por combinación vulnerabilidad-activo (ver [Sección 21](#21-marco-normativo-y-de-plazos)).

Este documento usa la **BOD 26-04** como referencia vigente y menciona las anteriores solo en carácter histórico. El cambio importa conceptualmente, no solo por vigencia: la 26-04 formaliza en una directiva la lógica que **SSVC** venía proponiendo desde 2019, y su esquema de plazos graduados es directamente trasladable al diseño de un campo de fecha límite calculado (ver [Sección 9](#9-plazos-y-criterio-de-priorización)).

> **Nota práctica derivada:** el ejemplo de plazos fijos por severidad citado habitualmente en la industria (críticas → 24 h, altas → 3 días, medias → 10 días, bajas → 30 días — ver [Sección 13.3](#133-tiempo-promedio-por-criticidad)) sigue siendo útil como punto de partida operativo simple, pero refleja el modelo *anterior* a la BOD 26-04. Un sistema diseñado desde cero en 2026 en adelante debería anclar sus plazos al modelo de cuatro variables, no solo a la severidad del CVE.

---

## 3. Definición y frontera conceptual

### 3.1 Definición

> El tracking de remediación es la capacidad de mantener la **identidad**, la **evolución temporal**, la **responsabilidad**, el **tratamiento** y la **evidencia de resolución** de una exposición vulnerable concreta sobre un activo, desde su identificación hasta su resolución, mitigación, aceptación de riesgo o cierre justificado, preservando la relación entre los eventos que permiten reconstruir su historia.

La definición contiene cinco elementos, y todos son necesarios:

| Elemento | Qué garantiza |
|---|---|
| **Identidad** | Saber qué vulnerabilidad y sobre qué activo se está siguiendo, de manera estable en el tiempo. |
| **Continuidad temporal** | Poder reconstruir cómo evolucionó el caso, no solo dónde terminó. |
| **Responsabilidad** | Saber quién o qué produjo cada transición. |
| **Tratamiento** | Distinguir entre remediar, mitigar, descartar y aceptar el riesgo. No son lo mismo. |
| **Evidencia** | Diferenciar una afirmación registrada por un operador de una observación independiente que la sustenta. |

En ciberseguridad, un sistema de tracking de remediación **no es simplemente una lista de vulnerabilidades**. Es un flujo de trabajo completo que garantiza que cada vulnerabilidad detectada sea gestionada hasta su resolución, con trazabilidad, responsables, evidencia y auditoría.

### 3.2 La frontera práctica: registro de estado vs. tracking

| | Ejemplo |
|---|---|
| **Registro de estado** | «CVE-XXXX está remediada.» |
| **Tracking** | «CVE-XXXX fue detectada en el activo A el día t1; fue asignada al responsable R en t2; se aplicó la actualización en t4; una evaluación posterior en t5 dejó de detectarla; el caso se cerró en t6; volvió a detectarse en t7 y fue reabierto.» |

La segunda representación responde preguntas históricas que la primera no puede contestar. Esa es toda la diferencia.

### 3.3 Qué no alcanza

| Capacidad | ¿Es tracking? | Por qué |
|---|---|---|
| Guardar una lista de CVE | No | Registra conocimiento sobre vulnerabilidades, no su tratamiento en el entorno propio. |
| Guardar el último estado | No, por sí solo | No permite reconstruir cómo se llegó a ese estado. |
| Ejecutar un escaneo periódico | No | Detecta. Detectar no es hacer seguimiento. |
| Crear un ticket por vulnerabilidad | No, por sí solo | Hay flujo de trabajo, pero puede no haber continuidad entre ticket, activo y evidencia. |
| Registrar «parche aplicado» a mano | Parcial | Es una declaración de tratamiento, no evidencia de resultado. |
| Comparar dos escaneos | Sí, en forma básica | Permite inferir persistencia o desaparición de un hallazgo. |
| Encadenar hallazgo, activo, acción y verificación | Sí | Existe continuidad del caso. |
| Reabrir cuando la vulnerabilidad vuelve | Sí, capacidad madura | Introduce continuidad posterior al cierre. |

### 3.4 El anclaje normativo de la definición

- **NIST SP 800-40 Rev. 4** define la gestión de parches empresarial como el proceso de identificar, priorizar, adquirir, instalar y **verificar** la instalación de parches, actualizaciones y mejoras a lo largo de la organización. La verificación está dentro del proceso, no es un agregado opcional.
- **CIS Control 7** define la gestión continua de vulnerabilidades en términos de evaluar y hacer seguimiento de vulnerabilidades en todos los activos, con el objetivo de remediarlas y minimizar la ventana de oportunidad para un atacante. El **Safeguard 7.2** exige establecer y mantener una estrategia de remediación basada en riesgo, documentada en un proceso, con revisiones mensuales o más frecuentes.
- **NIST SP 800-53, control SI-2** (Flaw Remediation) exige identificar, reportar y corregir fallos; probar las actualizaciones antes de instalarlas; e incorporar la remediación al proceso de gestión de configuración — es esa incorporación la que permite que las acciones de remediación sean rastreadas y verificadas.

---

## 4. La unidad del tracking

Un error conceptual frecuente, y de consecuencias grandes en el modelo de datos, es tratar la vulnerabilidad como una entidad única y global. Conviene distinguir cuatro cosas distintas:

| Entidad | Qué es | Ejemplo |
|---|---|---|
| **Vulnerabilidad** | El problema de seguridad identificado, con su identificador público. | CVE-XXXX existe y afecta al producto P en versiones menores a 2.4. |
| **Exposición** | La relación entre la vulnerabilidad y un contexto donde puede ser relevante. | CVE-XXXX afecta a la versión de P instalada en el activo A. |
| **Hallazgo** | La observación concreta que hizo una fuente de detección. | El escaneo del 3 de agosto observó en A la condición asociada a CVE-XXXX. |
| **Caso de remediación** | La unidad operativa que se sigue, con responsable, plazo, acciones y evidencia. | Resolver CVE-XXXX en el activo A. |

**Por qué importa:** un mismo CVE puede afectar a muchos activos, y cada relación vulnerabilidad-activo tiene su propia historia de remediación. Un activo puede estar cerrado, otro abierto, otro con riesgo aceptado y otro descartado por no aplicar, todos bajo el mismo CVE. Modelar el CVE como unidad de cierre hace imposible representar esa realidad. **El estado no pertenece al CVE: pertenece al par vulnerabilidad-activo.**

Además, la propia información sobre la vulnerabilidad evoluciona después de publicada. Los registros CVE tienen estados propios —reservado, publicado, rechazado— y las bases de datos que los enriquecen mantienen eventos separados de recepción, análisis inicial, reanálisis y modificación. Un sistema maduro distingue el ciclo de vida del **conocimiento** sobre la vulnerabilidad del ciclo de vida de la **exposición** en el entorno propio, y los relaciona.

---

## 5. Ciclo de vida completo

No existe un ciclo universal único. El siguiente modelo combina el ciclo de la vulnerabilidad, el de la gestión y el de la remediación operativa.

### 5.1 Los ocho momentos

| Momento | Qué ocurre | Quién lo genera |
|---|---|---|
| **t0 — Publicación** | El advisory se publica en la fuente. | Fuente externa |
| **t1 — Detección** | El sistema correlaciona el advisory con el inventario y determina que un activo propio está afectado. | Sistema (automático) |
| **t2 — Reconocimiento** | Una persona hace el triage: confirma que aplica, lo descarta o lo clasifica. | Persona |
| **t3 — Inicio de remediación** | Comienza el trabajo: se asigna responsable, se planifica la ventana. | Persona |
| **t4 — Aplicación declarada** | Se afirma que el cambio fue aplicado. Sin verificación, acá cierran la mayoría de los sistemas. | Persona |
| **t5 — Verificación** | El sistema comprueba con evidencia propia que la condición vulnerable ya no está. | Sistema (automático) |
| **t6 — Cierre** | El caso se cierra formalmente y sale de la cola activa. | Sistema o persona |
| **t7 — Reapertura** | Eventual. La vulnerabilidad reaparece en un escaneo posterior. | Sistema (automático) |

De los ocho, **dos definen si un sistema hace tracking real: t5 y t7**. Los demás pueden existir en cualquier gestor de tareas genérico.

### 5.2 Los dos ciclos que no hay que confundir

Corren en paralelo y se cruzan:

```
CICLO DEL CONOCIMIENTO          CICLO DE LA EXPOSICIÓN
(externo a la organización)     (interno)

  Descubrimiento                    Aplicabilidad
       │                                 │
  Reporte al proveedor              Detección en activo
       │                                 │
  Asignación de CVE                 Priorización
       │                                 │
  Publicación  ─────────────────►  Asignación
       │                                 │
  Publicación de la fix             Tratamiento
       │                                 │
  Revisión del advisory             Verificación
       │                                 │
  (rango ampliado) ─────────────►  Reapertura
```

La flecha inferior es la que casi ningún sistema modela: cuando la fuente amplía el rango afectado de un advisory ya publicado, una remediación verificada contra el rango anterior deja de ser válida. Es el argumento técnico de fondo para la **reverificación periódica** (ver [Sección 10.3](#103-reverificación-periódica)).

---

## 6. Flujo operativo paso a paso

Esta sección traduce el modelo conceptual anterior a un flujo de trabajo concreto — la vista que va a usar un analista o un DevSecOps en el día a día.

### 6.1 Detección de la vulnerabilidad

Todo comienza cuando se identifica una vulnerabilidad. Puede provenir de:

- Escáneres automáticos (Nessus, OpenVAS, Qualys, etc.).
- Análisis SAST o DAST.
- Pentesting.
- Auditorías de seguridad.
- Reportes de usuarios / Bug Bounty.
- Sistemas SIEM.
- Revisión manual.
- **GitHub Security Advisories (GHSA)** — ver nota técnica en [Sección 7.5](#75-ghsa-como-fuente-primaria-particularidades-para-el-modelo), especialmente relevante si el inventario es de dependencias de código abierto.

Se genera un **caso de remediación** con información inicial: ID único, fecha de detección, fuente, activo afectado, descripción, evidencia, CVE (si existe), CVSS, criticidad, y estado inicial **Nueva**.

### 6.2 Análisis y validación

No toda vulnerabilidad detectada requiere una corrección inmediata. Primero debe validarse: ¿es un falso positivo? ¿es explotable? ¿qué activos afecta? ¿qué impacto tendría? ¿existe una mitigación temporal? ¿qué prioridad tiene?

```text
Activo:          Servidor Web Producción
Vulnerabilidad:  SQL Injection
Impacto:         Alto
Probabilidad:    Alta
Riesgo:          Crítico
```

### 6.3 Priorización

La prioridad no depende únicamente del CVSS. También se consideran: sistema afectado, datos comprometidos, exposición a Internet, clientes afectados, requisitos regulatorios, facilidad de explotación, existencia de exploits públicos.

| CVSS | Sistema | Prioridad |
|---:|---|---|
| 9.8 | Producción | Crítica |
| 9.8 | Desarrollo | Media |
| 6.5 | Producción | Alta |

> Esto es consistente con el modelo de cuatro variables de la BOD 26-04 (ver [Sección 21](#21-marco-normativo-y-de-plazos)): el CVSS por sí solo no determina la urgencia; el contexto del activo sí.

### 6.4 Asignación

Se asigna a un responsable: Equipo DevOps, Infraestructura, Desarrollo, DBA, Cloud, o una persona específica. Se registra responsable, equipo, fecha de asignación, fecha límite y SLA.

```text
Responsable: Juan Pérez
Equipo:      Backend
Fecha límite: 12/08
SLA:         72 horas
```

### 6.5 Plan de remediación

Antes de modificar nada se define qué se va a hacer. Ejemplo: dependencia Log4j vulnerable → actualizar Log4j → ejecutar pruebas → desplegar en staging → validar → desplegar en producción. Este plan queda registrado para auditoría.

### 6.6 Ejecución

Es la implementación de la solución. El sistema registra: quién hizo el cambio, cuándo, qué cambios realizó, commits asociados, tickets relacionados, despliegues, versiones.

### 6.7 Evidencias

Toda remediación debe poder demostrarse. Se adjuntan capturas, reportes del escáner, resultados de pruebas, logs, commits, pull requests, documentación, PDFs.

```text
PR #251
Actualización:     Spring Boot 3.4
Resultado Scan:    Sin vulnerabilidades
Capturas / Reporte PDF
```

Esto corresponde a los niveles de evidencia formales E2–E4 de la [Sección 8.3](#83-declarar-y-comprobar).

### 6.8 Verificación

Una persona **distinta** al responsable verifica que el problema realmente desapareció, ejecutando nuevamente escáneres, pruebas de penetración, validaciones manuales o pruebas funcionales. Resultado: ✅ corregida o ❌ continúa siendo explotable. Si falla, vuelve al desarrollador.

### 6.9 Cierre

Solo cuando la vulnerabilidad fue validada se puede cerrar. Se registra fecha de cierre, responsable, tiempo de resolución, evidencia final y versión donde quedó solucionada.

### 6.10 Auditoría e historial

Todo queda almacenado y nunca se elimina información:

```text
05/08  Se detectó
06/08  Se asignó
07/08  Se desarrolló
08/08  Se desplegó
09/08  Se verificó
09/08  Se cerró
```

### 6.11 Modelo de estados operativo (workflow)

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

> **Cómo se relaciona con el modelo formal de estados (Sección 8):** este flujo operativo es la vista de *proceso* (qué hace el equipo). El modelo de la Sección 8 —alineado a VEX— es la vista de *evidencia* (qué puede afirmarse y con qué respaldo). Son complementarios: «En remediación» y «En pruebas» aquí corresponden a `remediation_started_at`; «Pendiente de verificación» corresponde al estado **Remediación declarada**; «Verificada» corresponde a **Remediación verificada**. Un sistema maduro necesita ambas capas — la de flujo de trabajo para gestión diaria, y la de evidencia para que el cierre sea auditable y no una simple declaración.

---

## 7. Los seis componentes del modelo

Un tracking completo se compone de seis elementos, ordenados por dependencia: cada uno requiere que el anterior exista. Si falta uno de la base, las capacidades de arriba se caen aunque estén implementadas.

| # | Componente | Función | Sin él, qué se rompe |
|---|---|---|---|
| **A** | Identidad estable del activo y cobertura del escaneo | Permite afirmar que el activo observado hoy es el mismo que se observó la vez anterior. | No hay comparación posible entre escaneos. Todo aparece como hallazgo nuevo. |
| **B** | Máquina de estados con timestamps por transición | Registra en qué punto del ciclo está cada caso y cuándo llegó ahí. | No hay intervalos medibles. Solo se conoce el estado actual, no la historia. |
| **C** | Plazo derivado de un criterio de priorización | Asigna a cada caso una fecha límite justificada por su riesgo. | No hay cumplimiento que medir. El plazo es un número arbitrario. |
| **D** | Mecanismo de verificación | Confirma con evidencia propia que la condición vulnerable dejó de existir. | El cierre es una declaración. No se puede hablar de MTTR en sentido estricto. |
| **E** | Detección de recurrencia | Advierte cuando una vulnerabilidad cerrada reaparece. | El sistema reporta un estado más sano que el real. |
| **F** | Registro de auditoría inmutable | Conserva quién cambió qué, cuándo y con qué justificación, sin sobrescribir. | No hay trazabilidad. Las métricas históricas no son reconstruibles ni auditables. |

El componente **A** es el más subestimado y el que sostiene a todos los demás. El **F** es el que vuelve auditable a todo el resto.

### 7.1 Componente A — Identidad estable y cobertura

**Por qué es el cimiento.** Un sistema de detección trabaja con fotos: cada ejecución produce un estado del inventario en un instante. Un sistema de tracking trabaja con la comparación entre fotos consecutivas. Esa comparación exige poder afirmar que la entidad observada en el escaneo N es la misma que la del escaneo N+1. Si la identidad no es estable, cada escaneo produce un universo nuevo, y el tracking es estructuralmente imposible por más campos que se agreguen después.

**Requisitos:**

- **Clave de identidad independiente del nombre de presentación.** No debe basarse en atributos volátiles como IP, hostname o identificador de instancia.
- **Identidad compuesta del hallazgo**: activo + vulnerabilidad + ubicación dentro del activo. Sin el tercer término, dos ocurrencias distintas de la misma vulnerabilidad en el mismo activo colapsan en una.
- **Normalización explícita y documentada** entre el identificador externo y el interno, con regla determinística.
- **Reconciliación por actualización, no por inserción**: la operación sobre el inventario debe actualizar si el activo existe y crear si no existe. Nunca insertar incondicionalmente.
- **Historial de versiones del activo.**
- **Tratamiento explícito de la baja**: un activo que deja de existir no es un activo remediado. Debe excluirse del denominador de las métricas.

#### 7.1.1 El cierre por ausencia

Este es el error más peligroso de un tracking mal construido. Cuando una vulnerabilidad abierta no aparece en el escaneo siguiente, hay al menos cinco explicaciones posibles:

1. **Se remedió.** El activo subió de versión y salió del rango vulnerable.
2. **El activo no fue analizado.** El escaneo tuvo menor cobertura.
3. **El activo dejó de existir.** Fue dado de baja, renombrado o migrado.
4. **El advisory cambió.** La fuente corrigió el rango afectado, retiró el registro o lo reclasificó.
5. **Falso negativo.** El método de detección cambió o falló en esa ejecución.

> **El antipatrón:** un sistema que interpreta la desaparición de un hallazgo como remediación cierra vulnerabilidades que siguen abiertas cada vez que el escaneo tiene menor cobertura. El efecto es acumulativo y silencioso: el sistema reporta métricas cada vez mejores a medida que su cobertura empeora. Es el peor comportamiento posible en una herramienta de seguridad, porque produce confianza injustificada.

CIS reconoce en su especificación de evaluación que la ausencia de la misma combinación activo-vulnerabilidad en el escaneo más reciente puede tomarse como indicativa de remediación — la inferencia por ausencia es una práctica aceptada. Lo que la vuelve legítima es que sea una inferencia **declarada** y no una conclusión encubierta. Es preferible un estado del tipo «observado ausente» que un campo booleano «remediación comprobada».

**Campos mínimos del registro de ejecución:**

```text
scan_id              identificador de la ejecución
started_at           inicio
finished_at          fin
status               SUCCESS | PARTIAL | FAILED
assets_in_scope      cuántos activos debían analizarse
assets_analyzed      cuántos se analizaron efectivamente
sources_consulted    qué fuentes respondieron
sources_failed       qué fuentes no respondieron
error_detail         causa de la cobertura parcial
```

Un escaneo con estado parcial **no debe usarse para cerrar hallazgos**.

### 7.2 GHSA como fuente primaria: particularidades para el modelo

El pipeline de ingestión típico no consume únicamente CVE/NVD: para un inventario de dependencias de código abierto, la fuente más directa suele ser **GitHub Security Advisories (GHSA)**. Tratarla como un simple espejo de CVE es un error con consecuencias sobre los componentes A y D.

**Qué es y cómo se relaciona con CVE.** Un aviso de GHSA entra a la base por investigación propia del equipo de GitHub, reporte privado de un mantenedor, o sincronización automática desde NVD/MITRE. GitHub es Autoridad de Numeración de CVE (CNA) desde septiembre de 2020, lo que explica por qué gran parte de los CVE de npm, PyPI y RubyGems se originan hoy en GitHub y no en un CNA tradicional.

La relación GHSA↔CVE **no es de equivalencia uno a uno**: un aviso puede tener solo GHSA-ID, o ambos identificadores. El formato **OSV** (Open Source Vulnerability, en el que GitHub publica cada asesoría) modela esto explícitamente: el identificador primario es el GHSA-ID, y el CVE —cuando existe— aparece como alias. La regla de normalización del Componente A debe decidir explícitamente sobre qué identificador ancla la identidad: usar CVE cuando existe y GHSA-ID como respaldo, o usar GHSA-ID siempre como clave primaria (más robusto, porque cubre también avisos que nunca reciben CVE).

**La distinción que más importa: `reviewed` vs. `unreviewed`.** GitHub separa las asesorías en revisadas (validadas manualmente: severidad, ecosistema, rango, versión corregida confirmados por una persona) y no revisadas (incorporadas automáticamente desde el feed de NVD, sin control de calidad). En la práctica esto produce rangos incompletos o placeholder —el patrón más citado es un rango afectado literal `>= 0`, artefacto de la traducción automática de NVD a formato GHSA.

> **Consecuencia directa sobre el Componente D:** un mecanismo de verificación por comparación de versiones que confía ciegamente en el rango vulnerable de un advisory `unreviewed` puede producir un falso cierre o una alerta que nunca debió dispararse. El modelo de datos debería registrar si el advisory consumido es `reviewed` o `unreviewed`, y tratar el segundo caso con un nivel de confianza más bajo — análogo a la escala de evidencia E0-E6 de la [Sección 8.3](#83-declarar-y-comprobar), pero aplicado a la calidad del dato de entrada.

**Rangos múltiples y advisories que cambian.** El formato OSV modela el rango afectado como una secuencia de eventos (`introduced`, `fixed`, `last_affected`) dentro de una estructura `ranges` por paquete, y un mismo advisory puede declarar varios paquetes afectados, cada uno con su propio rango — no es un caso excepcional, es la forma normal de representar parches backporteados. El esquema incluye además un campo `withdrawn` con fecha para advisories retirados después de publicados: un sistema que ingiere GHSA y no revisa este campo puede mantener abierto, indefinidamente, un hallazgo basado en un advisory que la propia fuente ya retractó (el quinto motivo de desaparición de la sección 7.1.1: «el advisory cambió»). GHSA es donde ese motivo se materializa con más frecuencia que en CVE/NVD, porque su curación comunitaria es más ágil.

*Fuente: GitHub Docs — About the GitHub Advisory Database; repositorio `github/advisory-database`; especificación OSV (ossf.github.io/osv-schema). Consultado: agosto 2026.*

---

## 8. Estados, evidencia y transición

### 8.1 Estados mínimos (modelo de evidencia)

| Estado | Significado | Timestamp |
|---|---|---|
| **Detectada** | El sistema la correlacionó con un activo. Nadie la miró todavía. | `detected_at` |
| **Reconocida** | Una persona la revisó y confirmó que aplica. | `acknowledged_at` |
| **En remediación** | Hay trabajo en curso. | `remediation_started_at` |
| **Remediación declarada** | Se afirma que el cambio fue aplicado. Sin comprobar. | `declared_at` |
| **Remediación verificada** | El sistema comprobó que la condición vulnerable ya no está. | `verified_at` |
| **Mitigada** | El riesgo se redujo por otra vía sin eliminar la vulnerabilidad. | `mitigated_at` + descripción del control |
| **No aplica** | No afecta a este activo en su configuración real. | `dismissed_at` + justificación obligatoria |
| **Riesgo aceptado** | Aplica, pero se decide no remediar. | `accepted_at` + responsable + fecha de caducidad |
| **Reabierta** | Volvió a detectarse después del cierre. | `reopened_at` |

**Remediar no es mitigar.** Actualizar el software puede eliminar la vulnerabilidad. Pero también se puede desactivar una función, aislar el sistema, agregar una regla o cambiar una configuración — acciones que reducen el riesgo sin eliminar la vulnerabilidad original. Un modelo que las colapsa en un único estado «resuelta» pierde información necesaria para decidir si el caso sigue requiriendo atención.

### 8.2 El vocabulario normalizado: VEX

**VEX** (Vulnerability Exploitability eXchange), impulsado por CISA a partir del trabajo del grupo de SBOM, define cuatro estados posibles para cada par producto-vulnerabilidad:

| Estado VEX | Significado |
|---|---|
| `not_affected` | El producto no es explotable a través de esta vulnerabilidad. Requiere justificación de un conjunto acotado, para que la afirmación sea auditable. |
| `affected` | La vulnerabilidad afecta al producto. Se recomienda acción. |
| `fixed` | El producto contiene la corrección. |
| `under_investigation` | Todavía no se determinó si el producto está afectado. |

VEX ofrece un anclaje normativo para el diseño del modelo de estados, en lugar de que la nomenclatura parezca arbitraria. Y sobre todo introduce una exigencia metodológica: el estado «no afectado» exige justificación explícita, precisamente para que la afirmación pueda auditarse. Un descarte sin justificación registrada no es auditable. La proporción de hallazgos que resultan no explotables en la configuración efectiva es habitualmente alta, y un sistema que no permite registrar ese descarte con justificación acumula ruido de manera indefinida.

### 8.3 Declarar y comprobar

Una **declaración** es información introducida por un actor que afirma que algo ocurrió («parche instalado», «ticket cerrado», «servidor actualizado»). El sistema puede registrarla; registrarla no significa que pueda comprobarla. Una **evidencia** es una observación que sustenta la afirmación, y puede ordenarse por fuerza relativa:

| Nivel | Tipo de evidencia | Fuerza |
|---|---|---|
| **E0** | Ninguna. Solo el cambio de estado. | Nula |
| **E1** | Declaración manual de una persona. | Baja |
| **E2** | Ticket cerrado en un sistema de gestión. | Baja-media |
| **E3** | Registro de despliegue con marca de tiempo. | Media |
| **E4** | Inventario o configuración posterior que muestra la versión corregida. | Alta |
| **E5** | Nueva evaluación independiente que ya no detecta la condición. | Muy alta |
| **E6** | Verificación específica y reproducible de que el vector no es alcanzable. | Muy alta |

Esta escala **no es normativa**: es una ordenación técnica útil para clasificar el respaldo de cada cierre. Una métrica construida solo sobre estados declarados mide *actividad del proceso*. Una métrica construida sobre verificación independiente puede medir *reducción observada de exposición*. Son cosas distintas y no deberían llevar el mismo nombre.

### 8.4 Reglas de transición

- **¿Se puede pasar de detectada a verificada sin pasos intermedios?** Ocurre cuando el activo se actualiza por una razón ajena al hallazgo. El sistema debe poder registrarlo sin inventar timestamps intermedios.
- **¿La verificación puede fallar?** Si el sistema comprueba y encuentra que la vulnerabilidad persiste pese a la declaración, ese evento debe registrarse: es información sobre la calidad del proceso de remediación, y habilita una métrica propia (tasa de eficacia de remediación).
- **¿La aceptación de riesgo caduca?** Una aceptación sin fecha de revisión se vuelve permanente por omisión y sobrevive a la rotación de personal y a los cambios de arquitectura. El modelo debería forzar el vencimiento.
- **¿Qué pasa si el activo se da de baja?** No es una remediación. Necesita estado propio o exclusión explícita del denominador.

---

## 9. Plazos y criterio de priorización

### 9.1 El plazo necesita un criterio

Asignar una fecha límite es técnicamente trivial: un campo calculado a partir de la detección y de la clasificación de riesgo. Lo que no es trivial es la justificación del criterio que determina esa clasificación. Un plazo sin criterio documentado es un número arbitrario; un plazo derivado de un marco reconocido es una decisión de diseño defendible.

### 9.2 El plazo dinámico

Una consecuencia poco tratada: las variables que determinan el plazo **cambian con el tiempo**. Un CVE que hoy no está en KEV puede entrar mañana. Un activo que hoy no está expuesto puede quedar expuesto tras un cambio de configuración. Un plazo calculado una sola vez, en el momento de la detección, queda congelado y deja de reflejar el riesgo real. La alternativa es **recalcularlo en cada evaluación**: si las variables cambian, la fecha límite se ajusta. Esto obliga a registrar no solo el plazo sino también las variables que lo produjeron, para que el cambio sea explicable y auditable.

*(El modelo vigente — BOD 26-04 — se detalla en la [Sección 21](#21-marco-normativo-y-de-plazos).)*

---

## 10. Verificación

### 10.1 Escala de madurez de verificación

La verificación no es binaria. Admite una escala, y ubicarse honestamente en ella es más defendible que afirmar una capacidad que no se tiene. **Esta escala es una síntesis propia, no un modelo normativo.**

| Nivel | Qué hace el sistema | Evidencia | Métrica que habilita |
|---|---|---|---|
| **0 — Sin tracking** | Registra que la vulnerabilidad existe. No hay estados ni cierre. | Ninguna | Solo conteos de hallazgos abiertos |
| **1 — Declarativa** | Una persona marca el hallazgo como resuelto. El sistema estampa la fecha. | La afirmación de la persona | Tiempo de gestión. No MTTR. |
| **2 — Declarativa con evidencia** | Se registra qué se hizo: versión aplicada, método, quién y cuándo. | La afirmación más su respaldo documental | Tiempo de gestión con trazabilidad auditable |
| **3 — Verificación por inventario** | En el escaneo siguiente el sistema compara la versión del activo contra el rango vulnerable y confirma por sí mismo. | Comprobación automática sobre datos propios | MTTR estricto, tiempo de verificación, recurrencia |
| **4 — Verificación por reescaneo activo** | Un escáner independiente comprueba sobre el activo en ejecución que la condición ya no es alcanzable. | Comprobación automática sobre el sistema real | Todo lo anterior, con evidencia de explotabilidad efectiva |

**El salto cualitativo está entre el nivel 2 y el nivel 3.** Hasta el 2 inclusive, el cierre es una afirmación humana mejor o peor documentada, y la métrica de tiempo mide el proceso de gestión. A partir del 3 el sistema produce evidencia propia, y recién ahí el intervalo medido corresponde a lo que la literatura llama MTTR. El nivel 3 es alcanzable para un sistema que trabaja sobre inventario de dependencias declaradas, porque la comprobación es una comparación de versiones contra el rango del advisory. El nivel 4 requiere un escáner activo y queda fuera del alcance de la mayoría de los proyectos.

> **Sobre la honestidad metodológica:** ubicarse en un nivel intermedio y declararlo con precisión es más sólido que reclamar un nivel superior sin la evidencia que lo respalde. Un sistema en nivel 2 que se describe como nivel 2, explica por qué, y define el nivel 3 como línea de trabajo futuro, presenta un argumento más fuerte que uno que afirma un nivel que su modelo de datos no puede sostener.

### 10.2 Cómo funciona la verificación de nivel 3

Es una comparación entre el estado del activo en dos escaneos consecutivos, contrastada contra el rango vulnerable declarado por el advisory.

```text
para cada hallazgo abierto H (activo A, advisory V):

  si A no fue analizado en el escaneo actual:
      -> conservar estado. NO cerrar. (cobertura parcial)

  si A fue analizado:
      version_actual = version de A en el escaneo actual

      si version_actual sigue dentro del rango vulnerable de V:
          -> sigue abierta. Evaluar vencimiento de plazo.

      si version_actual quedó fuera del rango vulnerable de V:
          -> remediación verificada.
          -> estampar verified_at
          -> registrar version_previa y version_actual
          -> conservar el par bajo observación
```

**Decisiones de diseño que este mecanismo obliga a tomar:**

- **Comparación de versiones.** El orden entre dos versiones no es trivial fuera del versionado semántico estricto: sufijos de distribución, versiones de cuatro componentes, formatos de fecha y etiquetas de preproducción requieren reglas explícitas. Cada regla heurística introduce incertidumbre que debería registrarse como nivel de confianza del resultado.
- **Advisories con múltiples rangos.** Un mismo advisory puede declarar varios rangos afectados con distintas versiones de corrección. La verificación debe evaluarlos todos.
- **Advisories que cambian.** La fuente puede ampliar el rango afectado después de la publicación inicial. Una remediación verificada contra un rango que luego se amplía deja de ser válida.
- **Remediación por vía distinta al parche.** Un activo puede dejar de ser vulnerable porque se eliminó la dependencia, se aplicó un control compensatorio o se cambió la configuración. La comparación de versiones no captura estos casos y el modelo debe permitir registrarlos con justificación.

### 10.3 Reverificación periódica

Una verificación puntual establece que la condición vulnerable no existía en un instante. **No establece que no vuelva a existir.** Una proporción alta de los CVE presenta evolución continua de su corrección después de la publicación inicial, de modo que una versión considerada segura puede dejar de serlo cuando el proyecto de origen publica una revisión posterior.

De ahí que un tracking completo **no cierre definitivamente**: mantiene el par activo-advisory bajo observación y reevalúa en cada escaneo. La diferencia entre «cerrado» y «cerrado y bajo observación» es lo que separa un registro histórico de un sistema de tracking.

---

## 11. Recurrencia

Una vulnerabilidad remediada puede volver. Las causas habituales son la reversión de una dependencia, el despliegue de una imagen anterior, la restauración de un respaldo, o la recreación del entorno desde una plantilla desactualizada.

Sin detección de recurrencia el sistema reporta un estado más sano que el real: la vulnerabilidad figura como resuelta en la métrica histórica mientras está activa en el entorno. Y el fenómeno queda invisible para el equipo, con lo cual la causa raíz —típicamente un proceso de despliegue mal controlado— nunca se corrige.

**Requisitos del modelo:**

- El par activo-advisory se conserva después del cierre, no se elimina ni se archiva.
- Existe un estado de reapertura distinto del de detección inicial, para no contaminar las métricas de detección con reapariciones.
- Cada ciclo de apertura y cierre se registra por separado, de modo que un mismo par pueda acumular varios intervalos de remediación.
- Las decisiones de triage previas se conservan y se reaplican: si un hallazgo fue descartado con justificación, la reaparición no debería obligar a repetir el análisis desde cero.
- **La tasa de recurrencia es una métrica de primer orden, no un subproducto.**

> **Implicancia sobre el modelo de datos:** soportar recurrencia obliga a separar la entidad «hallazgo persistente» de la entidad «ciclo de remediación». El par activo-advisory es persistente; los ciclos son varios y cada uno tiene sus propios timestamps. Un modelo que guarda los timestamps directamente en el hallazgo solo puede representar un ciclo y sobrescribe la historia en cada reapertura. Es una decisión de modelado que conviene tomar temprano: migrar después obliga a rehacer todas las consultas de métricas.

---

## 12. Auditoría

Los cinco componentes anteriores describen **qué** debe registrar el sistema. Este describe **cómo** debe conservarlo, y es lo que vuelve auditable a todo lo demás.

El principio es que el historial de eventos sea una **entidad de primer orden** del modelo y no un efecto secundario del estado actual. Cada transición debe generar un registro propio con el estado anterior, el nuevo, el momento, el actor que la produjo, el tipo de disparador (humano, escáner, política automática) y la referencia a la evidencia asociada.

Sin este componente se pierden tres cosas: el tiempo de permanencia en cada estado (que identifica los cuellos de botella del proceso); la capacidad de reconstruir métricas históricas cuando cambia la definición de una métrica; y la trazabilidad exigida por cualquier marco de cumplimiento.

La distinción entre actor humano y proceso automático merece un campo propio: saber que un cierre lo produjo una política automática y no una persona cambia por completo el valor probatorio del registro.

> **La propiedad clave:** el historial no se sobrescribe. Un análisis posterior nunca reemplaza uno anterior: lo agrega. El historial sobrevive incluso cuando el hallazgo deja de estar activo. Esto permite reconstruir la secuencia completa de decisiones y es la única forma de auditar tanto errores como cambios indebidos.

> **Las dos decisiones estructurales:** (1) separar el hallazgo persistente del ciclo de remediación — si los timestamps viven en el hallazgo, cada reapertura sobrescribe la historia; (2) la transición de estado como entidad propia — si el estado es un campo mutable, no hay tiempo de permanencia, no hay auditoría, y no hay forma de recalcular una métrica cuando cambia su definición.

---

## 13. Métricas y KPIs

### 13.1 Tres familias que no deben mezclarse

Presentar métricas de familias distintas como si fueran comparables es un error metodológico frecuente:

| Familia | Qué mide | Ejemplos | Qué NO demuestra |
|---|---|---|---|
| **Actividad** | Lo que el proceso hizo. | Casos creados, asignados, cerrados; parches desplegados. | No demuestra reducción de exposición. |
| **Resultado observado** | Cambios comprobados en la exposición. | Hallazgos que dejaron de detectarse; activos que pasaron de vulnerable a no vulnerable. | No demuestra reducción de riesgo, que depende del contexto. |
| **Riesgo** | Cambio estimado en el riesgo. | Diferencia de exposición ponderada por criticidad y probabilidad. | Depende de supuestos que deben declararse. |

Las de actividad son las más fáciles de calcular y las menos concluyentes. Las de riesgo son las más ambiciosas y las que más supuestos requieren. Un trabajo riguroso declara a qué familia pertenece cada métrica que reporta.

### 13.2 Tabla de dependencias (qué componente exige cada métrica)

| Métrica | Definición | Componentes que exige |
|---|---|---|
| **MTTD** — tiempo medio de detección | Entre la publicación del advisory y la correlación con el activo propio. | Fecha de publicación de la fuente y timestamp de correlación. |
| **Tiempo medio de reconocimiento** | Entre la detección y el primer triage humano. | Estado intermedio con timestamp propio (B). |
| **Tiempo de gestión** | Entre la detección y la declaración de resolución. | Máquina de estados (B). Nivel 1 de madurez. |
| **MTTR** — tiempo medio de remediación | Entre la detección y la verificación de que la condición cesó. | Verificación (D) nivel 3+ , más identidad estable (A). |
| **MTTV** — tiempo medio de verificación | Entre la declaración y la comprobación. | Los dos momentos registrados por separado (B y D). |
| **Tasa de eficacia de remediación** | Proporción de remediaciones declaradas que la verificación confirma. | Ambos timestamps y el registro de verificaciones fallidas (D y F). |
| **Cumplimiento de SLA/plazo** | Proporción de casos remediados dentro de su fecha límite. | Plazos con criterio (C) más verificación (D). Exige definir el denominador. |
| **Tasa de recurrencia** | Proporción de casos cerrados que reaparecen. | Detección de recurrencia (E) y ciclos separados. |
| **Tiempo de permanencia por estado** | Cuánto tiempo pasa un caso en cada estado. | Historial de transiciones (F). |
| **Cobertura del escaneo** | Proporción de activos en alcance efectivamente analizados. | Registro de cobertura (A). |
| **Capacidad de remediación** | Proporción de casos abiertos que se cierran por período. | Serie temporal de aperturas y cierres. |
| **Curva de supervivencia (aging)** | Proporción de casos que permanecen abiertos según el tiempo transcurrido. | Historial completo con población definida. |

> **La tasa de eficacia de remediación merece atención especial.** Es la proporción entre remediaciones comprobadas y remediaciones declaradas. Mide el desfasaje entre lo que el equipo afirma y lo que el sistema verifica, y es una de las pocas métricas que evalúan la *calidad* del proceso en lugar de su *velocidad*. Requiere explícitamente los dos timestamps por separado, y por eso es imposible de calcular en un sistema de nivel 1 o 2 de madurez de verificación.

### 13.3 KPI de referencia rápida (catálogo de industria)

Estos diez indicadores son los más usados en la industria y forman un buen conjunto mínimo para un dashboard operativo:

#### 1. MTTR (Mean Time To Remediate)

- **Fórmula:** `MTTR = Σ(Tiempo de remediación de cada vulnerabilidad) / Total de vulnerabilidades cerradas`
- **Interpretación:** bajo → excelente capacidad de respuesta; alto → demoras en el proceso.
- **Dashboard:** MTTR general, por severidad, por proyecto, por responsable, evolución mensual.
- ⚠️ **Ver [Sección 13.4](#134-el-ancla-del-intervalo-por-qué-mttr-sin-más-es-ambiguo)** — «MTTR» sin definir el punto de inicio es ambiguo y puede reportar tres números distintos, todos «correctos».

#### 2. Cumplimiento de SLA

- **Fórmula:** `Cumplimiento SLA = (Vulnerabilidades cerradas dentro del SLA / Total de vulnerabilidades cerradas) × 100`
- **Dashboard:** % SLA general, por severidad, por equipo, vulnerabilidades vencidas.
- ⚠️ **Ver [Sección 13.5](#135-la-trampa-del-denominador)** — calcular esto solo sobre los casos *cerrados* excluye los vencidos que nunca se resolvieron, y produce un sesgo optimista severo.

#### 3. Backlog de vulnerabilidades

Cantidad de vulnerabilidades abiertas en un momento determinado. Un backlog creciente indica acumulación de deuda de seguridad. Dashboard: total abiertas, por severidad, por proyecto, tendencia histórica.

#### 4. Vulnerabilidades abiertas vs. cerradas

Compara detectadas vs. remediadas en un período, para saber si la organización reduce o aumenta su deuda técnica. Dashboard: detectadas por mes, cerradas por mes, balance mensual.

#### 5. Aging de vulnerabilidades

Antigüedad de las vulnerabilidades abiertas. Ayuda a identificar vulnerabilidades olvidadas o incumplimientos de SLA. Rangos habituales: 0–30, 31–60, 61–90, más de 90 días.

#### 6. Tiempo promedio por estado

Tiempo promedio que una vulnerabilidad permanece en cada etapa del flujo (Nueva, En análisis, Asignada, En remediación, En pruebas, Pendiente de verificación, Cerrada). Permite detectar cuellos de botella específicos del proceso. Requiere el Componente F (auditoría de transiciones).

#### 7. Vulnerabilidades por severidad

Distribución según criticidad (Crítica, Alta, Media, Baja). Facilita la priorización de esfuerzos y la evaluación del riesgo global.

#### 8. Vulnerabilidades por responsable

Cantidad asignada a cada persona o equipo. Permite equilibrar la carga de trabajo e identificar equipos saturados.

#### 9. Tiempo promedio por criticidad

Tiempo de remediación según nivel de severidad. Ejemplo de industria (modelo pre-BOD 26-04, ver advertencia en [Sección 2](#2-advertencia-sobre-vigencia-normativa)):

- Críticas → 24 horas
- Altas → 3 días
- Medias → 10 días
- Bajas → 30 días

Permite verificar que las vulnerabilidades más graves reciben atención prioritaria. Para un diseño 2026+, contrastar este ejemplo simple contra el modelo de cuatro variables de la BOD 26-04.

#### 10. Reincidencia de vulnerabilidades

Cantidad de vulnerabilidades que reaparecen después de haber sido cerradas — equivalente a la tasa de recurrencia del Componente E. Indica la calidad de las remediaciones y la madurez del proceso.

**KPIs complementarios** (no siempre en el dashboard ejecutivo, pero de uso frecuente): tiempo hasta la asignación, tiempo hasta el inicio de la remediación, tasa de remediación, riesgo residual, vulnerabilidades por activo, distribución por tipo (OWASP, CWE, CVE), tendencia del riesgo, cobertura de escaneos, vulnerabilidades detectadas por herramienta, porcentaje de falsos positivos, eficiencia del proceso de remediación.

### 13.4 El ancla del intervalo: por qué «MTTR» sin más es ambiguo

«MTTR» sin definición del punto inicial es ambiguo. El inicio puede ser la publicación del advisory, la disponibilidad del parche, la primera detección, la creación del ticket o la asignación.

**Ejemplo:** caso publicado el 1 de enero, detectado el 5, asignado el 6, parchado el 10 y verificado el 12.

- Intervalo desde publicación: **11 días**
- Intervalo desde detección: **7 días**
- Intervalo desde asignación: **6 días**

Los tres son correctos y miden cosas distintas. Un sistema que solo tiene la fecha de creación y de cierre del ticket puede calcular el tiempo de ciclo del ticket, pero no necesariamente el tiempo de remediación de la vulnerabilidad: el ticket pudo crearse días después de la detección. **Toda métrica de tiempo reportada debe declarar entre qué dos eventos se mide.**

### 13.5 La trampa del denominador

Más de la mitad de los problemas metodológicos en estas métricas no está en el numerador sino en el denominador. Antes de reportar cualquier proporción hay que responder:

- ¿Se cuentan los casos aún abiertos o solo los cerrados? Calcular el cumplimiento de plazo únicamente sobre los cerrados excluye sistemáticamente los vencidos que nunca se resolvieron, y produce un sesgo optimista severo.
- ¿Los casos descartados por no aplicar entran en el denominador? Si entran, mejoran artificialmente el desempeño; si no entran, hay que declararlo.
- ¿Los activos dados de baja se cuentan como remediados? **No lo son.**
- ¿Cada reapertura genera un caso nuevo o actualiza el existente? Afecta directamente al total.
- ¿Sobre qué ventana temporal? Una media sin ventana declarada no es interpretable.

### 13.6 Órdenes de magnitud de referencia

Para dimensionar si un resultado propio es plausible, sirve conocer los órdenes de magnitud que reporta la investigación empírica. La serie *Prioritization to Prediction*, del Cyentia Institute junto con Kenna Security, aplicó análisis de supervivencia sobre datos observacionales de cientos de organizaciones:

- **Capacidad de remediación.** Una organización típica, con independencia del tamaño de su entorno, remedia aproximadamente **una de cada diez** vulnerabilidades abiertas en un mes dado. El modelo de regresión log-log presentó un R² de 0,93 — la relación entre abiertas y cerradas es notablemente estable entre organizaciones.
- **Vida media del hallazgo.** El cuarto volumen de la serie reporta una vida media agregada de **159 días**, con una cola larga de casos que permanecen abiertos más allá del año.

> **Uso metodológico:** estos valores sirven para contrastar el orden de magnitud de un resultado propio, no como línea base sustituta. Si un sistema propio reporta tiempos de remediación de horas frente a una vida media de referencia de meses, la diferencia exige explicación: puede reflejar una mejora real, o puede indicar que se está midiendo otra cosa.

---

## 14. Dashboards recomendados

Consolidando la vista de industria (KPIs) con la vista operativa (Sistema de tracking):

### 14.1 Vista Ejecutiva (CISO)

- MTTR (con ancla declarada).
- Cumplimiento de SLA.
- Backlog.
- Vulnerabilidades críticas abiertas.
- Aging.
- Riesgo residual.
- Tendencia mensual.
- Reincidencias / tasa de recurrencia.

### 14.2 Vista Operativa

- Vulnerabilidades por estado.
- Vulnerabilidades por responsable.
- Vulnerabilidades por proyecto / activo.
- Tiempo promedio por estado.
- Tiempo promedio por criticidad.
- Vulnerabilidades vencidas.
- Balance abiertas vs. cerradas.
- Cumplimiento de SLA por equipo.
- Cobertura de escaneo (activos en alcance vs. analizados).

### 14.3 Resumen tipo (panel superior)

Vulnerabilidades abiertas · En progreso · Vencidas · Críticas · Cerradas este mes · MTTR.

### 14.4 Filtros recomendados

Proyecto · Cliente · Activo · Responsable · Severidad · Estado · Fecha · CVE / GHSA-ID · Etiquetas.

### 14.5 KPIs mínimos para un MVP

1. MTTR (con ancla declarada).
2. Cumplimiento de SLA.
3. Backlog de vulnerabilidades.
4. Vulnerabilidades abiertas vs. cerradas.
5. Aging de vulnerabilidades.
6. Tiempo promedio por estado.
7. Vulnerabilidades por severidad.
8. Vulnerabilidades por responsable.
9. Tiempo promedio por criticidad.
10. Reincidencia de vulnerabilidades.

Este conjunto de diez indicadores da una visión completa del rendimiento del proceso de remediación tanto a nivel operativo como ejecutivo — pero cada uno depende de que exista el componente subyacente correspondiente (ver [Sección 13.2](#132-tabla-de-dependencias-qué-componente-exige-cada-métrica)). Reportar un MTTR "estricto" sin verificación de nivel 3 es, en rigor, reportar tiempo de gestión con otro nombre.

---

## 15. Madurez del programa

La escala de la [Sección 10](#10-verificación) mide una capacidad puntual: la verificación. Para ubicar el **programa completo** existe un modelo de industria con respaldo institucional, que conviene usar en lugar de inventar una escala propia.

### 15.1 El modelo de SANS

El **Vulnerability Management Maturity Model**, creado por Jonathan Risto y David Hazar en el SANS Institute, evalúa el programa en cinco niveles —inicial, gestionado, definido, gestionado cuantitativamente y optimizado— a lo largo de cinco dominios: preparar, identificar, analizar, comunicar y tratar.

Su virtud metodológica es que la evaluación se hace **por dominio y no de forma global**, lo cual refleja una realidad habitual: las organizaciones rara vez tienen madurez pareja en todos los aspectos, y la fortaleza en un área suele enmascarar carencias estructurales en otra. Una segunda versión del modelo evalúa cuarenta capacidades distintas, y SANS publica además una herramienta de autoevaluación.

### 15.2 Los saltos que importan

| Salto | De | A |
|---|---|---|
| **Registro a flujo** | «Sé qué vulnerabilidades tengo.» | «Sé quién está tratando cada una y para cuándo.» |
| **Flujo a historia** | «Sé el estado actual.» | «Puedo reconstruir cómo llegó a ese estado.» |
| **Historia a evidencia** | «Alguien afirma que fue corregida.» | «Tengo evidencia propia de que dejó de observarse.» |
| **Evidencia a medición** | «Puedo seguir casos individuales.» | «Puedo medir sistemáticamente el comportamiento del proceso.» |

El tercer salto («historia a evidencia») es el que separa un sistema declarativo de uno comprobable, y coincide con la frontera entre los niveles 2 y 3 de la escala de verificación.

---

## 16. Modelo de datos de referencia

Estructura mínima que soporta los seis componentes. No prescribe una implementación: enumera las entidades y campos que el modelo debe poder representar.

### Activo

```text
asset_id                clave interna estable
external_key            identificador normalizado de la fuente
display_name            nombre de presentación (puede cambiar)
current_version         versión vigente
environment              entorno
criticality              criticidad de negocio
exposed                  alcanzable desde el exterior
status                   ACTIVO | DADO_DE_BAJA
first_seen / last_seen   primera y última observación
```

### Historial de versiones del activo

```text
asset_id, version, observed_at, scan_id
```

### Ejecución de escaneo

```text
scan_id, started_at, finished_at
status                   SUCCESS | PARTIAL | FAILED
assets_in_scope          activos que debían analizarse
assets_analyzed          activos efectivamente analizados
sources_ok / sources_failed
```

### Hallazgo — par activo-advisory, persistente

```text
finding_id
asset_id, advisory_id, location_key
first_detected_at        primera detección de este par
current_state             estado vigente
active                    true | false (no se borra al cerrar)
cycle_count                cuántas veces se abrió
```

### Ciclo de remediación — varios por hallazgo

```text
cycle_id, finding_id, cycle_number
detected_at              apertura de este ciclo
acknowledged_at          primer triage humano
remediation_started_at   inicio del trabajo
declared_at              resolución declarada
verified_at              resolución verificada por el sistema
closed_at                cierre formal
due_date                 fecha límite calculada
priority_tier            nivel asignado
priority_variables       variables que determinaron el nivel
version_before / version_after
verification_method      cómo se verificó
evidence_level           E0..E6
outcome                  VERIFICADA | DECLARADA | MITIGADA |
                          DESCARTADA | RIESGO_ACEPTADO |
                          ACTIVO_DE_BAJA
justification            obligatoria si DESCARTADA
```

### Transición de estado — auditoría

```text
transition_id, cycle_id
from_state, to_state
occurred_at
actor_id                 usuario o proceso
actor_type                HUMANO | ESCANER | POLITICA
trigger                   qué la disparó
evidence_ref              referencia a la evidencia
comment                   texto libre
```

### Excepción o aceptación de riesgo

```text
exception_id, cycle_id
type, reason
approved_by, approved_at
expires_at               obligatorio
compensating_controls
review_at
```

---

## 17. Roles, responsabilidades e integraciones [Agregado]

Ninguno de los tres documentos originales incluye una matriz de roles explícita ni un mapa de integraciones formal. Se agrega aquí como complemento operativo, derivado de la información dispersa en los tres documentos (equipos mencionados en el flujo operativo, `actor_type` del modelo de datos, y la mención de integraciones en el cierre del documento de sistema).

### 17.1 Roles típicos (RACI simplificado)

| Rol | Responsabilidad principal | Fase donde actúa |
|---|---|---|
| **Analista de seguridad / SOC** | Triage inicial, validación de falsos positivos, priorización. | Detección, Análisis (t1–t2) |
| **Responsable técnico (Dev / DevOps / Infra / DBA / Cloud)** | Ejecuta la remediación o mitigación. | Plan y ejecución (t3–t4) |
| **Verificador (persona distinta al responsable)** | Comprueba de forma independiente que la corrección fue efectiva. | Verificación (t5) |
| **CISO / responsable de riesgo** | Aprueba aceptaciones de riesgo, revisa excepciones, define criterios de priorización. | Priorización, excepciones |
| **Auditor / Compliance** | Revisa el historial de auditoría, valida cumplimiento normativo. | Post-hoc, cualquier momento |
| **Sistema (escáner / política automática)** | Detecta, correlaciona, verifica por comparación de versiones, y puede cerrar o reabrir según reglas. | t1, t5, t7 |

El campo `actor_type` (HUMANO | ESCANER | POLITICA) del modelo de datos ([Sección 16](#16-modelo-de-datos-de-referencia)) es lo que permite reconstruir, para cada transición, cuál de estos roles la produjo.

### 17.2 Integraciones típicas

Los sistemas de remediación modernos no solo registran el avance de las vulnerabilidades: funcionan como una **plataforma de gestión del ciclo de vida de la remediación**, integrando:

- **Escáneres de vulnerabilidades** (Nessus, OpenVAS, Qualys, herramientas SAST/DAST) → fuente de detección.
- **GitHub Security Advisories / OSV** → fuente primaria para inventarios de dependencias open source (ver [Sección 7.2](#72-ghsa-como-fuente-primaria-particularidades-para-el-modelo)).
- **Herramientas de desarrollo** (Git, Jira, Azure DevOps) → asignación, tickets, trazabilidad de commits y PRs.
- **Pipelines de CI/CD** → despliegues, versiones, evidencia de nivel E3-E4.
- **SIEM** → correlación con eventos de seguridad, alertas.

Esta integración permite automatizar tareas, medir indicadores (MTTR, cumplimiento de SLA), generar alertas por vencimientos y mantener un historial completo para auditorías y cumplimiento normativo (ISO 27001, PCI DSS, NIST). De esta forma, la organización puede demostrar no solo que detecta vulnerabilidades, sino que cuenta con un proceso controlado, medible y trazable para resolverlas.

---

## 18. Evidencia de implementaciones reales

Los capítulos anteriores describen el modelo. Esta sección contrasta ese modelo contra cómo lo resolvieron herramientas de código abierto en producción — la fuente que ningún estándar aporta: qué campos hicieron falta de verdad.

Un estándar dice qué debe lograrse. Una implementación en producción muestra qué estructura hizo falta para lograrlo, y qué problemas aparecieron que el estándar no anticipó. Dos proyectos de OWASP son especialmente pertinentes porque resuelven exactamente el problema descrito en este documento.

### 18.1 Dependency-Track

Es el caso más cercano a un sistema que trabaja sobre dependencias declaradas: consume inventarios de componentes, los correlaciona contra vulnerabilidades conocidas y mantiene el seguimiento de cada hallazgo. Varias de sus decisiones de diseño confirman empíricamente los principios de este documento:

| Decisión de diseño | Qué confirma |
|---|---|
| El estado del análisis sigue el vocabulario de VEX, con justificación asociada. | **Componente B**: el vocabulario normalizado no es una formalidad académica, es lo que usa una herramienta real. |
| Cada cambio de cualquier campo del análisis agrega una entrada al historial, con autor, momento y contenido del cambio. | **Componente F**: el historial como entidad de primer orden. |
| El historial es permanente. Un informe posterior del analizador nunca lo sobrescribe, y sobrevive cuando el hallazgo deja de estar activo. | **Componentes F y E**: no borrar al cerrar es condición de la trazabilidad y de la recurrencia. |
| Las decisiones de triage se reaplican cuando un hallazgo vuelve a levantarse contra el mismo componente. | **Componente E**: la reaparición no obliga a repetir el análisis desde cero. |
| Registra por separado la justificación del descarte y la respuesta prevista (actualizar, revertir, aplicar una solución alternativa). | Remediar y mitigar son tratamientos distintos y necesitan campos distintos ([Sección 8.1](#81-estados-mínimos-modelo-de-evidencia)). |
| Incorpora EPSS como señal de priorización junto a la severidad. | **Componente C**: la priorización combina señales, no depende de un único puntaje. |

> **El hallazgo más útil:** un hallazgo que desaparece no se borra: pasa a inactivo, y su historial de auditoría se conserva. Es exactamente la contramedida al cierre por ausencia descrita en la [Sección 7.1.1](#711-el-cierre-por-ausencia), implementada en una herramienta en producción. Confirma que la distinción entre «cerrado» y «conservado bajo observación» no es una sutileza teórica sino una necesidad práctica.

### 18.2 DefectDojo

Es el otro proyecto de OWASP relevante. Su modelo de hallazgos incorpora resolución de duplicados entre herramientas distintas, aceptación de riesgo con vencimiento, mitigación como estado propio, falso positivo y reapertura — es decir, el conjunto de estados de la [Sección 8](#8-estados-evidencia-y-transición), implementado y en uso.

Su aporte particular es la **resolución de duplicados**. Cuando varias herramientas de detección reportan la misma condición sobre el mismo activo, sin un mecanismo de deduplicación el sistema genera casos repetidos y las métricas se inflan. Es un problema que aparece en cuanto hay más de una fuente, y que ninguno de los estándares consultados trata explícitamente.

### 18.3 Qué mirar concretamente

Tres preguntas dirigidas al código y a la documentación de estos proyectos:

1. ¿Qué campos tiene su entidad de hallazgo que el modelo de la [Sección 16](#16-modelo-de-datos-de-referencia) no contempla?
2. ¿Cómo resuelven la identidad del hallazgo entre ejecuciones, y qué atributos usan para componerla?
3. ¿Qué hacen exactamente cuando un hallazgo desaparece de un informe posterior?

---

## 19. Antipatrones

Fallas recurrentes en implementaciones y en su documentación. Todas son verificables por un lector externo, lo que las vuelve especialmente costosas en un trabajo académico o una auditoría.

| Antipatrón | En qué consiste | Consecuencia |
|---|---|---|
| **MTTR nominal** | Llamar MTTR a un intervalo que mide gestión declarada, no remediación verificada. | El nombre promete evidencia que el dato no tiene. Se detecta cruzando el anexo de métricas contra el modelo de datos. |
| **Cierre por ausencia** | Interpretar la desaparición de un hallazgo como remediación sin verificar cobertura. | Las métricas mejoran a medida que la cobertura empeora. |
| **El CVE como unidad de cierre** | Marcar un CVE como resuelto en lugar del par CVE-activo. | Imposible representar que un activo está cerrado y otro abierto bajo el mismo CVE. |
| **Estado sin historia** | Un único campo de fecha que se sobrescribe en cada transición. | Solo se puede calcular un intervalo. La secuencia se pierde. |
| **Ticket cerrado igual a vulnerabilidad remediada** | Tomar el cierre del flujo de trabajo como prueba del cierre técnico. | Demuestra que el ticket se cerró, no que la exposición terminó. |
| **Ancla no declarada** | Medir desde la notificación o desde la creación del ticket sin decirlo. | El intervalo resulta menor y no es comparable con la literatura. |
| **Plazo sin criterio** | Fechas límite sin justificación documentada. | El cumplimiento mide el apego a un número arbitrario. |
| **Plazo congelado** | Calcular la fecha límite una sola vez y no recalcularla. | Deja de reflejar el riesgo cuando cambia el estado KEV o la exposición. |
| **Aceptación de riesgo perpetua** | Excepciones sin fecha de vencimiento ni revisión. | Sobreviven a la rotación de personal y degradan la postura en silencio. |
| **Métrica sin población** | Reportar proporciones sin declarar el denominador. | El resultado no es interpretable ni reproducible. |
| **Fórmula sin medición** | Documentar la consulta de cálculo y presentarla como resultado. | Confunde capacidad de cálculo con dato obtenido. |
| **Cierre definitivo** | Eliminar o archivar el par activo-advisory al cerrar. | La recurrencia se vuelve indetectable. |
| **Identidad volátil** | Basar la identidad del activo en dirección IP, nombre de host o identificador de instancia. | La reconciliación entre escaneos se rompe al primer cambio de infraestructura. |
| **Normativa derogada** | Citar plazos de directivas revocadas como marco vigente. | Error verificable en un minuto por cualquier lector. |

---

## 20. Lista de verificación

Se responde por sí o por no, sin matices: la respuesta intermedia suele ser un no encubierto. Conviene anotar, junto a cada sí, dónde está implementado.

### A — Identidad y cobertura

- [ ] ¿Existe una clave de identidad del activo estable entre ejecuciones, distinta del nombre de presentación?
- [ ] ¿La identidad evita depender de atributos volátiles como IP, hostname o identificador de instancia?
- [ ] ¿La identidad del hallazgo incorpora la ubicación dentro del activo, además del activo y la vulnerabilidad?
- [ ] ¿La regla de normalización entre identificador externo e interno está documentada y es determinística?
- [ ] ¿La operación sobre el inventario actualiza el activo existente en lugar de insertar uno nuevo?
- [ ] ¿Se registra qué activos fueron efectivamente analizados en cada ejecución?
- [ ] ¿Se distingue una ejecución completa de una parcial, y se impide cerrar hallazgos con una parcial?
- [ ] ¿Se conserva el historial de versiones del activo?

### B — Estados y evidencia

- [ ] ¿Hay un estado intermedio entre detección y resolución, con timestamp propio?
- [ ] ¿Se distingue la remediación declarada de la verificada?
- [ ] ¿Se distingue remediación de mitigación?
- [ ] ¿Existe descarte por no aplicar, con justificación obligatoria y auditable?
- [ ] ¿Existe aceptación de riesgo con responsable y fecha de caducidad obligatoria?
- [ ] ¿Cada transición estampa su propio timestamp, o se sobrescribe un único campo?
- [ ] ¿Se registra el nivel de evidencia que respalda cada cierre?

### C — Plazos

- [ ] ¿Cada caso tiene fecha límite calculada automáticamente?
- [ ] ¿El criterio está documentado y anclado a un marco reconocido y vigente?
- [ ] ¿El criterio incorpora contexto del activo, o depende solo de la severidad del advisory?
- [ ] ¿Se registran las variables que produjeron el plazo, y no solo la fecha resultante?
- [ ] ¿El plazo se recalcula si cambian esas variables?
- [ ] ¿El sistema detecta activamente los plazos vencidos?

### D — Verificación

- [ ] ¿El cierre requiere alguna comprobación del sistema, o basta la declaración de una persona?
- [ ] ¿El sistema compara el estado del activo entre escaneos consecutivos?
- [ ] ¿Se registra la evidencia: versión previa, versión posterior, método?
- [ ] ¿Se registra el caso en que la verificación falla, es decir cuando la vulnerabilidad persiste pese a haberse declarado resuelta?
- [ ] ¿Existe reverificación periódica de los casos cerrados?

### E — Recurrencia

- [ ] ¿El par activo-advisory se conserva después del cierre?
- [ ] ¿Existe estado de reapertura distinto del de detección inicial?
- [ ] ¿Un mismo par puede acumular varios ciclos con timestamps independientes?
- [ ] ¿Las decisiones de triage previas se reaplican al reaparecer?
- [ ] ¿La tasa de recurrencia se calcula y se reporta?

### F — Auditoría

- [ ] ¿Cada transición genera un registro propio que no sobrescribe al anterior?
- [ ] ¿Se registra el actor y se distingue si fue humano, escáner o política automática?
- [ ] ¿El historial sobrevive cuando el caso deja de estar activo?
- [ ] ¿Se puede reconstruir el tiempo de permanencia en cada estado?

### Métricas

- [ ] Para cada métrica reportada: ¿existe el timestamp que la fórmula requiere, y hay algo o alguien que lo estampe?
- [ ] ¿Está declarado entre qué dos eventos se mide cada intervalo?
- [ ] ¿Está declarado el denominador de cada proporción?
- [ ] ¿Está declarada la familia de cada métrica: actividad, resultado observado o riesgo?
- [ ] ¿El nombre de cada métrica corresponde a lo que efectivamente mide?
- [ ] ¿Se distingue lo medido de lo proyectado?

---

## 21. Marco normativo y de plazos

### 21.1 El modelo vigente: BOD 26-04

La directiva emitida el **10 de junio de 2026** reemplaza la lógica basada en severidad por **cuatro variables binarias** evaluadas para cada combinación de vulnerabilidad y activo:

| Variable | Pregunta | Quién la provee |
|---|---|---|
| **Exposición del activo** | ¿El activo vulnerable es alcanzable desde internet? | La propia organización, desde su inventario |
| **Estado KEV** | ¿El CVE figura en el catálogo de vulnerabilidades explotadas conocidas? | CISA |
| **Automatización del exploit** | ¿Un adversario puede automatizar todos los pasos de la explotación? | CISA, vía su programa de enriquecimiento |
| **Impacto técnico** | ¿La explotación otorga control total del sistema? | CISA, vía su programa de enriquecimiento |

La combinación de las cuatro variables produce dieciséis escenarios, que la directiva mapea a **cinco niveles de plazo** en la Tabla 1 de su Apéndice A. En el extremo más urgente el plazo es de **tres días con triage forense obligatorio**, exigido cuando la vulnerabilidad está en KEV y otorga control total. En el extremo opuesto, la corrección se difiere hasta la siguiente actualización programada del sistema.

> **Lo relevante para el diseño:** CISA descartó el puntaje CVSS como señal única de programación de plazos. La severidad intrínseca cedió lugar a la evidencia de explotación real y al contexto del activo. Un sistema que en 2026 derive sus plazos exclusivamente de CVSS está aplicando un criterio que la principal autoridad de referencia acaba de abandonar.
>
> **Nota de alcance:** la directiva obliga solo a agencias civiles federales de Estados Unidos. Para cualquier otra organización es marco de referencia, no obligación.

### 21.2 Cuadro comparativo de marcos de plazos

| Marco | Qué aporta | Naturaleza |
|---|---|---|
| **CISA BOD 26-04 (2026)** | Plazos graduados de 3 días a diferimiento, según cuatro variables de riesgo real. | Vinculante solo para agencias federales civiles de EE. UU. |
| **PCI DSS v4.0.1 (2024)** | Plazo de un mes desde la publicación para parches de vulnerabilidades críticas; el resto, en un plazo definido por la entidad. | Obligatorio dentro del ámbito PCI |
| **NIST SP 800-40 Rev. 4 (2022)** | Marco de planificación del proceso completo, incluida la verificación. | Guía metodológica; no prescribe plazos |
| **NIST SP 800-53, SI-2(3)** | Exige medir el tiempo entre identificación y remediación del fallo, y establecer umbrales de referencia. | Catálogo de controles; obligatoriedad según adopción |
| **CIS Controls v8.1, Safeguard 7.2** | Estrategia de remediación basada en riesgo, documentada, con revisión mensual o más frecuente. | Práctica priorizada; no legislación |
| **SSVC (Spring et al., 2019)** | Árboles de decisión que producen una acción recomendada en lugar de un número. | Metodología académica; base conceptual de la BOD 26-04 |

> Sobre PCI DSS: la versión **4.0.1**, publicada el 11 de junio de 2024, revirtió la redacción de la 4.0 para que el plazo de un mes aplique a vulnerabilidades **críticas** y no también a las de severidad alta. Las fuentes secundarias difieren en la numeración exacta del requisito; conviene consultar el documento del PCI Security Standards Council directamente antes de citarlo.

### 21.3 SSVC: la alternativa al puntaje

**SSVC** (Stakeholder-Specific Vulnerability Categorization) fue desarrollado en el Software Engineering Institute de Carnegie Mellon —Spring, Hatleback, Householder, Manion y Shick— y publicado en 2019, con una versión presentada en el Workshop on the Economics of Information Security en 2020. CISA colaboró en su desarrollo y construyó después su propio árbol de decisión.

Su aporte es reemplazar el puntaje numérico por un árbol que produce directamente una acción recomendada: dos vulnerabilidades con idéntica puntuación pueden ser problemas operativos completamente distintos según la exposición del activo y la existencia de explotación observada. SSVC define árboles diferenciados por rol (proveedor vs. implementador); para un sistema de gestión de vulnerabilidades, el árbol relevante es el del **implementador**.

### 21.4 EPSS: la señal probabilística

**EPSS** (Exploit Prediction Scoring System), mantenido por FIRST, es un modelo de aprendizaje automático que estima la probabilidad de que un CVE publicado sea explotado en los treinta días siguientes. Publica un valor entre 0 y 1 con percentiles, actualizado a diario para todos los CVE, accesible de forma abierta por API y por archivos CSV. La **versión 4** fue publicada el 17 de marzo de 2025.

> **Limitación explícita**, según la documentación del propio EPSS: no es un puntaje de riesgo completo. No estima el daño que causaría una explotación exitosa, no conoce qué activos opera la organización, y no contempla controles compensatorios ni ningún factor específico del entorno. Provee únicamente el componente de probabilidad de amenaza. El modelo se revisa con frecuencia y la versión vigente cambia — toda cita debe indicar versión y fecha de consulta.

Para el diseño de plazos, la combinación habitual es **KEV como señal de explotación confirmada, EPSS como señal de probabilidad para lo que no está en KEV, y el contexto propio del activo como modulador**. Esa combinación es, en esencia, lo que la BOD 26-04 formalizó.

---

## 22. Ámbito regional (Argentina)

Ninguno de los marcos internacionales consultados menciona normativa argentina o latinoamericana directamente. El panorama regulatorio argentino se movió de forma significativa hacia mediados de 2026:

- **Decisión Administrativa 641/2021 (JGM).** Sigue siendo la norma base: aprueba los Requisitos Mínimos de Seguridad de la Información para los organismos del Sector Público Nacional comprendidos en el inciso a) del artículo 8° de la Ley N.° 24.156, y es obligatoria también para los proveedores que contratan con esos organismos.
- **Decreto 941/2025 (enero de 2026).** Creó el **Centro Nacional de Ciberseguridad (CNC)**, organismo descentralizado bajo la Secretaría de Innovación, Ciencia y Tecnología de la Jefatura de Gabinete, con carácter de órgano rector en ciberseguridad para el Sector Público Nacional. Reemplaza en ese rol a la Dirección Nacional de Ciberseguridad.
- **Disposición CNC 1/2026 (mayo de 2026).** Primera norma dictada por el CNC: aprueba el Reglamento Técnico de Planes de Contingencia y Centros de Procesamiento de Datos de Respaldo. Fija plazos de recuperación (RTO/RPO) por nivel de criticidad del sistema —por ejemplo, RTO menor a 4 horas para criticidad alta— y da 180 días a los organismos alcanzados para adecuarse. No trata directamente la gestión de vulnerabilidades, pero confirma el patrón: el CNC está emitiendo reglamentos técnicos sucesivos con plazos concretos, y uno específico sobre remediación de vulnerabilidades es una extensión natural y esperable de esa línea de trabajo.
- **Resolución SIGEN 168/2026 (mayo de 2026).** La Sindicatura General de la Nación reemplazó su política de seguridad informática de 2011 por una nueva, alineada a la Decisión Administrativa 641/2021 — evidencia de que la adopción de esa norma base sigue activa y expandiéndose.

Para antecedentes académicos regionales, los repositorios institucionales —el de UTN y el SEDICI de la Universidad Nacional de La Plata, entre otros— permiten localizar trabajos del área.

> **Ninguna de estas normas prescribe hoy un modelo de datos ni un ciclo de vida para el tracking de remediación** — siguen sin existir en Argentina, igual que a nivel internacional. Lo que aportan es autoridad de referencia local concreta y vigente: mencionar al CNC como órgano rector actual (no la Dirección Nacional de Ciberseguridad, ya reemplazada) y citar la Decisión Administrativa 641/2021 como norma base obligatoria es lo que un lector puede verificar en el Boletín Oficial en un minuto.

**Lo que conviene no citar:** la documentación de proveedores comerciales de gestión de vulnerabilidades define métricas operativas con precisión y es útil para entender el problema, pero es material comercial. Sirve para formarse criterio, no como respaldo bibliográfico.

---

## 23. Glosario [Agregado]

Ninguno de los tres documentos originales trae un glosario consolidado; se agrega aquí porque los tres usan de forma intercambiable una cantidad grande de siglas.

| Término | Significado |
|---|---|
| **MTTR** | Mean Time To Remediate — tiempo medio de remediación. |
| **MTTD** | Mean Time To Detect — tiempo medio de detección. |
| **MTTV** | Mean Time To Verify — tiempo medio de verificación. |
| **SLA** | Service Level Agreement — plazo comprometido de resolución. |
| **CVE** | Common Vulnerabilities and Exposures — identificador público de una vulnerabilidad. |
| **CVSS** | Common Vulnerability Scoring System — puntaje de severidad técnica. |
| **CWE** | Common Weakness Enumeration — clasificación de tipos de debilidad de software. |
| **KEV** | Known Exploited Vulnerabilities — catálogo de CISA de vulnerabilidades con explotación confirmada. |
| **EPSS** | Exploit Prediction Scoring System — probabilidad estimada de explotación en 30 días (FIRST). |
| **SSVC** | Stakeholder-Specific Vulnerability Categorization — árbol de decisión de priorización (SEI/Carnegie Mellon). |
| **VEX** | Vulnerability Exploitability eXchange — vocabulario normalizado de estados de explotabilidad (CISA). |
| **SBOM** | Software Bill of Materials — inventario formal de componentes de software. |
| **GHSA** | GitHub Security Advisories — base de datos de asesorías de seguridad de GitHub. |
| **OSV** | Open Source Vulnerability — formato de esquema JSON para asesorías de código abierto. |
| **CNA** | CVE Numbering Authority — entidad autorizada a asignar identificadores CVE. |
| **NVD** | National Vulnerability Database — base de datos de vulnerabilidades del NIST. |
| **BOD** | Binding Operational Directive — directiva vinculante de CISA para agencias federales de EE. UU. |
| **SAST / DAST** | Static / Dynamic Application Security Testing — análisis estático/dinámico de seguridad de aplicaciones. |
| **SOC** | Security Operations Center. |
| **CISO** | Chief Information Security Officer. |
| **RTO / RPO** | Recovery Time/Point Objective — objetivos de tiempo y punto de recuperación ante incidentes. |

---

## 24. Cómo usar este documento

1. **Ubicar el nivel de madurez de verificación** (Sección 10.1). Es la decisión más informativa y condiciona todas las demás.
2. **Recorrer la lista de verificación** (Sección 20). Por sí o por no, anotando dónde está implementado cada sí.
3. **Contrastar cada métrica reportada contra la tabla de dependencias** (Sección 13.2). ¿Existe el timestamp que la fórmula necesita, y hay algo que lo estampe? Si no, la métrica no es calculable aunque la consulta esté escrita.
4. **Revisar los antipatrones** (Sección 19). Son los puntos que un lector externo verifica rápido.
5. **Mirar el modelo de datos de una herramienta real**, con las tres preguntas de la Sección 18.3. Es lo que confirma si el modelo propuesto se sostiene en la práctica.
6. **Recién entonces decidir el alcance.** Con el diagnóstico hecho, la pregunta deja de ser abstracta y pasa a ser una elección entre elementos concretos con costos conocidos.

---

## 25. Mapa de fuentes primarias

Dónde conseguir cada fuente, y qué buscar en ella. Todas son de acceso gratuito salvo donde se indica.

### 25.1 Estándares y guías

| Fuente | Qué buscar | Dónde |
|---|---|---|
| NIST SP 800-40 Rev. 4 | La definición del proceso completo, con la verificación incluida. Documento corto. | csrc.nist.gov y nvlpubs.nist.gov |
| NIST SP 1800-31 | El compañero práctico del anterior: implementación real, no planificación. Poco citado. | nccoe.nist.gov |
| NIST SP 800-53, SI-2 y RA-5 | SI-2(2) estado automatizado, SI-2(3) medición del tiempo de remediación, SI-2(7) análisis de causa raíz. | csrc.nist.gov, versión 5.2.0 |
| CIS Controls v8.1, Control 7 | Safeguards 7.1, 7.2 y 7.7. Y el 16.2, que menciona explícitamente un sistema de tracking con métricas temporales. | cisecurity.org |
| CISA BOD 26-04, Apéndice A | La Tabla 1 con las dieciséis combinaciones y los cinco niveles de plazo. | cisa.gov |
| CISA, documentos de VEX | Los cuatro estados y las justificaciones del estado «no afectado». | cisa.gov |
| ISO/IEC 27002:2022, control 8.8 | Gestión de vulnerabilidades técnicas. Acceso pago. | iso.org |
| PCI DSS v4.0.1, requisito 6.3 | Los plazos de parcheo. Verificar numeración en el documento original. | pcisecuritystandards.org |

### 25.2 Literatura y datos empíricos

| Fuente | Qué buscar | Dónde |
|---|---|---|
| SEI, Carnegie Mellon | Todo SSVC y el trabajo previo sobre las limitaciones de CVSS. | resources.sei.cmu.edu |
| Cyentia Institute | La serie *Prioritization to Prediction*, volúmenes 3 y 4 en particular. | library.cyentia.com |
| SANS Institute | El modelo de madurez y su herramienta de autoevaluación. | sans.org |
| FIRST | Documentación de EPSS y especificación de CVSS. | first.org |
| arXiv | Revisiones recientes sobre priorización de vulnerabilidades y sistemas de scoring. | arxiv.org |
| IEEE Xplore, ACM DL, Springer | Literatura con revisión por pares. Verificar acceso institucional. | Bibliotecas institucionales |

### 25.3 Implementaciones de referencia

| Proyecto | Qué buscar | Dónde |
|---|---|---|
| OWASP Dependency-Track | El modelo de hallazgos, el historial de auditoría, el manejo de hallazgos inactivos y el soporte de VEX. | dependencytrack.org y su repositorio |
| OWASP DefectDojo | El modelo de findings: deduplicación, aceptación de riesgo con vencimiento, mitigación, reapertura. | defectdojo.org y su repositorio |

### 25.4 GHSA / OSV

| Fuente | Qué buscar | Dónde |
|---|---|---|
| GitHub Docs | About the GitHub Advisory Database. | docs.github.com |
| `github/advisory-database` | El repositorio de asesorías. | github.com |
| OSV schema | Especificación del formato Open Source Vulnerability. | ossf.github.io/osv-schema |

---

## 26. Referencias

Verificadas contra su publicación original el 14 de agosto de 2026 (salvo las incorporadas por este documento unificado, que corresponden a las fuentes 2 y 3 mencionadas en la nota de consolidación).

- Center for Internet Security. (2024). *CIS Critical Security Controls*, versión 8.1. https://www.cisecurity.org/controls
- Cybersecurity and Infrastructure Security Agency. (2026). *Binding Operational Directive 26-04: Prioritizing security updates based on risk*. U.S. Department of Homeland Security. https://www.cisa.gov/news-events/directives/bod-26-04-prioritizing-security-updates-based-risk
- Cybersecurity and Infrastructure Security Agency. (2022). *Vulnerability Exploitability eXchange (VEX) — Use cases*. U.S. Department of Homeland Security.
- Cybersecurity and Infrastructure Security Agency. (2022). *Vulnerability Exploitability eXchange (VEX) — Status justifications*. U.S. Department of Homeland Security.
- Cybersecurity and Infrastructure Security Agency. (s. f.). *Stakeholder-Specific Vulnerability Categorization (SSVC)*. U.S. Department of Homeland Security.
- Cyentia Institute y Kenna Security. (2019). *Prioritization to prediction, volume 3: Winning the remediation race*. https://library.cyentia.com/report/report_002993.html
- Cyentia Institute y Kenna Security. (2019). *Prioritization to prediction, volume 4: Measuring what matters in remediation*.
- Forum of Incident Response and Security Teams. (2025). *Exploit Prediction Scoring System (EPSS)* [versión 4, publicada el 17 de marzo de 2025]. https://www.first.org/epss/
- International Organization for Standardization e International Electrotechnical Commission. (2022). *ISO/IEC 27002:2022 — Information security, cybersecurity and privacy protection: Information security controls*. Control 8.8.
- OWASP Foundation. (s. f.). *Dependency-Track*. https://owasp.org/www-project-dependency-track/ y https://docs.dependencytrack.org
- OWASP Foundation. (s. f.). *DefectDojo*. https://www.defectdojo.org
- PCI Security Standards Council. (2024). *Payment Card Industry Data Security Standard*, versión 4.0.1. Publicado el 11 de junio de 2024.
- Risto, J. y Hazar, D. (2020). *Vulnerability management maturity model*. SANS Institute. https://www.sans.org/blog/vulnerability-management-maturity-model
- Ross, R. y Pillitteri, V. (2020). *Security and privacy controls for information systems and organizations* (NIST Special Publication 800-53 Rev. 5). Release 5.2.0 publicada el 27 de agosto de 2025. https://doi.org/10.6028/NIST.SP.800-53r5
- Souppaya, M. y Scarfone, K. (2022). *Guide to enterprise patch management planning: Preventive maintenance for technology* (NIST Special Publication 800-40 Rev. 4). https://doi.org/10.6028/NIST.SP.800-40r4
- Spring, J. M., Hatleback, E., Householder, A. D., Manion, A. y Shick, D. (2019). *Prioritizing vulnerability response: A stakeholder-specific vulnerability categorization* [White paper]. Software Engineering Institute, Carnegie Mellon University.
- Spring, J. M., Hatleback, E., Householder, A. D., Manion, A. y Shick, D. (2020). *Prioritizing vulnerability response: A stakeholder-specific vulnerability categorization*. Workshop on the Economics of Information Security (WEIS), Bruselas, Bélgica.
- GitHub, Inc. (s. f.). *About the GitHub Advisory Database*. GitHub Docs.
- GitHub, Inc. (s. f.). `github/advisory-database` [repositorio].
- Open Source Security Foundation. (s. f.). *Open Source Vulnerability (OSV) format specification*. https://ossf.github.io/osv-schema/
- Jefatura de Gabinete de Ministros. (2021). *Decisión Administrativa 641/2021: Requisitos mínimos de seguridad de la información para los organismos del Sector Público Nacional*. Boletín Oficial de la República Argentina.
- Poder Ejecutivo Nacional. (2025). *Decreto 941/2025: Creación del Centro Nacional de Ciberseguridad*. Boletín Oficial de la República Argentina.
- Centro Nacional de Ciberseguridad. (2026). *Disposición 1/2026: Reglamento Técnico de Planes de Contingencia y Centros de Procesamiento de Datos de Respaldo*. Boletín Oficial de la República Argentina, 13 de mayo de 2026.

---

## 27. Anexo — Registro de contraste entre marcos (material interno, no citable)

> **Uso de este anexo:** material de trabajo interno del documento fuente. Documenta el contraste realizado por el autor del marco de referencia contra tres marcos elaborados de forma independiente por otros sistemas de IA, para recuperar lo válido y no heredar lo erróneo. **No es material citable** ni corresponde incorporarlo a un informe académico o de auditoría — se conserva acá únicamente como referencia de control de calidad interno.

### 27.1 Aportes incorporados

| Aporte | Dónde se incorporó | Verificación |
|---|---|---|
| Separación entre vulnerabilidad, exposición, hallazgo y caso de remediación. | Sección 4 | Concepto sólido, consistente con el modelo de datos de las herramientas reales. |
| CIS Control 7 y Safeguard 7.7 como anclaje normativo. | Secciones 3 y 25 | Verificado. Ver salvedad en 27.3. |
| Modelo de madurez de SANS como referencia institucional. | Sección 15 | Verificado: Risto y Hazar, cinco niveles, cinco dominios. |
| NIST SP 800-53, control SI-2 y sus mejoras. | Secciones 3, 9 y 25 | Verificado. SI-2(3) exige medir el tiempo entre identificación y remediación. |
| Escala de fuerza de la evidencia. | Sección 8.3 | Ordenación técnica útil. Se declara como no normativa. |
| Familias de métricas: actividad, resultado, riesgo. | Sección 13.1 | Distinción metodológicamente valiosa. |
| Registro de auditoría inmutable como componente propio. | Sección 12 | Confirmado empíricamente por el diseño de Dependency-Track. |
| Plazo dinámico que se recalcula al cambiar las variables. | Sección 9.2 | Consecuencia lógica del modelo de la BOD 26-04. |
| Tasa de eficacia de remediación: comprobadas sobre declaradas. | Sección 13.2 | Métrica válida y poco habitual. Mide calidad, no velocidad. |
| Caducidad obligatoria de la aceptación de riesgo. | Secciones 8 y 16 | Confirmado por el modelo de DefectDojo. |
| Identidad del hallazgo compuesta con la ubicación. | Sección 7.1 | Confirmado por la práctica de las herramientas reales. |
| Distinción entre remediación y mitigación. | Sección 8.1 | Correcta y relevante para el modelo de estados. |

### 27.2 Errores detectados en los marcos contrastados

Se listan porque son los que se verifican rápido, y porque tres de ellos aparecen en más de un marco.

| Error | Corrección |
|---|---|
| Presentar la BOD 22-01 como directiva vigente, con plazos obligatorios de remediación. Aparece en los tres marcos. | Revocada por la BOD 26-04 el 10 de junio de 2026, junto con la BOD 19-02. |
| Fechar NIST SP 800-40 Rev. 4 en 2019 y atribuirle el título «Guide to Enterprise Patch Management Technologies». | La Rev. 4 es de abril de 2022 y se titula «Guide to Enterprise Patch Management Planning». Ese otro título corresponde a la Rev. 3, de 2013. |
| Calificar a NIST SP 800-40 como «normativo en EE. UU.». | Es una guía metodológica. No es obligación legal general. |
| Citar «Shevelyov, 2026» y «Friedrich, 2026» como literatura académica sobre métricas de MTTR. | No se pudo verificar la existencia de esas referencias. Tienen las características típicas de una cita fabricada. |
| Atribuir a un «CISA & Cybersecurity Division Data Analysis (2023-2025)» cifras concretas de MTTR global. | No identifica una publicación concreta y no se pudo verificar. No usar. |
| Afirmar que EPSS reduce la carga de parcheo «hasta en un 75%». | Cifra sin fuente identificable en la documentación de EPSS. |
| Citar EPSS en su versión 3 (2023) como vigente. | La versión 4 fue publicada el 17 de marzo de 2025. |
| Fechar la directiva NIS2 en 2023. | Directiva (UE) 2022/2555, de diciembre de 2022. |
| Citar PCI DSS v4.0 como versión vigente. | La versión vigente es la v4.0.1, del 11 de junio de 2024, que además modificó el alcance del plazo de parcheo. |
| Presentar CVSS v4.0 como reemplazo consolidado de v3.1 para priorización de plazos. | Es correcto que v4.0 es de noviembre de 2023, pero la BOD 26-04 descartó CVSS como señal única de programación de plazos. |

### 27.3 Salvedad sobre CIS Safeguard 7.7

Uno de los marcos contrastados atribuye al Safeguard 7.7 la comparación entre resultados de evaluaciones para determinar qué vulnerabilidades continúan presentes. El texto del safeguard es más simple: exige remediar las vulnerabilidades detectadas mediante procesos y herramientas, con frecuencia mensual o mayor, conforme al proceso de remediación. La comparación entre evaluaciones aparece en la especificación de evaluación de los controles, como método de medición, **no en el texto del safeguard**. La distinción importa si se cita: conviene citar el texto del safeguard por un lado y la especificación de evaluación por otro.

### 27.4 Lectura general del ejercicio

El contraste rindió: se recuperaron doce aportes válidos, varios de los cuales mejoran sustantivamente el marco original —en particular el componente de auditoría, la separación entre las cuatro entidades y la tasa de eficacia de remediación. También confirmó el riesgo principal de usar marcos generados por IA como fuente directa sin verificación: de los tres contrastados, uno presentó referencias no verificables y errores de fecha y título en una fuente central; otro presentó cifras estadísticas sin publicación identificable; los tres presentaron como vigente una directiva revocada dos meses antes.

> **Conclusión operativa:** ninguna referencia proveniente de un marco generado por IA —incluido este documento— debería incorporarse a una bibliografía sin verificación contra la publicación original.
