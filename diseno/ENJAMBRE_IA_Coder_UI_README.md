# ENJAMBRE — Especificación Visual y UX

Documento base para diseñar la aplicación **ENJAMBRE**, integrada como herramienta dentro del ecosistema **Obsidia Studio**.

El objetivo de este README es describir la interfaz visual, el flujo de uso, los apartados principales, botones, estados, tarjetas y componentes necesarios para construir un dashboard consistente con las imágenes conceptuales generadas.

---

## 1. Concepto general

**Nombre del producto:** ENJAMBRE  
**Submarca:** by Obsidia Studio  
**Tagline:** Tu equipo de IAs trabajando en paralelo.

ENJAMBRE es una plataforma local-first para coordinar múltiples agentes de IA especializados en desarrollo de software. El usuario puede conectar API keys, registrar agentes, abrir proyectos locales o repositorios GitHub, lanzar tareas, revisar chats paralelos, comparar respuestas, monitorear tokens y ver logs en tiempo real.

La idea visual debe comunicar:

- IA colectiva.
- Orquestación de agentes.
- Trabajo paralelo.
- Control local.
- Privacidad.
- Herramienta técnica premium.
- Dashboard serio, oscuro, futurista y productivo.

---

## 2. Identidad visual

### 2.1 Paleta principal

| Uso | Color | Hex |
|---|---|---|
| Fondo principal | Negro obsidiana | `#050509` |
| Fondo de panel | Azul-negro profundo | `#080D16` |
| Panel elevado | Grafito oscuro | `#0D111C` |
| Borde de panel | Violeta muy oscuro | `#211338` |
| Morado principal | Morado eléctrico | `#8B5CF6` |
| Morado oscuro | Violeta profundo | `#4A2C7D` |
| Ámbar IA | Dorado/ámbar | `#FFB020` |
| Ámbar hover | Ámbar brillante | `#FFC637` |
| Verde estado activo | Verde sistema | `#22C55E` |
| Azul agente | Azul técnico | `#3B82F6` |
| Rojo error | Rojo alerta | `#EF4444` |
| Texto principal | Blanco frío | `#F8FAFC` |
| Texto secundario | Gris acero | `#94A3B8` |
| Texto tenue | Gris oscuro | `#64748B` |

### 2.2 Uso de color por función

- **Morado:** identidad principal de ENJAMBRE, navegación, selección, bordes activos, iconos de agente.
- **Ámbar:** acción principal, núcleo del enjambre, botón “Lanzar Enjambre”, estados importantes.
- **Verde:** sistema activo, API validada, agente en línea, tarea completada.
- **Azul:** archivos, código, integración técnica.
- **Rojo:** errores, API inválida, tarea fallida.
- **Gris:** estados pendientes, inactivos o deshabilitados.

### 2.3 Estilo general

- Fondo oscuro casi negro.
- Paneles con bordes sutiles.
- Glow muy controlado en morado y ámbar.
- Esquinas redondeadas.
- Íconos lineales.
- Tipografía geométrica/futurista para marca.
- Tipografía clara y moderna para UI.
- Nada excesivamente gamer; debe sentirse como herramienta profesional.

---

## 3. Estructura global de la app

La app se compone de:

1. **Splash / Loading**
2. **Inicio / Home**
3. **Dashboard principal**
4. **Proyectos**
5. **Chats / Lanzar tarea**
6. **Agentes**
7. **API Keys**
8. **Logs**
9. **Estadísticas**
10. **Ajustes**

La navegación principal debe estar en una sidebar izquierda fija.

---

## 4. Pantalla Splash / Loading

### Objetivo

Mostrar carga inicial mientras se valida el entorno local, API keys y agentes disponibles.

### Layout

Pantalla completa, centrada vertical y horizontalmente.

### Elementos

1. Logo hexagonal de ENJAMBRE.
2. Texto grande: `ENJAMBRE`
3. Subtítulo: `IA Coder`
4. Texto secundario: `by Obsidia Studio`
5. Tagline: `Tu equipo de IAs trabajando en paralelo.`
6. Estado actual:
   - `Inicializando agentes...`
