# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
ENJAMBRE sigue versionado semantico aproximado mientras esta en beta.

## [0.7.0] - 2026-07-19

Tool calling: un modelo puede pedir herramientas, ENJAMBRE las ejecuta bajo el mismo
gate humano de siempre y el modelo continua. Objetivo directo: encender los cuatro
proveedores gratuitos (Groq, Cerebras, OpenRouter, GitHub Models), todos OpenAI-compat.

### Anadido
- Modelo de datos de tool calling en `providers/base.py` (`ToolCall`,
  `Message.tool_calls`, `ProviderResult.tool_calls` y `stop_reason`).
  `OpenAICompatProvider` serializa y parsea tool calls. Anthropic y Google aceptan
  `tools=` pero por ahora lo IGNORAN (nativos = pendiente, no bloquea).
- `tools.py`: registro de cuatro herramientas. `list_files` y `read_file` corren solas;
  `write_file` pasa por `ChangeSet.apply` y `run_command` por el Sandbox docker. **No
  reimplementa seguridad: la delega en los gates que ya existian.**
- `agent_loop.py`: `ToolLoop.start` / `.resume`. Las lecturas fluyen; escritura y shell
  PAUSAN el loop en `awaiting_approval` con su preview, y `resume(decisions)` continua.
  Backstop de `max_iters=8` para que un modelo en bucle no corra indefinidamente.
- Endpoints `/tools/run`, `/tools/{id}` y `/tools/{id}/approve`, detras del gate
  `ENJAMBRE_TOOLS`, con eventos SSE (`tool.run.start`, `tool.call`, `tool.run.done`).
- Pestana "Herramientas" en el frontend (gate `VITE_TOOLS`): una tarjeta por llamada,
  con DiffViewer para escrituras y comando mas dry-run para shell, aprobar o rechazar.
- `docs/TOOL_CALLING.md`.

### Notas
- Las herramientas estan APAGADAS por defecto en ambos lados (`ENJAMBRE_TOOLS` y
  `VITE_TOOLS`). Nada cambia si no se encienden.
- Pendiente: tools nativos de Anthropic y Google, y un E2E real con BYOK.

## [0.6.2] - 2026-07-14

Robustez del agente CLI: cierra la deuda W2 de la auditoria ULTRA 2026-07-12 y deja
puesto el andamiaje de contencion real (W3), apagado a proposito hasta verificarlo
en vivo.

### Corregido
- **El timeout del agente CLI solo mataba al proceso padre.** `proc.kill()` dejaba vivos
  a los hijos que `claude` hubiera lanzado. Ahora el subproceso arranca en su propio
  grupo y el timeout mata el arbol completo (`_kill_tree`).
- **TOCTOU entre revisar y aprobar un diff.** El approve volvia a leer el worktree vivo,
  asi que lo aplicado podia no ser lo revisado. Ahora `CliTaskResult.file_contents`
  captura el contenido al terminar la corrida y el approve aplica ESO.
- **El token del sidecar viajaba en la URL del SSE.** `EventSource` no puede mandar
  cabeceras, asi que el token real quedaba en la query string (y en cualquier log que la
  registrara). Se reemplaza por un ticket efimero de un solo uso: `POST /sse-ticket`.
  El frontend reconecta a mano al expirar. El endpoint expone `stop_after` para poder
  testear el stream de forma determinista.

### Anadido
- **Andamiaje de contencion del agente CLI (W3), detras de `ENJAMBRE_CLI_SANDBOX=1`,
  por defecto APAGADO.** `_claude_argv` envuelve `claude` en `docker run` exponiendo
  SOLO el worktree en `/work` y `~/.claude` en read-only; `_egress_flags` arma red
  interna mas proxy (`ENJAMBRE_CLI_NETWORK` / `ENJAMBRE_CLI_EGRESS_PROXY`); sin docker
  falla cerrado; el timeout hace `docker kill`. Imagen en `docker/cli-agent.Dockerfile`.
  Queda OFF hasta verificar en vivo que `claude` arranca dentro del contenedor con su
  propia auth y produce diff: un fail-closed mal empaquetado es un apagon.
- ADR `docs/adr/0001-contencion-agente-cli.md` con la decision y sus alternativas.

## [0.6.1] - 2026-07-13

Pase de robustez, seguridad y pulido visual. Salio de una auditoria completa del
programa (backend + frontend + empaque), no solo del panel.

### Corregido
- **El cockpit reportaba 0 tokens fuera del modo `parallel`.** `Candidate` no arrastraba
  el `usage` del `ProviderResult`, `_multiagent_out` lo falseaba a cero y
  `stats._add_candidate` no lo sumaba: todo run `sequential`/`debate`/`vote` aportaba
  costo pero CERO tokens. Habia un test que **consagraba el bug** (`assert total_tokens
  == 0  # Candidate no guarda usage`); ahora afirma lo contrario.
