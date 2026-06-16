# ENJAMBRE — Handoff completo para otra IA

**Proyecto:** ENJAMBRE  
**Ecosistema:** Obsidia Studio  
**Tagline:** Tu equipo de IAs trabajando en paralelo.  
**Objetivo:** crear un dashboard open source local-first para coordinar múltiples agentes de IA que trabajan sobre proyectos de software.

Este paquete está pensado para entregarse a otra IA, diseñador, arquitecto de software o desarrollador para continuar el proyecto sin perder contexto.

---

## 1. Resumen ejecutivo

ENJAMBRE debe ser una herramienta open source para coordinar varios agentes de IA —por ejemplo Grok, Claude, Codex/OpenAI, Gemini y Jules— dentro de un mismo proyecto de software.

La idea central **no es copiar proyectos existentes**, sino combinar lo mejor de ellos:

- Visual workspace tipo dashboard.
- Multiagente real.
- Proyectos locales y GitHub.
- API keys propias del usuario.
- Logs y trazabilidad.
- Comparación de respuestas.
- Seguridad antes de ejecutar código.
- Política legal clara: no training, no distillation, no reventa de outputs.
- Open source permisivo.

La ventaja de ENJAMBRE debe ser:

> Una interfaz visual clara para convertir varias IAs en un equipo de trabajo coordinado, auditable y controlado por el usuario.

---

## 2. Qué se debe mantener

### 2.1 Nombre

Mantener:

```txt
ENJAMBRE
```

También puede usarse en interfaces compactas:

```txt
ENJAMBRE
IA Coder
by Obsidia Studio
```

No cambiar a nombres genéricos como “AI Agent Studio” porque perdería identidad.

### 2.2 Concepto visual

Mantener:

- Hexágono / colmena.
- Nodos conectados.
- Núcleo central ámbar.
- Morado como identidad principal.
- Ámbar como acción/energía del enjambre.
- Negro obsidiana como fondo.
- Verde solo para estados activos.

### 2.3 Concepto de producto

Mantener:

- Multiagente.
- Local-first.
- BYOK: bring your own key.
- Dashboard con proyectos, chats, logs, API keys y agentes.
- Human-in-the-loop antes de aplicar cambios.
- Open source.

### 2.4 Flujo visual ya diseñado

Mantener estas pantallas base:

1. Splash / Loading.
2. Inicio.
3. Dashboard del proyecto.
4. Lanzar tarea / Chats paralelos.
5. API Keys.
6. Agentes.
7. Logs.
8. Estadísticas.
9. Ajustes.

---

## 3. Qué se debe cambiar o mejorar

### 3.1 No prometer “100% privado” si usa APIs externas

Cambiar textos como:

```txt
100% privado
Todo local
Tus datos nunca salen
```

Por textos más precisos:

```txt
Local-first
Tus API keys, tu control
Modo local cuando usas modelos locales
Los proveedores cloud reciben el contexto que tú autorices
```

Motivo: si el usuario conecta OpenAI, Anthropic, Google o xAI, puede enviar datos a esos proveedores. La app puede ser local-first, pero no siempre 100% local.

### 3.2 Separar ENJAMBRE de proveedores externos

No usar logos oficiales sin permiso. Usar texto descriptivo:

```txt
OpenAI-compatible
Anthropic Claude
Google Gemini
xAI Grok
Custom provider
```

Agregar disclaimer:

```txt
All trademarks belong to their respective owners. ENJAMBRE is not affiliated with or endorsed by these providers.
```

### 3.3 Cambiar “Codex” por naming más flexible

“Codex” puede ser confuso porque OpenAI ha usado ese nombre en distintos contextos.

Recomendación:

```txt
OpenAI Agent
OpenAI-compatible Agent
Code Agent
```

En el dashboard puede seguir apareciendo el rol:

```txt
QA & Debug
Provider: OpenAI-compatible
Model: configurable
```

### 3.4 Cambiar “Jules” a proveedor configurable

Jules puede existir como integración si el usuario la tiene, pero no debe ser core obligatorio.

Recomendación:

```txt
Doc Writer
Provider: configurable
Model: Gemini / OpenAI / Claude / local
```

### 3.5 Rediseñar arquitectura interna

La app no debe ser solo UI Streamlit. Debe tener módulos claros:

```txt
ui/
core/
providers/
agents/
workspace/
security/
legal/
storage/
plugins/
```

### 3.6 Añadir sandbox

ENJAMBRE no debe ejecutar comandos libres sin control. Debe incluir:

- Sandbox Docker opcional.
- Modo dry-run.
- Confirmación humana.
- Diff antes de escribir.
- Bloqueo de comandos peligrosos.
- Auditoría de acciones.