7. Barra de progreso horizontal.
8. Checklist de arranque.

### Checklist inferior

| Estado | Texto |
|---|---|
| Completado | Cargando proyecto local |
| Completado | Verificando API Keys |
| En proceso | Preparando enjambre |

### Estados visuales

- Check verde para pasos completados.
- Spinner morado para paso en proceso.
- Barra de progreso morada con fondo oscuro.
- Núcleo del logo en ámbar brillante.

---

## 5. Pantalla Inicio / Home

### Objetivo

Dar una vista general rápida del estado del usuario y permitir continuar un proyecto o crear uno nuevo.

### Layout

- Sidebar izquierda.
- Header superior.
- Contenido principal con tarjetas.
- Panel derecho de acciones rápidas.

### Sidebar

Debe contener:

```txt
ENJAMBRE
by Obsidia Studio

Inicio
Proyectos
Agentes
Chats
Tareas
Logs
API Keys
Ajustes
```

En la parte inferior:

```txt
Potencia tu enjambre
Conecta más herramientas y desbloquea todo el poder de ENJAMBRE.

[Ir a Ajustes]

Ostadia Team
Pro Plan
```

> Nota: si la marca final será Obsidia, reemplazar “Ostadia” por “Obsidia”.

### Header superior

Elementos:

- Mensaje: `Bienvenido de vuelta, IA Coder 👋`
- Texto secundario: `Tu enjambre está listo para construir, desplegar y escalar soluciones increíbles.`
- Card tokens usados hoy.
- Card estado del sistema.
- Icono de notificaciones.

### Tarjeta principal: Continuar proyecto

Título:

```txt
CONTINUAR PROYECTO
E-Commerce Nexus
```

Contenido:

- Repositorio: `github.com/obsidia-studio/ecommerce-nexus`
- Barra de progreso: `68% completo`
- Botón principal: `Abrir proyecto`
- Métricas:
  - `4 / 5 Agentes activos`
  - `12 Tareas en progreso`
  - `3 Proyectos activos`
  - `2.45M Tokens usados`

### Acciones rápidas

Panel derecho con botones:

```txt
Nuevo proyecto
Conectar GitHub
Lanzar tarea
```

Cada botón debe tener:

- Icono grande.
- Título.
- Descripción corta.
- Flecha a la derecha.

### Métricas inferiores

Tarjetas:

```txt
Agentes activos
4 / 5
80%

API Keys activas
7 / 10
70%

Uso de tokens hoy
2.45M / 10.00M
24%

Costo hoy
$1.82 USD

Tasa de éxito
96.4%
```

### Secciones inferiores

1. Proyectos recientes.
2. Actividad reciente.
3. Conversaciones recientes.
4. Consejo del enjambre.

---

## 6. Dashboard principal del proyecto

### Objetivo

Mostrar el estado completo de un proyecto activo y la actividad de los agentes IA.

### Layout principal

```txt
┌ Sidebar izquierda ┐ ┌ Header superior ┐
│                   │ ├ Métricas        ┤
│ Navegación        │ ├ Proyecto        ┤
│ Proyecto activo   │ ├ Orquestación    ┤
│ API Keys          │ ├ Chats agentes   ┤
│ Agentes           │ ├ Logs / tareas   ┤
└───────────────────┘ └─────────────────┘
```

### Header

Debe incluir:

```txt
Proyecto: E-Commerce Nexus ☆
Repositorio: github.com/obsidia-studio/ecommerce-nexus
[Privado]
```

Acciones:

```txt
[Lanzar Enjambre ▼]
Tokens usados hoy: 2.45M / 10.00M
En línea
Notificaciones
```

### Botón principal: Lanzar Enjambre

- Color: ámbar.
- Texto: `Lanzar Enjambre`
- Icono: Play.
- Flecha desplegable.
- Debe ser el botón más importante de la interfaz.

