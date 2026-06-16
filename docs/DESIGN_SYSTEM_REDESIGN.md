# Rediseño GUID / Design System — ENJAMBRE

## 1. Objetivo

Crear un design system consistente para convertir las imágenes conceptuales en una app real.

---

## 2. Paleta

```css
--bg-main: #050509;
--bg-panel: #080D16;
--bg-elevated: #0D111C;
--border-subtle: #211338;

--purple-main: #8B5CF6;
--purple-dark: #4A2C7D;
--purple-glow: rgba(139, 92, 246, 0.35);

--amber-main: #FFB020;
--amber-hover: #FFC637;
--amber-glow: rgba(255, 176, 32, 0.35);

--green-status: #22C55E;
--blue-tech: #3B82F6;
--red-error: #EF4444;

--text-main: #F8FAFC;
--text-secondary: #94A3B8;
--text-muted: #64748B;
```

---

## 3. Componentes

### ButtonPrimary

Uso:

```txt
Lanzar Enjambre
Abrir proyecto
Ejecutar tarea
```

Visual:

- Fondo ámbar.
- Texto blanco.
- Icono a la izquierda.
- Hover con glow.

### ButtonSecondary

Uso:

```txt
Conectar GitHub
Ver dashboard
Ver logs
```

Visual:

- Fondo transparente.
- Borde morado.
- Texto morado.

### ButtonDanger

Uso:

```txt
Revocar API key
Cancelar tarea
Eliminar agente
```

Visual:

- Rojo oscuro.
- Borde rojo.
- Confirmación modal.

### MetricCard

Campos:

```txt
icon
label
value
delta
progress optional
```

### AgentCard

Campos:

```txt
role
provider
model
status
toggle
tokens
last_task
```

### ProviderKeyCard

Campos:

```txt
provider
status
masked_key
usage
limit
validate_button
update_button
```

### FileTree

Debe soportar:

- Carpetas.
- Archivos.
- Etiquetas de lenguaje.
- Estado Git.
- Archivo seleccionado.
- Expand/collapse.

### SwarmGraph

Elemento memorable de ENJAMBRE.

Debe mostrar:

- Núcleo central ámbar.
- Nodos morados.
- Conexiones.
- Estado por agente.
- Pulso en tiempo real.

### AgentChatPanel

Debe mostrar:

- Tabs por rol.
- Mensajes por agente.
- Archivos generados.
- Estado.
- Timestamp.
- Acciones: abrir, ver diff, responder.

### DiffViewer

Necesario para seguridad.

Debe mostrar:

- Archivo.
- Líneas agregadas.
- Líneas eliminadas.
- Aprobar.
- Rechazar.
- Pedir revisión.

### ApprovalModal

Antes de cualquier acción sensible:

```txt
ENJAMBRE quiere modificar 3 archivos.
Revisa el diff antes de continuar.

[Aprobar cambios]
[Cancelar]
```

---

## 4. Estados

### Agente

```txt
Activo
Pensando
Ejecutando
En curso
En espera
Inactivo
Error
```

### Tarea

```txt
Pendiente
En curso
Completado
Fallido
Cancelado
Reintentando
```

### API Key

```txt
Activa
Válida
Inválida
No configurada
Por expirar
Límite alcanzado
```

---

## 5. Layout recomendado

### Desktop

```txt
Sidebar izquierda: 260px
Topbar: 72px
Contenido: grid flexible
Panel derecho: 360px-440px
```

### Responsive

- En tablet, panel derecho colapsa.
- En móvil, usar vista simplificada.
- El MVP puede priorizar desktop.

---

## 6. Microcopy

```txt
Describe el objetivo. El enjambre divide, ejecuta y compara.
```

```txt
Tus llaves son tuyas. ENJAMBRE solo las usa para ejecutar tus agentes.
```

```txt
Revisa antes de aplicar. Ningún cambio se escribe sin tu aprobación.
```

```txt
Local-first no significa invisible para proveedores cloud. Tú decides qué enviar.
```