- **Fallos silenciosos del frontend**: `/run` fallaba sin decir nada (la accion principal
  de la app); sin ErrorBoundary un throw en render dejaba la ventana en blanco; Overview
  y Stats pintaban ceros como datos reales con el sidecar caido; guardar una API key
  invalida o borrar un agente fallaban en silencio; el usuario veia el JSON crudo de
  FastAPI. Se añaden mensajes en español, banner de "sin conexion" y ruta catch-all.
- **El token del sidecar no llegaba de forma fiable a la app empacada.** El shell lo
  empujaba con un `eval` unico y best-effort, pero React renderiza al instante y el
  `EventSource` de `/logs/stream` lee el token UNA sola vez: si el sidecar tardaba (lo
  normal), el stream quedaba abierto sin token para siempre. Y un F5 borraba la variable
  global sin que nadie la reinyectara. Ahora el token vive en estado gestionado y el
  frontend lo PIDE (`invoke('api_token')`), esperandolo antes del primer render.
- **Panel "Actividad por modelo"**: los agentes en error decian "esperando salida..."
  para siempre; el dock pintaba sobre la columna derecha; 5 agentes provocaban 1504px de
  scroll horizontal; la comparativa estaba duplicada; y la clave de dedupe descartaba
  salidas legitimas del mismo agente emitidas en la misma rafaga (perdida de datos).

### Seguridad
- **CSP en el webview** (`app.security.csp`): el paquete v0.6.0 salio con `csp: null` y la
  app **renderiza salida de modelos**. `devCsp` es igual de estricta, asi que
  `cargo tauri dev` prueba la politica real. Listener de `securitypolicyviolation` para
  que nada se rompa en silencio.
- `withGlobalTauri: false`; `process:default` -> `process:allow-restart`; `upx=False` en
  el sidecar congelado (evita falsos positivos de AV sobre un instalador ya firmado).
- **Traversal de LECTURA (P1-2 / P1-3).** `workspace.build_context` componia `root/rel`
  sin resolver, y `/changes/preview` leia el archivo ANTES de validar: `../x` o una ruta
  absoluta exponian archivos fuera del proyecto (por el contexto o por el diff). Nuevo
  helper unico `policy.safe_resolve` (resuelve y exige `relative_to(root)`); ambos validan
  antes de leer. Tests que REPRODUCEN el ataque.
- **El agente CLI ya no hereda las claves BYOK (P1-1).** El subproceso `claude` recibia
  TODO el entorno del sidecar, incluidas `OPENAI_API_KEY`/etc., que podia leer y exfiltrar
  aunque su diff no se aprobara. Ahora se le pasa un `env` minimo (solo vars de sistema);
  su auth de Anthropic sale de su config (`~/.claude`). El worktree solo aisla ESCRITURAS:
  la contencion real de FS/red queda para v0.6.2 (documentado sin adornos).
- **`/cli/run` ya no reporta exito silencioso (P1-5).** Devolvia `ok=true` sin mirar el
  `returncode`; un `claude` caido se veia como una corrida vacia exitosa. Ahora `ok=false`
  con el codigo de salida.
- **El prompt ya no se persiste en claro (P1-7).** `sessions.save` redacta el JSON completo
  antes de escribir; una API key pegada en el prompt (o en una salida) ya no queda en disco.
- **Allowlist de roots exigida en el paquete (P1-8).** Registrar un proyecto valida contra
  `ENJAMBRE_ALLOWED_ROOTS`; el instalador la fija a la carpeta del usuario, asi que registrar
  `C:\Windows` u otra ruta de sistema se rechaza al registrarlo.
- **Costo del arquitecto contabilizado (P2-1).** El pase de revision (verdicts) tiene costo
  propio que `/stats` no sumaba; `vote`/`debate` subestimaban el costo. Cierra el bug de
  tokens que 0.6.1 ya arreglaba para los candidatos.
- Verificacion del token con `secrets.compare_digest` (P2-6, tiempo constante).
- **Docs honestos:** `SECURITY.md` (el token NO protege de malware del mismo usuario;
  seccion de contencion del agente CLI), `docs/CLI_AGENT.md` y `CLAUDE.md` (el worktree
  aisla solo escrituras; el CLI esta cableado a `claude`, el multi-modelo es de los agentes
  tipo API).

### Interfaz y accesibilidad
- **Motion:** el knob del Toggle animaba `left` (layout) con `transition-all`; ahora usa
  `transform: translateX` con transicion solo de `transform` (extraido a `ui/Toggle`,
  reutilizado en RunPage y AppShell). `prefers-reduced-motion` ya no aniquila TODO: detiene
  las animaciones en bucle y conserva las transiciones cortas de opacidad/color.
- **Foco visible:** `outline` real (2px) en vez de solo `box-shadow`, que cualquier
  `boxShadow` inline destruia y cualquier ancestro `overflow-hidden` recortaba.
- **A11y:** `ProjectSelector` cierra con Escape / clic-fuera y CONFIRMA antes de borrar un
  proyecto; `ProjectsPage` (la pantalla que escribe archivos) gana `aria-label` en sus
  inputs + `role=alert` en los errores.
- **Reglas de UI (espanol, sin Unicode decorativo):** fuera el `✓` de SplashScreen (icono
  lucide); `StatusIcon` ya no filtra ingles al `aria-label`; literales `#ffb020` -> `var(--amber)`.