Estados:

| Estado | Texto |
|---|---|
| Normal | Lanzar Enjambre |
| Ejecutando | Enjambre trabajando... |
| Pausado | Reanudar Enjambre |
| Error | Revisar errores |

### Métricas superiores

Tarjetas horizontales:

```txt
Agentes activos
4 / 5
80%

Tareas en progreso
12
↑ 3 nuevas

Proyectos activos
3
Ver todos

Tokens hoy
2.45M
$1.82 USD

Costo hoy
$1.82 USD
↓ 8% vs ayer

Tasa de éxito
96.4%
↑ 4.2%
```

---

## 7. Sidebar del dashboard

### Sección: Proyecto activo

Card:

```txt
E-Commerce Nexus
ecommerce-nexus
▼
```

Botones:

```txt
+ Nuevo proyecto
Conectar GitHub
```

### Sección: API Keys

Lista:

```txt
Grok       Activa ●
Claude     Activa ●
Codex      Activa ●
Gemini     Activa ●
Jules      Válida ●
```

Acción:

```txt
Ver configuración de API ↗
```

Estados:

| Estado | Color |
|---|---|
| Activa | Verde |
| Válida | Verde |
| No configurada | Gris |
| Inválida | Rojo |
| Por expirar | Ámbar |

### Sección: Agentes registrados

Lista con toggles:

```txt
Arquitecto
Claude 3.5 Sonnet
[ON]

Backend Dev
Grok 3
[ON]

Frontend Dev
Gemini 1.5 Pro
[ON]

QA & Debug
Codex GPT-4o
[ON]

Doc Writer
Jules
[OFF/ON]
```

Botón:

```txt
+ Registrar nuevo agente
```

---

## 8. Panel Proyecto en trabajo

### Objetivo

Mostrar la estructura del proyecto activo y archivos relevantes.

### Tabs

```txt
Archivos
Recientes
Configuración
```

### Árbol de archivos

Ejemplo:

```txt
ecommerce-nexus
├── .github
├── app
│   └── web
│       └── src
│           ├── app
│           ├── components
│           │   └── ProductCard.tsx
│           ├── hooks
│           ├── lib
│           └── styles
├── api
├── packages
├── tests
├── .env.example
├── docker-compose.yml
├── README.md
└── tsconfig.json
```

### Detalles visuales

- Archivo activo con fondo morado oscuro.
- Etiqueta de lenguaje: `TSX`, `TS`, `MD`.
- Indicadores de cambios:
  - `M+` modificado.
  - `+` agregado.
  - `!` conflicto.
- Footer con rama Git:
  - `main`
  - número de commits.
  - número de archivos modificados.

---

## 9. Panel Orquestación del Enjambre

### Objetivo

Mostrar visualmente qué agentes están trabajando, su rol y estado.

### Elemento central

Visual tipo red:

- Hexágono central ámbar.
- Nodos conectados alrededor.
- Líneas moradas y ámbar.
- Animación sugerida: pulso desde el centro hacia los nodos.
- Mini status `En tiempo real`.

### Agentes alrededor

Ejemplo:

```txt
Arquitecto
Claude 3.5
Pensando

Backend Dev
Grok 3
Ejecutando

Frontend Dev
Gemini 1.5 Pro
En curso

QA & Debug
Codex GPT-4o
Ejecutando

Doc Writer
Jules
En espera
```

### Estados

| Estado | Color | Visual |
|---|---|---|
| Pensando | Verde/morado | punto pulsante |
| Ejecutando | Verde | línea activa |
| En curso | Morado | borde activo |
| En espera | Ámbar | punto fijo |
| Error | Rojo | borde rojo |
| Inactivo | Gris | opacidad baja |

### Objetivo actual

Card inferior:

```txt
OBJETIVO ACTUAL
Implementar módulo de carrito persistente
[Alta prioridad]

67%
Tiempo estimado: 12m restante
```

