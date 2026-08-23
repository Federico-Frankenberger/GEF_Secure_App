# Prompt para Claude — Landing Page Comercial de GEF Secure

## Rol

Actuá como un **Senior Frontend Developer, Product Designer UX/UI y especialista en productos SaaS B2B de ciberseguridad**.

Tenés acceso al código completo del proyecto.

Tu objetivo es analizar el frontend existente y diseñar e implementar una **web pública comercial profesional para GEF Secure**, de manera que el proyecto deje de ingresar directamente al login y pase a presentarse como un producto real que podría comercializarse.

---

## Contexto del producto

GEF Secure es una plataforma orientada a la **gestión, detección, seguimiento y notificación de vulnerabilidades de seguridad asociadas a activos y software de una organización**.

Actualmente el sistema ya posee una aplicación funcional y el frontend ingresa directamente al login.

Queremos evolucionar esto hacia una estructura similar a un SaaS profesional:

```text
Usuario
   │
   ▼
Landing Page pública
   │
   ├── Producto
   ├── Funcionalidades
   ├── Cómo funciona
   ├── Seguridad
   ├── Casos de uso
   ├── FAQ
   ├── Contacto / Demo
   │
   └── Iniciar sesión
           │
           ▼
       Plataforma GEF Secure
```

La landing page no debe ser simplemente decorativa.

Debe **explicar, demostrar y vender el producto**.

---

## Primera etapa — Analizar el proyecto

Antes de modificar código, analizá completamente el frontend actual.

Identificá:

- framework utilizado;
- arquitectura;
- sistema de rutas;
- componentes;
- layouts;
- sistema de estilos;
- colores;
- tipografías;
- iconografía;
- componentes reutilizables;
- autenticación;
- página de login;
- rutas protegidas;
- dashboard;
- funcionalidades reales disponibles;
- terminología utilizada en la plataforma;
- identidad visual existente.

No inventes funcionalidades que el sistema no posea.

La landing comercial debe representar correctamente el producto real.

---

## Objetivo principal

Modificar la experiencia inicial del sistema.

Actualmente:

```text
/
↓
Login
```

Debe quedar:

```text
/
↓
Landing Page pública
```

Y el login debe permanecer disponible mediante:

```text
/login
```

La aplicación autenticada debe continuar funcionando exactamente como hasta ahora.

---

## Principio fundamental

La landing debe responder rápidamente estas preguntas:

1. ¿Qué es GEF Secure?
2. ¿Qué problema resuelve?
3. ¿Para quién está pensado?
4. ¿Cómo funciona?
5. ¿Qué ventajas ofrece?
6. ¿Qué puede hacer el sistema?
7. ¿Por qué debería interesarle a una empresa?
8. ¿Cómo puedo probarlo?
9. ¿Cómo ingreso si ya soy usuario?

Un visitante debería comprender el producto en aproximadamente **30-60 segundos de navegación**.

---

## Posicionamiento del producto

La comunicación debe presentar a GEF Secure como una plataforma de:

> Gestión continua de vulnerabilidades y exposición tecnológica.

El mensaje debe estar orientado principalmente a:

- empresas;
- equipos de IT;
- responsables de infraestructura;
- responsables de seguridad;
- DevOps;
- administradores de sistemas;
- pequeñas y medianas organizaciones;
- equipos que actualmente controlan vulnerabilidades de manera manual.

El lenguaje debe ser profesional pero comprensible.

Evitar excesivo lenguaje técnico en las primeras secciones.

---

# Landing Page

## 1. Header / Navbar

Debe incluir:

- Logo GEF Secure
- Producto
- Funcionalidades
- Cómo funciona
- Seguridad
- FAQ
- Contacto
- Iniciar sesión
- Solicitar demo

El navbar puede utilizar navegación mediante anchors dentro de la página.

Debe ser responsive.

Preferentemente sticky/fixed cuando tenga sentido UX.

---

## 2. Hero principal

Debe ser el sector visualmente más importante.

Debe comunicar inmediatamente el propósito del producto.

