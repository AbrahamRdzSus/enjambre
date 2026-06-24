# HANDOFF — enjambre

> Memoria viva del repo. El repositorio (este archivo + git + `docs/gates/`) es la
> unica fuente de verdad entre sesiones y entre agentes. No dependas de contexto
> que viva fuera del repo. Manten este archivo PODADO: indice, no historia completa.

## Estado actual
- Rama / version: feature/nucleo-real / core v0.5.0 (main entra por PR). Ultimo
  commit: instalador NSIS + sidecar congelado (Fase B del levantamiento).
- Core REAL en `src/enjambre/` (~3450 LOC, 29 modulos, 170 tests verdes). Fases
  1-5 del ROADMAP tecnico implementadas; Fase 6 (SDK) parcial:
  - FASE 1 - orquestacion real: adapters httpx (OpenAI/xAI compat, Anthropic,
    Google) con validate_key/chat/estimate_cost; `registry.py` (UTF-8, tolera
    UTF-16 heredado); `config.py` (proveedor->env); `orchestrator.py` (despacho
    PARALELO asyncio, solo lectura); `policy.py` (secret scanner + redaccion).
  - FASE 2 - workspace seguro: `workspace.py` (arbol respeta .enjambreignore +
    BLOCKED_FILES, contexto redactado); `changes.py` (Change/ChangeSet, unified
    diff, apply() bajo aprobacion humana: rechaza sin approved, bloquea path
    traversal/archivos sensibles/secretos, atomico, branch temporal git opcional).
  - FASE 3 - multiagente: `multiagent.py` roles architect/builder; modos
    parallel/sequential/debate/vote; comparacion por criterios; review por gate.
  - FASE 4 - github/PR: `github.py`, `gitops.py`, `pull_request.py`.
  - FASE 5 - sandbox: `sandbox.py` (docker `--network none`, bloquea comandos
    peligrosos, reporta resultados).
  - FASE 6 (parcial) - extensibilidad: `extensions.py` + Provider SDK
    (`providers/base.py`); ver `docs/PLUGIN_SDK.md`. Falta comunidad/benchmarks.
- Superficie de consumo:
  - `app.py` (Streamlit): consume el core real, sin simulacion. PROTOTIPO de UI.
  - CLI `enjambre` (`cli.py`): agentes/providers/validate/run/sessions; soporta
    agentes declarativos (`enjambre.yaml`, parser propio sin pyyaml).
  - Sidecar HTTP `enjambre.api` (FastAPI, 20 endpoints incl. `/logs/stream` SSE;
    auth opt-in via ENJAMBRE_API_TOKEN + allowlist ENJAMBRE_ALLOWED_ROOTS).
  - Frontend React (`frontend/`) sobre el sidecar; app de escritorio Tauri 2
    (`tauri/`) con sidecar PyInstaller auto-spawn -> instalador NSIS
    `ENJAMBRE_0.5.0_x64-setup.exe` (Fase B levantamiento COMPLETA).
- Datos de usuario: `enjambre.paths.data_dir()` -> `%APPDATA%/enjambre` (override
  ENJAMBRE_DATA_DIR). registry/sessions/projects/stats persisten ahi.

## Siguiente paso
1. Fase A levantamiento (diseño final): integrar el cockpit v0
   (`diseno/frontend-v0-Cockpit.zip`) -> tokens shadcn + componentes a Vite/
   Tailwind4 cableados a hooks reales (useAgents/useStats/useRun/useLogs);
   replicar el lenguaje en las pestañas restantes.
2. Fases C+D levantamiento: landing estatica en Vercel + GitHub Release con el
   instalador ya horneado + `tauri-plugin-updater` (Eye ya lo usa).
Ver `docs/ROADMAP.md` (tecnico, Fases 0-6) y `docs/ROADMAP_LEVANTAMIENTO.md`
(producto distribuible, Fases A-E).

## Decisiones congeladas
<!-- Decisiones que NO se vuelven a discutir sin una razon nueva. Linkea el commit/gate. -->
- Fase 1 (orchestrator) es SOLO LECTURA: nunca escribe ni ejecuta archivos. La
  escritura llega via `changes.py` bajo aprobacion humana (gate fase2).
- Proveedores soportados y nombres canonicos en `providers/__init__.py` (PROVIDERS),
  mapeados a env vars en `config.PROVIDER_ENV` (= .env.example).
- BYOK: el core nunca persiste claves; viven en memoria por sesion.
- Destino de UI: Tauri 2 + React (shell tipo obsidia-skeleton-desktop / Obsidia
  Eye) con `src/enjambre` como sidecar. Streamlit es prototipo, no el destino.
- El dashboard NO se hostea (local-first, necesita sidecar local): se distribuye
  como instalador. Solo la landing va a web.

## Riesgos / bloqueos abiertos
- ACCION DEL USUARIO: rotar/revocar las 2 claves filtradas en la carpeta vieja
  (OpenAI sk-proj-..., Gemini AQ.Ab8...). No estan en el repo canonico.
- Precios en los adapters son ESTIMACIONES (no facturacion real); revisar antes
  de mostrar costo a usuarios de pago.
- (Opcional) sin firma Authenticode: el instalador dispara SmartScreen.
- Pendiente en working tree: `agents/registered.json` modificado + `.zip` de
  diseño sin trackear.

## Gates de aceptacion (docs/gates/)
Gates congelados presentes: core-real-orchestration, fase2-workspace-seguro,
fase3-multiagente, fase4-github-prs, fase5-sandbox, fase6-sdk. Antes de un cambio
grande, escribe el criterio en `docs/gates/<slice>.md` y CONGELALO (no lo edites
para que pase el trabajo a posteriori). Un gate define: que entra, que NO entra y
como se verifica. El que ejecuta cumple el gate; un pase de revision SEPARADO juzga
el diff contra la intencion, no solo "pasan los tests".

## Protocolo de trabajo (resumen)
1. SCOUT: reconocimiento barato del area antes de planear (no plantillas fijas).
2. GATE: congela criterios en `docs/gates/`.
3. EJECUTA: cambios del tamano de un PR; aislar trabajo paralelo (worktrees) si aplica.
4. REVISA: pase separado que lee el diff contra la intencion + corre los gates.
5. ACTUALIZA este HANDOFF y poda lo viejo.

_Ultima actualizacion: 2026-06-23_