### 3.7 Añadir `.enjambreignore`

Debe evitar enviar secretos a proveedores.

Archivos bloqueados por defecto:

```txt
.env
.env.*
*.pem
*.key
id_rsa
id_ed25519
credentials.*
secrets.*
node_modules/
.venv/
.git/
```

### 3.8 Añadir “policy engine”

Antes de llamar proveedores o ejecutar acciones, validar:

- No distillation.
- No training dataset builder.
- No scraping.
- No comandos peligrosos.
- No envío de secretos.
- No cambios destructivos sin aprobación.

---

## 4. Propuesta de rediseño de guía / GUID

Sí, se recomienda un rediseño de GUID/UI kit, no porque lo visual esté mal, sino porque para un proyecto open source serio debe haber consistencia y componentes reutilizables.

### 4.1 Design system recomendado

Crear archivo:

```txt
docs/DESIGN_SYSTEM.md
```

Con:

- Colores.
- Tipografías.
- Espaciados.
- Botones.
- Estados.
- Cards.
- Tablas.
- Tabs.
- Sidebars.
- Badges.
- Toasts.
- Modales.
- Empty states.
- Loading states.
- Error states.

### 4.2 Componentes mínimos

```txt
AppShell
Sidebar
Topbar
ProjectSelector
ProviderKeyCard
AgentCard
MetricCard
FileTree
SwarmGraph
AgentChatPanel
TaskComposer
DiffViewer
LogConsole
UsageChart
ApprovalModal
PolicyWarningBanner
```

### 4.3 Estética final

Debe sentirse como mezcla de:

- Cursor / Cline para coding.
- Linear para tareas.
- Vercel para despliegues.
- GitHub para PR/diffs.
- LiteLLM para proveedores y costos.
- Obsidia Studio para branding.

---

## 5. Diferenciador competitivo

Muchos proyectos ya hacen agentes de código. ENJAMBRE debe diferenciarse así:

```txt
No es solo un agente.
No es solo una CLI.
No es solo un framework.
No es solo un gateway de modelos.

Es una consola visual open source para coordinar agentes,
ver qué hace cada uno, comparar salidas y aplicar cambios con control humano.
```

Diferenciadores propuestos:

1. Dashboard visual de orquestación.
2. Multiagente real con roles.
3. BYOK transparente.
4. Comparación de respuestas por criterio.
5. Capa legal/no-distillation visible.
6. Secret scanning antes de enviar contexto.
7. Approval gates antes de escribir o ejecutar.
8. Modo local-first y providers configurables.
9. Exportación de logs/auditoría.
10. Diseño profesional dentro de Obsidia Studio.

---

## 6. Riesgo legal resumido

ENJAMBRE puede existir como open source si:

- No incluye API keys.
- No revende acceso a modelos.
- No usa outputs para entrenar modelos competidores.
- No hace distillation.
- No scrapea outputs.
- No oculta términos de proveedores.
- No usa logos/marcas como si fueran propias.
- No promete privacidad absoluta con proveedores cloud.
- No ejecuta acciones destructivas sin aprobación.

Frase que debe estar en README:

```txt
ENJAMBRE coordinates AI agents. It does not train, distill, scrape, resell, or replicate third-party models.
```

En español:

```txt
ENJAMBRE coordina agentes de IA. No entrena, destila, scrapea, revende ni replica modelos de terceros.
```

---

## 7. Licencia recomendada

Recomendación:

```txt
Apache-2.0
```

Motivos:

- Permisiva.
- Amigable para empresas.
- Incluye concesión explícita de patente.
- Buena para proyectos con contribuciones externas.
- Menos restrictiva que GPL/AGPL.

Alternativa simple:

```txt
MIT
```

Pero Apache-2.0 es mejor para un proyecto de IA, agentes, plugins y posibles contribuciones.

---

## 8. Roadmap recomendado

### Fase 0 — Repositorio público limpio

- README claro.
- LICENSE Apache-2.0.
- SECURITY.md.
- DISCLAIMER.md.
- PROVIDER_POLICY.md.
- CONTRIBUTING.md.
- NOTICE.
- `.env.example`.
- `.enjambreignore`.

### Fase 1 — MVP local

- UI Streamlit o web app ligera.
- Crear proyecto local.
- Configurar API keys.
- Crear agentes.
- Lanzar tarea a 2 proveedores.
- Ver respuestas lado a lado.
- Guardar logs locales.
- No escribir archivos automáticamente.

### Fase 2 — Workspace de código

- Árbol de archivos.
- Lectura segura de contexto.
- Secret scanner.
- Diff viewer.
- Aplicar cambios con confirmación.
- Git branch temporal.