Ejemplo conceptual:

### Gestioná vulnerabilidades antes de que se conviertan en incidentes.

GEF Secure centraliza tus activos tecnológicos, detecta vulnerabilidades conocidas y te ayuda a priorizar y realizar su seguimiento desde una única plataforma.

CTA principal:

```text
Solicitar demo
```

CTA secundario:

```text
Ver cómo funciona
```

Agregar también acceso visible a:

```text
Iniciar sesión
```

No copies necesariamente estos textos literalmente.

Adaptalos al producto real después de analizarlo.

---

## 3. Representación visual del producto

Una landing SaaS necesita mostrar el producto.

Crear una sección donde se pueda visualizar el dashboard real o una representación basada en los componentes existentes.

Por ejemplo:

```text
┌─────────────────────────────────────────┐
│ GEF Secure                              │
├─────────────────────────────────────────┤
│                                         │
│ Vulnerabilidades críticas     12        │
│ Vulnerabilidades altas        28        │
│ Activos monitoreados          41        │
│                                         │
│ Riesgo por severidad                    │
│ ███████ Critical                        │
│ █████ High                              │
│ ███ Medium                              │
│                                         │
└─────────────────────────────────────────┘
```

Si existen componentes reales reutilizables del dashboard, evaluar si pueden utilizarse visualmente sin comprometer autenticación ni lógica interna.

No mostrar información sensible.

---

## 4. Problema

Explicar qué problema existe actualmente en muchas organizaciones.

Ejemplos:

- infraestructura con múltiples activos;
- software instalado difícil de controlar;
- nuevas vulnerabilidades publicadas constantemente;
- seguimiento manual mediante planillas;
- dificultad para saber qué vulnerabilidad afecta a qué activo;
- falta de priorización;
- falta de trazabilidad;
- exceso de alertas;
- información distribuida entre diferentes fuentes.

Presentar primero el problema antes de explicar la solución.

---

## 5. Solución

Presentar GEF Secure como la solución centralizada.

Comunicar conceptos como:

```text
Activos
   ↓
Software
   ↓
Detección de vulnerabilidades
   ↓
Correlación
   ↓
Priorización
   ↓
Alertas
   ↓
Seguimiento
   ↓
Remediación
```

Crear esta sección de manera visual.

---

## 6. Cómo funciona

Crear una sección de aproximadamente 4 pasos.

Por ejemplo:

### 1. Registrá tus activos

Centralizá servidores, equipos y sistemas dentro de la plataforma.

### 2. Identificá el software

GEF Secure relaciona los activos con el software utilizado.

### 3. Detectá vulnerabilidades

La plataforma correlaciona la información con fuentes públicas de vulnerabilidades.

### 4. Gestioná el riesgo

Priorizá, realizá seguimiento y recibí notificaciones cuando sea necesario.

Adaptar completamente estos pasos a la implementación real encontrada en el proyecto.

---

## 7. Funcionalidades

Analizar qué funcionalidades existen realmente y crear cards comerciales para las más importantes.

Posibles ejemplos, únicamente si están implementados:

- Gestión de activos.
- Inventario de software.
- Detección de vulnerabilidades.
- Integración con fuentes de seguridad.
- Priorización.
- Alertas.
- Historial.
- Trazabilidad.
- Dashboard.
- Gestión de usuarios.

No mostrar funcionalidades inexistentes solamente para mejorar comercialmente la landing.

---

## 8. Fuentes de inteligencia

Si el sistema realmente consume fuentes públicas como:

- CISA;
- GitHub Security Advisories;
- NVD;
- CVE;
- otras fuentes;

crear una sección visual explicando que GEF Secure centraliza información proveniente de fuentes reconocidas.

No afirmar certificaciones, acuerdos comerciales ni relaciones oficiales con dichas organizaciones.

Debe quedar claro que son **fuentes de información utilizadas por el sistema**.

---

## 9. Priorización del riesgo

Crear una sección que explique que el objetivo no es solamente detectar vulnerabilidades.

