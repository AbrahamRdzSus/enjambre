# Análisis competitivo — Proyectos open source similares

Este documento resume aprendizajes de proyectos similares y qué debe tomar ENJAMBRE de cada uno sin copiar.

---

## 1. OpenHands

**Enfoque:** plataforma de agentes de software capaces de escribir código, usar terminal, navegar web y ejecutar en sandbox.

**Lo mejor que tiene:**
- Sandbox.
- Agentes que interactúan con entorno real.
- Arquitectura seria para software agents.
- MIT en core, con carpeta enterprise separada.

**Qué aprender:**
- ENJAMBRE necesita sandbox desde temprano.
- Debe separar core open source de posibles módulos enterprise.
- Debe tener evaluación y seguridad.

**Qué NO copiar:**
- No intentar replicar todo OpenHands.
- No empezar como plataforma generalista gigante.

**Qué le falta a ENJAMBRE frente a OpenHands:**
- Sandbox real.
- Ejecución controlada.
- Benchmarks.
- Tooling robusto.
- Evaluación de agentes.

**Acción recomendada:**
- Construir primero un sandbox mínimo y diff viewer.

---

## 2. MetaGPT

**Enfoque:** multiagente tipo empresa de software: PM, arquitecto, ingenieros, QA.

**Lo mejor que tiene:**
- Roles claros.
- SOPs/procesos.
- Flujo de empresa de software.
- Generación de documentos y arquitectura.

**Qué aprender:**
- ENJAMBRE debe tener roles formales.
- Cada agente necesita objetivo, permisos y output esperado.
- El flujo debe parecer equipo real, no solo chats sueltos.

**Qué NO copiar:**
- No ocultar demasiado el proceso.
- No hacerlo demasiado académico o complicado.

**Qué le falta a ENJAMBRE frente a MetaGPT:**
- SOPs por tipo de tarea.
- Plantillas de flujos.
- Roles configurables.

**Acción recomendada:**
- Crear carpeta `agents/templates/` con roles predefinidos.

---

## 3. Cline

**Enfoque:** agente autónomo en IDE/CLI capaz de editar archivos, ejecutar comandos y usar herramientas.

**Lo mejor que tiene:**
- UX muy orientada a desarrollo real.
- Licencia Apache-2.0.
- Fuerte integración con entorno de trabajo.
- Edición de archivos y comandos.

**Qué aprender:**
- ENJAMBRE necesita aprobación humana antes de acciones.
- Debe integrarse bien con proyectos reales.
- Debe tener buena UX para diffs y cambios.

**Qué NO copiar:**
- No ser solo extensión de IDE.
- No perder el dashboard multiagente.

**Qué le falta a ENJAMBRE frente a Cline:**
- Integración real con editor.
- Cambios seguros en archivos.
- Tool permissions.

**Acción recomendada:**
- Crear `ApprovalModal`, `DiffViewer`, `CommandReview`.

---

## 4. CrewAI

**Enfoque:** framework para orquestar agentes autónomos con roles, tareas y procesos.

**Lo mejor que tiene:**
- Simplicidad para definir agentes.
- Roles y tareas.
- Workflows ligeros.
- Independencia de frameworks pesados.

**Qué aprender:**
- ENJAMBRE debe tener una definición simple de agente.
- Debe permitir workflows declarativos.
- Debe soportar tareas paralelas/secuenciales.

**Qué NO copiar:**
- No quedarse solo en framework sin UI.
- No depender completamente de otro framework.

**Qué le falta a ENJAMBRE frente a CrewAI:**
- DSL simple para agentes.
- Workflows guardables.
- Configuración como YAML/JSON.

**Acción recomendada:**
- Crear `enjambre.yaml` para definir agentes y procesos.

---

## 5. LiteLLM

**Enfoque:** gateway unificado para llamar 100+ proveedores LLM con formato común.

**Lo mejor que tiene:**
- Abstracción de proveedores.
- Métricas de costo y tokens.
- OpenAI-compatible interface.
- Multi-provider routing.

**Qué aprender:**
- ENJAMBRE no debe hardcodear proveedores.
- Debe usar adapters.
- Debe estimar costos y tokens.
- Puede integrarse con LiteLLM en vez de reinventar todo.