Debe incluir barra de progreso morada.

---

## 10. Panel Conversaciones de agentes

### Objetivo

Mostrar salidas o mensajes de cada agente trabajando en paralelo.

### Header

```txt
CONVERSACIONES DE AGENTES
Ver todas
```

### Tabs

```txt
Arquitectura 3
Backend 4
Frontend 3
Debug 2
Docs 2
```

### Card de conversación

Estructura:

```txt
[Icono agente] Arquitecto    Claude 3.5        10:42:15

He actualizado el diagrama de arquitectura para soportar el nuevo
módulo de carrito persistente con Redis como capa de caché.

[architecture-swarm.md] [2.4 KB] [Ver]
```

Otro ejemplo:

```txt
Backend Dev    Grok 3    10:42:18

Implementando endpoints para sincronización de carrito...
Creando CarritoService y actualizando las rutas.

[carrito.service.ts] [carrito.routes.ts] [+2]
```

Campo inferior:

```txt
Enviar mensaje a Arquitecto...
[Enviar]
```

### Botones / acciones

- Ver todas.
- Filtro por rol.
- Abrir archivo generado.
- Ver diff.
- Enviar mensaje al agente.
- Pausar agente.
- Reintentar tarea.

---

## 11. Área Lanzar tarea / Chats

### Objetivo

Permitir lanzar una tarea a varios agentes al mismo tiempo y comparar resultados.

### Header

```txt
Lanzar tarea / Chats
Trabaja con múltiples agentes de IA en paralelo sobre el mismo objetivo.
```

### Modo

```txt
Modo paralelo
5 agentes
[Configuración]
```

### Paso 1: Prompt / tarea

Título:

```txt
1. ESCRIBE TU PROMPT / TAREA
```

Textarea:

```txt
Implementar módulo de carrito de compras persistente con Zustand,
sincronización con backend y cálculo de totales en tiempo real.
Incluir tests unitarios y validaciones.
```

Acciones debajo:

```txt
Adjuntar archivo
Variables
Contexto del proyecto
Plantillas
```

### Objetivo de la tarea

Card:

```txt
Implementar módulo de carrito de compras persistente
Persistencia local + sincronización con backend + cálculos en tiempo real
[Alta prioridad]
```

### Paso 2: Seleccionar agentes

Cards con toggle:

```txt
Grok
xAI
Contexto cargado
[ON]

Claude
Claude 3.5
Contexto cargado
[ON]

Codex
OpenAI
Contexto cargado
[ON]

Gemini
Gemini 1.5 Pro
Contexto cargado
[ON]

Jules
Google Labs
Contexto cargado
[ON]
```

### Opciones avanzadas

Debe estar colapsado por defecto.

Opciones sugeridas:

- Temperatura.
- Máximo de tokens.
- Tiempo máximo por agente.
- Modo:
  - Paralelo.
  - Secuencial.
  - Debate.
  - Votación.
  - Arquitecto + ejecutores.
- Guardar outputs automáticamente.
- Crear branch Git.
- Generar PR.
- Ejecutar tests al terminar.

### Panel derecho: salidas paralelas

Título:

```txt
3. CHATS / SALIDAS EN PARALELO
```

Cada agente debe aparecer como card vertical:

```txt
Grok       xAI          Ejecutando
He creado el store de Zustand con persistencia y sincronización optimista...
[cart.store.ts] [TS] [+2]
```

### Comparar respuestas

Tabla inferior:

```txt
7. COMPARAR RESPUESTAS
```

Columnas:

```txt
Criterio | Grok | Claude | Codex | Gemini | Jules
```

Filas:

```txt
Estructura
Calidad código
Cobertura tests
Performance
Claridad
Listo para PR
```

Usar estrellas, checks y porcentajes.

---

## 12. Logs en tiempo real

### Objetivo

Mostrar actividad técnica en vivo durante una tarea.

### Card

```txt
LOGS EN TIEMPO REAL
Ver todo
```

