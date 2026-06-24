# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).
ENJAMBRE sigue versionado semantico aproximado mientras esta en beta.

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