### Fase 3 — Orquestación real

- Roles: arquitecto, backend, frontend, QA, docs.
- Modo paralelo.
- Modo secuencial.
- Modo debate.
- Modo votación.
- Comparador de resultados.
- Métricas de costo/tokens.

### Fase 4 — Seguridad avanzada

- Sandbox Docker.
- Bloqueo de comandos peligrosos.
- Políticas configurables.
- Auditoría exportable.
- Tests automáticos.
- PR generation.

### Fase 5 — Open source maduro

- Plugin SDK.
- Provider SDK.
- Marketplace comunitario de agentes.
- Documentación.
- Ejemplos.
- Benchmarks.
- Tests.
- CI/CD.

---

## 9. Estructura de repositorio recomendada

```txt
enjambre-ia-coder/
├── README.md
├── LICENSE
├── NOTICE
├── SECURITY.md
├── DISCLAIMER.md
├── PROVIDER_POLICY.md
├── LEGAL_RISK_REVIEW.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── .env.example
├── .enjambreignore
├── docs/
│   ├── HANDOFF.md
│   ├── DESIGN_SYSTEM.md
│   ├── ARCHITECTURE.md
│   ├── COMPETITIVE_ANALYSIS.md
│   ├── LEGAL_CHECKLIST.md
│   ├── ROADMAP.md
│   └── PROVIDER_ADAPTERS.md
├── src/
│   └── enjambre/
│       ├── ui/
│       ├── core/
│       ├── providers/
│       ├── agents/
│       ├── orchestration/
│       ├── workspace/
│       ├── security/
│       ├── storage/
│       └── plugins/
├── tests/
├── examples/
└── app.py
```

---

## 10. Prompt para continuar con otra IA

```txt
Actúa como arquitecto senior de producto open source, diseñador UX/UI y especialista en agentes IA.

Vas a continuar el proyecto ENJAMBRE, una herramienta de Obsidia Studio para coordinar múltiples agentes de IA que programan en paralelo. El proyecto debe ser open source, local-first, BYOK y legalmente cuidadoso.

No queremos copiar OpenHands, Cline, Aider, CrewAI, LiteLLM ni LangGraph. Queremos aprender de ellos y hacer algo propio: una consola visual para proyectos, agentes, chats paralelos, comparación de respuestas, API keys, logs, costos, seguridad y aprobación humana.

Mantén:
- Nombre ENJAMBRE.
- Identidad visual negra/morada/ámbar.
- Hexágono/nodos/colmena.
- Multiagente.
- BYOK.
- Open source.

Mejora:
- Arquitectura modular.
- Provider adapters.
- Sandbox.
- Secret scanning.
- Human approval gates.
- No training/no distillation.
- Diff viewer.
- Git workflow.
- Comparación de respuestas.
- Design system reutilizable.

Entrega:
1. Arquitectura técnica.
2. Design system.
3. Roadmap.
4. Estructura de repo.
5. README final.
6. Política legal y seguridad.
7. Plan MVP.
8. Componentes UI.
9. Qué construir primero.
10. Qué evitar legalmente.
```

---

## 11. Checklist antes de publicar

- [ ] Cambiar cualquier mención errónea de “Ostadia” a “Obsidia”.
- [ ] Confirmar que no se usan logos oficiales de proveedores.
- [ ] Poner licencia Apache-2.0 completa.
- [ ] Agregar NOTICE.
- [ ] Agregar disclaimers legales.
- [ ] Agregar política no training/no distillation.
- [ ] Agregar `.env.example`.
- [ ] Agregar `.enjambreignore`.
- [ ] Prohibir subir API keys.
- [ ] Implementar secret scanner.
- [ ] Implementar approval modal antes de cambios.
- [ ] No ejecutar comandos sin confirmación.
- [ ] No prometer 100% local si hay proveedores cloud.
- [ ] Documentar que cada usuario acepta términos de cada proveedor.
- [ ] Crear issues iniciales para roadmap.
- [ ] Crear CONTRIBUTING.
- [ ] Crear SECURITY.md.
- [ ] Crear CODE_OF_CONDUCT.md.
- [ ] Crear carpeta `docs/`.

---

## 12. Conclusión

ENJAMBRE tiene potencial si se enfoca en:

```txt
orquestación visual + seguridad + BYOK + open source + claridad legal
```

No debe competir por ser “el agente más autónomo” desde el día uno. Debe competir por ser el más claro, controlable y auditable.

La mejor versión del producto sería:

> Un panel de control open source donde el usuario ve a sus agentes trabajar, decide qué aceptar, controla sus llaves y conserva trazabilidad completa.
