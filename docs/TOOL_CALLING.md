# Tool calling (agentes tipo "API" que usan herramientas)

Los agentes tipo "API" (`providers.base.BaseProvider.chat`) ya no son de un solo tiro: un
modelo puede **emitir una llamada a herramienta, Enjambre la ejecuta bajo el gate humano, y el
modelo continua con el resultado** (loop modelo -> herramienta -> modelo). Es la via para que un
agente free (Groq, Cerebras, OpenRouter, GitHub Models) lea el proyecto, proponga cambios y corra
comandos sin dejar de pasar por la aprobacion humana de Obsidia.

Implementacion: `src/enjambre/tools.py` (registro), `src/enjambre/agent_loop.py` (loop),
endpoints `/tools/*` en `src/enjambre/api.py`, `frontend/src/pages/ToolsPage.tsx`. Plan:
`toasty-toasting-moonbeam` (slices T0-T6).

## Las 4 herramientas y su gate

| Herramienta | Peligro | Que hace | Gate |
|-------------|---------|----------|------|
| `list_files` | read | lista archivos del proyecto (`workspace.iter_files`) | auto (no destructivo) |
| `read_file` | read | lee un archivo (`workspace.build_context`: redacta secretos, bloquea `.env`, anti-traversal) | auto |
| `write_file` | write | crea/sobrescribe (`changes.ChangeSet.apply`, approved=True) | **PAUSA + aprobacion humana** |
| `run_command` | shell | corre en sandbox docker `--network none` (`sandbox.Sandbox`, denylist `commands`) | **PAUSA + aprobacion humana** |

Las de LECTURA se auto-ejecutan: no son destructivas y ya pasan por redaccion/bloqueo/
anti-traversal. Las de ESCRITURA/SHELL pausan el loop (`awaiting_approval`) y esperan la decision
humana. El registro NO reimplementa seguridad: la delega en los gates existentes.

## Invariante de seguridad (y sus limites)

- `write_file` y `run_command` NUNCA ejecutan sin `approved=True`. Reusan exactamente
  `ChangeSet.apply` / `Sandbox.run`, que validan traversal, archivos bloqueados, secretos y
  denylist antes de tocar nada.
- `read_file` pasa por `build_context`: redacta secretos, bloquea `.env`, valida traversal via
  `policy.safe_resolve`. El modelo nunca ve una API key aunque pida el archivo que la contiene.
- `run_command` fuerza docker `--network none`. **Fail-closed:** sin docker se BLOQUEA, nunca cae
  al host. El denylist `commands.check_command` se aplica siempre, incluso antes de aprobar.
- El prompt se escanea por secretos antes de salir a la red (como `orchestrator.run`).
- Backstop `max_iters` (default 8) contra bucles de tool calls.

## Activacion

Opt-in por flag en las dos capas; apagado por defecto y **NO auto-on en el paquete** en este
primer corte (a diferencia del agente CLI).

- Sidecar: `ENJAMBRE_TOOLS=1` habilita `/tools/run`, `/tools/{id}`, `/tools/{id}/approve`. Sin el,
  los endpoints ni existen.
- Frontend: `VITE_TOOLS=1` muestra la pestana "Herramientas". Sin el, la ruta y el nav no existen.

```
ENJAMBRE_TOOLS=1 uvicorn enjambre.api:app --host 127.0.0.1 --port 8000
cd frontend && VITE_TOOLS=1 npm run dev
```

## Flujo end-to-end (dashboard)

1. Selecciona un proyecto en el header (ancla el loop a su carpeta, via allowlist `_ensure_root`).
2. Pestana "Herramientas" -> describe la tarea -> "Lanzar tarea".
3. Si el modelo solo lee, el loop corre solo y muestra la respuesta final.
4. Si pide escribir/correr shell, aparece una tarjeta por llamada (write -> diff; shell -> comando
   + dry-run). Aprueba o rechaza cada una y "Enviar decisiones y continuar".
5. El modelo recibe el resultado (o el rechazo) y sigue hasta la respuesta final (iteraciones,
   tokens y costo al pie).

## Proveedores

OpenAI-compat (`OpenAICompatProvider`) enciende de golpe: `openai`, `xai` y los 4 free
(`groq`, `cerebras`, `openrouter`, `github_models`). Sus modelos por defecto soportan tool calling
estilo OpenAI (Llama 3.3 70B, gpt-4o-mini).

- Groq / Cerebras / GitHub Models: tool calling confiable.
- OpenRouter `:free`: variable segun el modelo ruteado.
- Anthropic y Google: `chat()` acepta `tools=` por uniformidad pero aun los IGNORA (tools nativos
  = slice T5, diferido). Los BYOK de pago via estos adapters todavia no emiten tool calls.

Ver cuotas y terminos en `PROVIDER_POLICY.md`.

## Verificacion E2E real (pendiente, requiere BYOK)

Con una key free de Groq, un prompt que dispare `read_file` (auto) -> `write_file` (aprobar) ->
`run_command` tests (aprobar docker), verificando que el modelo continua con cada resultado. El
agente no tiene claves (BYOK); esta verificacion la corre el usuario. Tests offline (mock):
`tests/test_providers.py`, `tests/test_tools.py`, `tests/test_agent_loop.py`, `tests/test_api_tools.py`.