**Qué NO copiar:**
- No convertirse solo en gateway.
- No ocultar diferencias legales de proveedores.

**Qué le falta a ENJAMBRE frente a LiteLLM:**
- Provider abstraction robusta.
- Cost tracking confiable.
- Fallbacks.
- Rate limit handling.

**Acción recomendada:**
- Considerar LiteLLM como dependencia opcional o inspiración de adapters.

---

## 6. Aider

**Enfoque:** pair programming en terminal para modificar repos Git.

**Lo mejor que tiene:**
- Git workflow claro.
- Edición directa en repos.
- Terminal-first.
- Soporte de muchos proveedores vía LiteLLM.

**Qué aprender:**
- ENJAMBRE necesita una capa Git sólida.
- Debe generar diffs legibles.
- Debe operar sobre repos existentes.

**Qué NO copiar:**
- No ser solo terminal.
- No sacrificar dashboard y multiagente.

**Qué le falta a ENJAMBRE frente a Aider:**
- Repo map.
- Git integration.
- Patch application.
- CLI opcional.

**Acción recomendada:**
- Añadir CLI secundaria: `enjambre run`, `enjambre diff`, `enjambre agents`.

---

## 7. Continue

**Enfoque:** agente de coding/AI checks integrado a VS Code, JetBrains, CLI y PR checks.

**Lo mejor que tiene:**
- Integración dev profesional.
- Reglas/checks versionadas.
- Enfoque en calidad de PR.
- Menor lock-in.

**Qué aprender:**
- ENJAMBRE debe tener reglas de calidad por repo.
- Debe soportar checks antes de merge.
- Debe generar reportes.

**Qué NO copiar:**
- No enfocarse solo en checks.
- No depender de marketplace.

**Qué le falta a ENJAMBRE frente a Continue:**
- Rules engine.
- PR checks.
- Extensiones IDE.

**Acción recomendada:**
- Crear `rules/` y checks markdown dentro del repo.

---

## 8. LangGraph

**Enfoque:** framework para workflows stateful, long-running agents y human-in-the-loop.

**Lo mejor que tiene:**
- Flujos con estado.
- Human-in-the-loop.
- Ejecución durable.
- Grafo de agentes.

**Qué aprender:**
- ENJAMBRE debe modelar tareas como grafo.
- Debe guardar estado.
- Debe poder pausar/reanudar.

**Qué NO copiar:**
- No exponer al usuario complejidad innecesaria.
- No depender totalmente de LangGraph sin control.

**Qué le falta a ENJAMBRE frente a LangGraph:**
- State machine.
- Persistencia de workflow.
- Reintentos.
- Checkpoints.

**Acción recomendada:**
- Diseñar `TaskGraph` propio simple o integrar LangGraph opcionalmente.

---

## 9. SWE-agent / Open SWE

**Enfoque:** resolver issues, generar cambios, trabajar con GitHub y PRs.

**Lo mejor que tienen:**
- Flujo issue → cambio → PR.
- Orientados a tareas reales.
- Buen enfoque para automatización de repos.

**Qué aprender:**
- ENJAMBRE debe conectarse a GitHub issues.
- Debe crear branch/PR.
- Debe guardar evidencia.

**Qué NO copiar:**
- No lanzar PRs sin revisión.
- No asumir autonomía total.

**Qué le falta a ENJAMBRE frente a SWE-agent/Open SWE:**
- Issue ingestion.
- PR creation.
- Async jobs.
- Evaluación en repos reales.

**Acción recomendada:**
- Crear integración GitHub en Fase 3.

---

# Matriz de oportunidades para ENJAMBRE

| Área | Estado actual | Necesidad |
|---|---|---|
| UI visual | Fuerte | Convertir diseños en componentes reales |
| Multiagente | Conceptual | Crear core de orquestación |
| Proveedores | Conceptual | Crear adapters |
| Legal | Bien encaminado | Convertir en checks dentro de app |
| Seguridad | Débil | Sandbox, secret scanner, approval gates |
| Git | Débil | Diff, branch, commit, PR |
| Logs | Conceptual | Logging estructurado |
| Costos/tokens | Conceptual | Tracking por proveedor |
| Open source | En proceso | Repo limpio, docs y licencia |
| Diferenciador | Prometedor | Enfocarse en consola visual auditable |

