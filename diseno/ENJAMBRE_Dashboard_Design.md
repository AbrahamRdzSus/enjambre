# Diseño del Dashboard ENJAMBRE (Streamlit)

## Nombre del Proyecto
**ENJAMBRE**

**Tagline**: "Tu equipo de IAs trabajando en paralelo"

## Logo Aproximado (descripción para generar)
- Un enjambre de abejas estilizadas con circuitos digitales / neuronas.
- Colores: Morado oscuro (#4A2C7D), verde neón (#00FF9F), blanco y negro.
- Texto "ENJAMBRE" en fuente bold futurista.
- Icono: Hexágono con múltiples nodos conectados (representando agentes).

## Estructura General del Dashboard

### 1. Sidebar (Izquierda)
- Logo + Nombre del Proyecto
- Selector de Proyecto:
  - Lista de proyectos existentes (carpeta local)
  - Botón "Nuevo Proyecto"
  - Opción "Conectar GitHub"
- Gestión de API Keys:
  - Tarjetas por IA: Grok, Claude, Codex, Gemini, Jules
  - Campo para pegar key + Botón "Validar"
  - Estado: ✅ Validada | ❌ Inválida | ⚠️ No configurada
- Lista de Agentes Registrados (con toggle Activar/Desactivar)

### 2. Header (Superior)
- Título del Proyecto Actual
- Botón "Lanzar Enjambre" grande (verde)
- Indicador de tokens totales usados hoy

### 3. Sección Principal (Tabs)
**Tab 1: Overview**
- Tarjetas grandes de cada agente:
  - Estado (Activo / Inactivo / Pensando)
  - Última tarea
  - Tokens usados / Límite
  - Gráfico pequeño de consumo

**Tab 2: Lanzar Tarea**
- Área grande para escribir el prompt
- Checkboxes para seleccionar qué agentes usar
- Opciones avanzadas (modo, temperatura, etc.)

**Tab 3: Logs en Vivo**
- Consola en tiempo real (actualizable)
- Filtros por agente

**Tab 4: Proyectos & Archivos**
- Explorador de archivos del proyecto
- Historial de tareas

**Tab 5: Estadísticas**
- Gráficos de uso de tokens por IA
- Consumo histórico
- Alertas cuando se acerque al límite

### 4. Footer
- Estado del sistema
- Versión del Enjambre
- Enlaces (GitHub, documentación)

## Colores y Estilo
- Tema oscuro moderno
- Morado principal (Grok style)
- Accentos en verde y cyan
- Muy similar a interfaces de Claude Projects + Cursor

---

**Instrucciones para generar logo:**
Usa este prompt en Grok o Gemini:
"Genera un logo profesional para 'ENJAMBRE': un hexágono con abejas digitales conectadas por líneas neuronales, colores morado y verde neón, estilo cyber-tech minimalista."

Este documento te sirve como especificación completa para crear la app Streamlit.