Filas:

```txt
10:43:22  Grok      Store de Zustand inicializado     store.ts
10:43:20  Claude    Conectando con API /cart/sync     api.ts
10:43:18  Codex     Generando tests unitarios         tests.ts
10:43:16  Gemini    Renderizando componente CartDrawer ui.tsx
10:43:14  Jules     Generando documentación técnica   docs.md
```

### Funciones

- Auto-scroll toggle.
- Filtros por agente.
- Filtros por severidad:
  - Info
  - Warning
  - Error
  - Success
- Ver logs completos.

---

## 13. Tareas recientes

### Card

```txt
TAREAS RECIENTES
Ver todas las tareas
```

Filas:

```txt
Implementar carrito persistente     En curso       67%
Integración pasarela de pagos       En curso       46%
Optimizar carga de imágenes         Completado     100%
Tests E2E flujo de compra           En curso       75%
Documentación API                   Pendiente      0%
```

Estados:

| Estado | Color |
|---|---|
| En curso | Ámbar |
| Completado | Verde |
| Pendiente | Gris |
| Fallido | Rojo |

---

## 14. Historial de despliegues

### Card

```txt
HISTORIAL DE DESPLIEGUES
```

Filas:

```txt
v1.2.3    Producción    Desplegado por Enjambre    ✓
v1.2.2    Staging       Desplegado por Enjambre    ✓
v1.2.1    Pruebas       Desplegado por Enjambre    ✓
```

Acción:

```txt
Ver historial completo ↗
```

---

## 15. API Keys

### Objetivo

Permitir configurar y validar proveedores de IA.

### Layout

Tabla o cards por proveedor.

### Proveedores

```txt
Grok
Claude
Codex
Gemini
Jules
```

### Card de API Key

```txt
Grok
Proveedor: xAI
Estado: Activa
Última validación: hace 2 min
Uso hoy: 1.02M tokens
Límite: 3.00M tokens

[Actualizar key]
[Validar]
[Ver consumo]
```

### Estados

```txt
Activa
Válida
Inválida
No configurada
Próxima a expirar
Límite alcanzado
```

### Reglas visuales

- Nunca mostrar la key completa.
- Mostrar formato: `sk-••••••••••••4F2A`
- Botón para revelar temporalmente.
- Confirmación antes de eliminar.

---

## 16. Agentes

### Objetivo

Crear perfiles de agentes especializados y asignarles modelos.

### Ejemplo de agentes

```txt
Arquitecto
Modelo: Claude 3.5 Sonnet
Rol: Diseña arquitectura, divide tareas y revisa consistencia.

Backend Dev
Modelo: Grok 3
Rol: Implementa servicios, endpoints, lógica de negocio y sincronización.

Frontend Dev
Modelo: Gemini 1.5 Pro
Rol: Crea componentes, UI states y validaciones visuales.

QA & Debug
Modelo: Codex GPT-4o
Rol: Genera pruebas, encuentra errores y propone fixes.

Doc Writer
Modelo: Jules
Rol: Documenta cambios, genera README y prepara notas técnicas.
```

### Botones

```txt
+ Nuevo agente
Editar agente
Duplicar agente
Desactivar
Eliminar
Probar agente
```

---

## 17. Flujo principal de usuario

### Flujo 1: Configuración inicial

```txt
Abrir app
→ Splash valida entorno
→ Crear proyecto o conectar GitHub
→ Configurar API keys
→ Registrar agentes
→ Abrir dashboard
```

### Flujo 2: Lanzar tarea

```txt
Seleccionar proyecto
→ Clic en Lanzar Enjambre
→ Escribir prompt
→ Seleccionar agentes
→ Ajustar opciones avanzadas
→ Ejecutar
→ Ver chats paralelos
→ Comparar respuestas
→ Aceptar propuesta ganadora
→ Aplicar cambios al proyecto
→ Generar commit / PR
```

### Flujo 3: Revisar proyecto