El valor del sistema es ayudar a responder:

```text
¿Qué vulnerabilidades tengo?
¿Qué activos están afectados?
¿Qué tan graves son?
¿Cuáles debería resolver primero?
```

Utilizar visualizaciones, badges de severidad o elementos del diseño existente.

---

## 10. Alertas y monitoreo

Mostrar cómo GEF Secure puede ayudar a transformar información técnica en acciones.

Conceptualmente:

```text
Nueva vulnerabilidad publicada
              ↓
GEF Secure la detecta
              ↓
Correlaciona con software registrado
              ↓
Identifica activos afectados
              ↓
Genera una alerta
              ↓
Equipo de seguridad actúa
```

Crear este flujo visualmente.

---

## 11. Beneficios

Crear una sección enfocada en resultados y no solamente en características.

### Centralización
Una única plataforma para consultar el estado de vulnerabilidades.

### Visibilidad
Comprender qué activos pueden estar expuestos.

### Priorización
Concentrar esfuerzos en los riesgos más importantes.

### Automatización
Reducir controles manuales.

### Trazabilidad
Mantener historial de análisis y decisiones.

### Respuesta
Detectar información relevante más rápidamente.

---

## 12. Casos de uso

Crear algunos casos de uso realistas.

### Equipos de IT
Controlar vulnerabilidades relacionadas con el software utilizado por la organización.

### Equipos de seguridad
Centralizar y priorizar información de vulnerabilidades.

### Infraestructura
Identificar qué activos pueden estar afectados.

### DevOps
Obtener mayor visibilidad sobre tecnologías desplegadas.

No utilizar estadísticas comerciales inventadas.

---

## 13. Seguridad

Crear una sección específica explicando conceptos de seguridad del producto que efectivamente estén implementados.

Analizar:

- autenticación;
- autorización;
- roles;
- manejo de sesiones;
- JWT;
- HTTPS si corresponde al despliegue;
- protección de rutas;
- auditoría;
- trazabilidad;
- almacenamiento de credenciales;
- permisos.

No afirmar certificaciones que el proyecto no posea, como:

- ISO 27001
- SOC 2
- GDPR compliant
- HIPAA

---

## 14. Arquitectura conceptual

Incluir una representación simplificada para clientes técnicos.

```text
Infraestructura
      │
      ▼
    Activos
      │
      ▼
Software detectado
      │
      ▼
GEF Secure
      │
      ├── Vulnerabilidades
      ├── Priorización
      ├── Alertas
      └── Seguimiento
```

Debe ser entendible sin mostrar detalles internos sensibles.

---

## 15. FAQ

Crear aproximadamente 6-8 preguntas frecuentes.

Ejemplos:

- ¿Qué es GEF Secure?
- ¿Necesito instalar un agente?
- ¿Qué fuentes de vulnerabilidades utiliza?
- ¿Cómo se relacionan las vulnerabilidades con mis activos?
- ¿GEF Secure reemplaza un antivirus?
- ¿Puedo utilizarlo en múltiples activos?
- ¿Cada cuánto se actualiza la información?
- ¿Cómo puedo probar la plataforma?

Responder únicamente según la arquitectura real.

---

## 16. CTA comercial final

Crear una sección final clara.

```text
Conocé el estado de seguridad de tu infraestructura.

Centralizá activos, vulnerabilidades y alertas
desde una única plataforma.

[ Solicitar demo ]
[ Iniciar sesión ]
```

---

## 17. Footer

Debe contener como mínimo:

```text
GEF Secure

Producto
- Funcionalidades
- Cómo funciona
- Seguridad

Recursos
- FAQ
- Documentación

Empresa
- Contacto

Legal
- Privacidad
- Términos
```

No crear páginas legales con afirmaciones jurídicas falsas.

Si no existen, pueden quedar preparados los enlaces o rutas para implementación futura.

---

# Página de login

Mantener el login existente pero evaluar si puede integrarse mejor visualmente con la nueva identidad pública.

La ruta `/login` debe seguir siendo completamente funcional.