- **Design system:** un solo header de panel (mono/uppercase/tracking; habia 3 variantes),
  nuevos `ui/EmptyState` y `ui/Dot` compartidos, `Panel`/`PageHeader` adoptados en
  BottomRow/Conversations/FilePanel/Overview y DeployPage rescatada.

### Cambiado
- Una sola conexion SSE a `/logs/stream` (habia **tres**), en `stores/log-store.ts`.
- Fuera codigo muerto (4 componentes) y la dependencia `recharts`; fuera `rich` (declarada
  y jamas importada). `fmtTokens`/`fmtCost`/`statusColor` a `lib/`.
- Precios centralizados y **fechados** (`providers/pricing.py`, `PRICING_AS_OF`);
  `/providers` los marca como estimacion. Siguen siendo estimaciones, no facturacion.
- CI: job `desktop` nuevo (`cargo check` + `clippy -D warnings`). El shell Tauri no se
  compilaba en CI; por eso se colo el bug de `externalBin` en E5.
- `enjambre-sidecar.spec` deja de estar gitignoreado: es la receta de empaque, no un
  artefacto autogenerado.

## [0.6.0] - 2026-07-11

Endurecimiento, agente CLI y superficie de operaciones. **PUBLICADA**: instalador
`ENJAMBRE_0.6.0_x64-setup.exe` firmado (auto-update estrenado; el sidecar congelado ya
trae host-guard + token + rate limit, a diferencia del paquete v0.5.0).

### Agregado
- Seguridad del sidecar DEFAULT-ON: token autogenerado/persistido (X-API-Token),
  guard anti DNS-rebinding (solo Host loopback), rate limit token-bucket (240/8),
  y job `audit` en CI (pip-audit + npm audit) que falla ante CVE.
- Agente CLI (opt-in `ENJAMBRE_CLI_AGENTS` / `VITE_CLI_AGENTS`): Claude Code headless
  en un git worktree aislado por run; el diff se aplica bajo aprobacion humana via
  `ChangeSet.apply`. Guia en `docs/CLI_AGENT.md`.
- F1 OPS HUD (opt-in `VITE_HUB_DEPLOY`): el sidecar proxea el hub de CD
  (`/hub/status` `/hub/deploy/{app}` `/hub/history` `/hub/rollback/{app}/{commit}`
  `/hub/events`), con el JWT del hub guardado server-side y stream de progreso WS->SSE.
- Panel "Actividad por modelo" (opt-in `VITE_ACTIVITY_DOCK`): dock inferior estilo
  Jules en la pestana Lanzar; carriles por agente + step badges + tarjetas tipadas
  (mensaje/codigo/tool-call) + comparativa lado-a-lado. Evento SSE `agent.output`
  tipado (`kind` message|code|tool_call). Respeta el gate humano (no auto-aplica).
- Tauri E5.1: token del sidecar cableado al webview (parseado del stdout del sidecar).

### Cambiado
- Sidecar: ~29 endpoints (crecio con `/cli/*`, `/hub/*`, `/changes/*`).
- Core: 26 modulos, ~4200 LOC, 214 tests.

[0.6.0]: https://github.com/AbrahamRdzSus/enjambre/releases/tag/v0.6.0

## [0.5.0] - 2026-06-23

Primer release publico (beta). Core de orquestacion real + app de escritorio.

### Agregado
- Core de orquestacion REAL (Fases 1-5 del roadmap), ~3450 LOC, 170 tests:
  - Orquestacion paralela async con gate de secretos (scanner + redaccion).
  - Multiagente: roles architect/builder; modos parallel/sequential/debate/vote;
    comparacion por criterios y review por gate congelado.
  - Workspace seguro: ChangeSet.apply bajo aprobacion humana, con bloqueo de
    path-traversal, archivos sensibles y secretos.
  - Sandbox Docker (`--network none`) para ejecutar pruebas de forma aislada.
  - Integracion GitHub/PR. Provider SDK extensible (OpenAI-compat, Anthropic, Google, xAI).
- Superficies de uso: CLI `enjambre`, sidecar HTTP `enjambre.api` (FastAPI, 20 endpoints
  + `/logs/stream` SSE), dashboard React (look cockpit) y app de escritorio Tauri 2.
- Instalador de Windows (NSIS) `ENJAMBRE_0.5.0_x64-setup.exe` con el sidecar congelado
  (PyInstaller) auto-arrancado desde Tauri. Datos de usuario en `%APPDATA%/enjambre`.
- BYOK (las claves del usuario viven en memoria por sesion; nunca se persisten).

### Notas
- Proyecto en beta/experimental. Apache-2.0.
- El instalador aun no esta firmado: Windows SmartScreen puede pedir confirmacion.
- Los costos mostrados son ESTIMACIONES, no facturacion real.
- ENJAMBRE no entrena ni revende modelos de terceros.

[0.5.0]: https://github.com/AbrahamRdzSus/enjambre/releases/tag/v0.5.0