```txt
Abrir proyecto
→ Ver árbol de archivos
→ Revisar actividad reciente
→ Abrir conversación de agente
→ Ver archivos generados
→ Revisar diff
→ Aprobar cambios
```

---

## 18. Botones principales

### Botón primario

```txt
Lanzar Enjambre
```

- Fondo ámbar.
- Texto blanco.
- Icono Play.
- Hover con brillo ámbar.
- Debe destacar más que cualquier otro botón.

### Botón secundario

```txt
Ver dashboard
Conectar GitHub
Ver logs completos
```

- Fondo transparente.
- Borde morado.
- Texto morado claro.

### Botón peligro

```txt
Eliminar agente
Revocar API key
Cancelar tarea
```

- Fondo rojo oscuro.
- Borde rojo.
- Texto rojo claro.

### Botón ghost

```txt
Ver todos
Ver configuración
Abrir archivo
```

- Sin fondo.
- Texto morado o gris.
- Hover con fondo oscuro.

---

## 19. Estados globales

### Sistema

```txt
En línea
Todos los sistemas
```

### Agentes

```txt
Activo
Pensando
Ejecutando
En curso
En espera
Inactivo
Error
```

### Tareas

```txt
Pendiente
En curso
Completado
Fallido
Cancelado
Reintentando
```

### Proyecto

```txt
Privado
Público
Local
GitHub conectado
Cambios sin guardar
Listo para PR
```

---

## 20. Microcopy recomendado

### Hero

```txt
Tu equipo de IAs trabajando en paralelo.
```

### Dashboard

```txt
Coordina modelos, lanza tareas y compara resultados desde un solo lugar.
```

### Privacidad

```txt
Tus proyectos no son nuestro producto.
```

### API Keys

```txt
Tus llaves son tuyas. ENJAMBRE solo las usa para ejecutar tus agentes.
```

### Lanzar tarea

```txt
Describe el objetivo. El enjambre divide, ejecuta y compara.
```

### Logs

```txt
Visibilidad completa de lo que hace cada agente.
```

---

## 21. Recomendaciones de diseño

1. Mantener la interfaz oscura.
2. Usar morado como identidad principal.
3. Usar ámbar únicamente para acciones principales y núcleo IA.
4. No abusar del verde; reservarlo para estado activo.
5. Los paneles deben tener mucho aire visual.
6. La información crítica debe estar arriba.
7. El árbol de archivos debe sentirse como IDE.
8. Los chats deben sentirse como colaboración multiagente, no como WhatsApp.
9. El botón “Lanzar Enjambre” debe estar siempre visible en pantallas de proyecto.
10. La orquestación visual central debe ser el elemento más memorable de la app.

---

## 22. Pantallas mínimas necesarias para prototipo

Para un prototipo convincente se requieren estas pantallas:

1. Splash / Loading.
2. Inicio.
3. Dashboard de proyecto.
4. Lanzar tarea / Chats paralelos.
5. Proyectos.
6. API Keys.
7. Agentes.
8. Logs.
9. Estadísticas.
10. Ajustes.

---

## 23. Prompt para IA de diseño

Usar este prompt para generar o refinar pantallas:

```txt
Diseña una interfaz web SaaS premium para “ENJAMBRE”, una herramienta de Obsidia Studio para coordinar múltiples agentes de IA que programan en paralelo. Estilo oscuro, futurista, profesional, local-first y privado. Paleta: negro obsidiana, morado eléctrico, violeta profundo, ámbar IA y verde solo para estados activos.

La app debe tener sidebar izquierda con logo, navegación, proyecto activo, API keys y agentes registrados. Header superior con proyecto actual, botón ámbar “Lanzar Enjambre”, uso de tokens, estado del sistema y notificaciones.

El dashboard principal debe incluir: métricas superiores, árbol de archivos del proyecto, visual central de orquestación con hexágono/núcleo y nodos de agentes conectados, conversaciones de agentes en paralelo, logs en vivo, tareas recientes, historial de despliegues y consumo de tokens por IA.

Debe verse como una mezcla entre Cursor, Linear, Vercel, GitHub Copilot Workspace y una consola de orquestación de agentes IA. Debe ser nítida, legible, con paneles bien alineados, tipografía moderna y microinteracciones sutiles.
```