Desde la landing, **Iniciar sesión** debe llevar al login.

Desde el login sería conveniente ofrecer:

```text
← Volver a GEF Secure
```

para regresar a la landing.

---

# Rutas

Evaluar el router existente y dejar conceptualmente una estructura equivalente a:

```text
/                   Landing pública
/login              Login
/app                 Aplicación
/dashboard           Dashboard
/assets              Activos
/vulnerabilities     Vulnerabilidades
/settings            Configuración
...
```

NO modificar innecesariamente las rutas internas existentes.

Priorizar compatibilidad hacia atrás.

---

# Diseño

El diseño debe transmitir:

- ciberseguridad;
- confianza;
- tecnología;
- profesionalismo;
- claridad;
- modernidad.

Inspiración conceptual:

- SaaS B2B moderno;
- plataformas de seguridad;
- dashboards tecnológicos;
- diseño minimalista;
- interfaces enterprise.

Evitar el típico diseño genérico generado por IA.

No abusar de:

- gradients;
- glassmorphism;
- animaciones;
- tarjetas;
- sombras;
- efectos neon;
- iconos sin propósito.

---

# UX/UI

Aplicar buenas prácticas:

- jerarquía visual clara;
- buena legibilidad;
- navegación simple;
- CTA visibles;
- responsive design;
- accesibilidad;
- contraste adecuado;
- estados hover/focus;
- navegación mediante teclado;
- HTML semántico;
- performance;
- mobile first cuando corresponda.

---

# Responsive

La landing debe funcionar correctamente como mínimo en:

```text
Desktop
1440px
1280px

Tablet
768px

Mobile
390px
375px
```

No debe existir overflow horizontal.

---

# Animaciones

Se pueden utilizar animaciones ligeras.

Por ejemplo:

- aparición progresiva al hacer scroll;
- hover de cards;
- transiciones;
- pequeñas animaciones del dashboard;
- indicadores dinámicos.

Evitar efectos exagerados.

La percepción debe seguir siendo profesional.

---

# SEO

Preparar correctamente:

```html
<title>
<meta name="description">
<meta property="og:title">
<meta property="og:description">
<meta property="og:type">
```

Utilizar un title similar a:

```text
GEF Secure | Gestión y monitoreo de vulnerabilidades
```

Optimizar headings H1, H2 y H3, manteniendo una única jerarquía semántica coherente.

---

# Performance

Evitar:

- imágenes gigantes;
- dependencias innecesarias;
- animaciones pesadas;
- librerías completas para solucionar cosas simples.

Reutilizar dependencias existentes cuando sea posible.

---

# Arquitectura del frontend

No crear todo dentro de un único archivo.

Separar correctamente componentes.

Ejemplo conceptual:

```text
src/
├── pages/
│   ├── Landing/
│   │   ├── LandingPage
│   │   └── ...
│
├── components/
│   └── landing/
│       ├── Navbar
│       ├── Hero
│       ├── ProductPreview
│       ├── ProblemSection
│       ├── SolutionSection
│       ├── FeaturesSection
│       ├── WorkflowSection
│       ├── SecuritySection
│       ├── UseCasesSection
│       ├── FAQSection
│       ├── CTASection
│       └── Footer
```

Adaptar esta estructura a las convenciones reales del proyecto.

---

# Reutilización

Antes de crear componentes nuevos, verificar si ya existen:

- buttons;
- badges;
- cards;
- modal;
- typography;
- colors;
- icons;
- layouts.

Reutilizar el Design System existente cuando sea razonable.

---

# Contenido

No utilizar Lorem Ipsum.

Crear textos comerciales reales y coherentes con GEF Secure.

Los textos deben ser:

- claros;
- breves;
- profesionales;
- técnicamente correctos;
- orientados al beneficio.

Evitar afirmaciones exageradas como:

- Protección garantizada.
- 100% seguro.
- Elimina todos los riesgos.
- La mejor plataforma del mercado.
- Protección total.

Una plataforma de gestión de vulnerabilidades reduce riesgo; no puede prometer seguridad absoluta.

