# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
ENJAMBRE sigue versionado semantico aproximado mientras esta en beta.

## [0.6.1] - EN CURSO

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