---

## 24. Prompt para pantalla específica: Dashboard

```txt
Genera dashboard principal para ENJAMBRE. Layout 16:9, ultra nítido, modo oscuro. Sidebar izquierda con logo, proyecto activo E-Commerce Nexus, botones Nuevo proyecto y Conectar GitHub, API keys activas para Grok, Claude, Codex, Gemini y Jules, agentes registrados con toggles.

Header superior con “Proyecto: E-Commerce Nexus”, repositorio GitHub, badge Privado, botón ámbar grande “Lanzar Enjambre”, tokens usados hoy, estado En línea y campana de notificaciones.

Centro con tarjetas de métricas: agentes activos 4/5, tareas en progreso 12, proyectos activos 3, tokens 2.45M, costo $1.82 USD, tasa de éxito 96.4%. Panel izquierdo con árbol de archivos. Panel central con visual de orquestación: hexágono ámbar central y nodos morados conectados con agentes Arquitecto, Backend Dev, Frontend Dev, QA & Debug y Doc Writer. Panel derecho con conversaciones de agentes. Parte inferior con uso de tokens por IA, actividad en tiempo real, tareas recientes e historial de despliegues.
```

---

## 25. Prompt para pantalla específica: Inicio

```txt
Genera pantalla de inicio para ENJAMBRE. Modo oscuro premium, futurista, morado y ámbar. Sidebar izquierda con navegación: Inicio, Proyectos, Agentes, Chats, Tareas, Logs, API Keys, Ajustes. Header con “Bienvenido de vuelta, IA Coder” y estado del sistema.

Contenido principal con tarjeta grande “Continuar proyecto: E-Commerce Nexus”, botón “Abrir proyecto”, progreso 68%, métricas de agentes activos, tareas, proyectos y tokens. Panel derecho con acciones rápidas: Nuevo proyecto, Conectar GitHub, Lanzar tarea. Debajo tarjetas de métricas, proyectos recientes, actividad reciente, conversaciones recientes y consejo del enjambre.
```

---

## 26. Prompt para pantalla específica: Lanzar tarea / Chats

```txt
Genera pantalla “Lanzar tarea / Chats” para ENJAMBRE. Interfaz oscura profesional, 16:9, muy nítida. Sidebar izquierda con contexto del proyecto y árbol de archivos. Header con proyecto E-Commerce Nexus y botón ámbar Lanzar Enjambre.

Panel principal izquierdo con pasos: 1 Escribe tu prompt/tarea, textarea grande con instrucciones para implementar carrito persistente; acciones adjuntar archivo, variables, contexto del proyecto y plantillas. Card de objetivo de tarea con badge Alta prioridad. Paso 2 Selecciona agentes de IA con cards para Grok, Claude, Codex, Gemini y Jules, todos con toggle activo y estado Contexto cargado.

Panel derecho con 5 chats/salidas en paralelo, cada uno con estado Ejecutando, mensaje breve y archivos generados. Abajo tabla Comparar respuestas con criterios estructura, calidad código, cobertura tests, performance, claridad y listo para PR.
```

---

## 27. Prompt para pantalla específica: Splash

```txt
Genera pantalla splash/loading para ENJAMBRE. Fondo negro obsidiana, logo hexagonal con núcleo ámbar y bordes morados al centro, texto ENJAMBRE grande en fuente futurista, subtítulo IA Coder, texto by Obsidia Studio, tagline “Tu equipo de IAs trabajando en paralelo.” Barra de progreso morada, texto “Inicializando agentes...”, checklist inferior con Cargando proyecto local, Verificando API Keys y Preparando enjambre. Estilo premium, limpio, futurista y muy nítido.
```
