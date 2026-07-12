# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
ENJAMBRE sigue versionado semantico aproximado mientras esta en beta.

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