---

# Conversión comercial

La landing debe estar preparada conceptualmente para futuras acciones como:

```text
Solicitar demo
Contactar
Crear cuenta
Hablar con ventas
```

Si todavía no existe backend para formularios comerciales, NO crear APIs ficticias.

Se puede:

- preparar visualmente el formulario;
- crear componentes;
- dejar comentarios TODO;
- utilizar navegación temporal.

---

# Demo del producto

Analizar si sería conveniente incluir una sección:

```text
Ver GEF Secure en acción
```

con previews del sistema.

Si existen dashboards, gráficos o vistas interesantes dentro del proyecto, reutilizar su diseño para crear una demostración visual pública sin exponer información privada.

---

# Tarea adicional — análisis comercial

Mientras analizás el sistema, identificar funcionalidades reales que tengan alto valor comercial pero que actualmente no estén bien comunicadas.

Crear al finalizar una sección del informe:

```text
Oportunidades comerciales detectadas
```

Indicando:

- funcionalidad;
- beneficio para el cliente;
- cómo debería comunicarse;
- dónde debería aparecer en la landing.

---

# No hacer

No:

- romper autenticación;
- eliminar el login actual;
- modificar backend sin necesidad;
- inventar endpoints;
- inventar funcionalidades;
- inventar clientes;
- inventar métricas;
- inventar certificaciones;
- inventar integraciones;
- cambiar toda la identidad visual sin justificación;
- agregar dependencias innecesarias;
- reestructurar partes del proyecto no relacionadas.

---

# Antes de implementar

Generá primero un breve análisis que contenga:

## 1. Estado actual

Cómo funciona actualmente el frontend.

## 2. Funcionalidades detectadas

Qué puede mostrar comercialmente GEF Secure.

## 3. Propuesta de landing

Secciones recomendadas.

## 4. Arquitectura

Qué archivos crearías o modificarías.

## 5. Riesgos

Qué partes podrían afectar autenticación/routing.

Después de ese análisis, procedé directamente con la implementación.

No solicites confirmación salvo que exista una decisión que técnicamente no pueda resolverse analizando el proyecto.

---

# Después de implementar

Realizar una revisión completa.

## Routing

Verificar que `/` abra la landing, `/login` abra el login y las rutas privadas sigan funcionando.

## Autenticación

Un usuario no autenticado no puede acceder a rutas privadas.

Un usuario autenticado puede continuar utilizando normalmente el sistema.

## Responsive

Revisar desktop, tablet y mobile.

## Código

Ejecutar si están disponibles:

```bash
npm run lint
npm run build
npm run test
```

o los comandos equivalentes encontrados en el proyecto.

Corregir cualquier error provocado por la implementación.

---

# Entrega final

Al finalizar presentar:

## Cambios realizados

Resumen de implementación.

## Archivos creados

Listado.

## Archivos modificados

Listado.

## Nueva arquitectura de navegación

Explicar el flujo:

```text
Landing → Login → Aplicación
```

## Funcionalidades mostradas comercialmente

Listado de las capacidades reales utilizadas en la landing.

## UX/UI

Decisiones principales de diseño.

## Oportunidades comerciales detectadas

Posibles mejoras futuras.

## Pendientes

Elementos que requerirían backend o decisiones comerciales futuras, por ejemplo:

- formulario de contacto;
- solicitud de demo;
- registro;
- pricing;
- analítica;
- CRM;
- email comercial.

---

# Resultado esperado

El objetivo final es que al ingresar al dominio de GEF Secure un visitante no vea simplemente:

```text
Login
```

sino que perciba inmediatamente que está entrando al sitio de un **producto de ciberseguridad real, profesional y potencialmente comercializable**.

La experiencia debe ser:

```text
Descubrir
   ↓
Entender
   ↓
Ver el producto
   ↓
Comprender el valor
   ↓
Confiar
   ↓
Solicitar demo / Iniciar sesión
```

Implementá la solución manteniendo intacta la funcionalidad existente del sistema.
