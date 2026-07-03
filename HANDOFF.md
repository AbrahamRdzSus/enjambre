# HANDOFF — enjambre

> Memoria viva del repo. El repositorio (este archivo + git + `docs/gates/`) es la
> unica fuente de verdad entre sesiones y entre agentes. No dependas de contexto
> que viva fuera del repo. Manten este archivo PODADO: indice, no historia completa.

## Estado actual
- Rama / version: feat/desktop-swarmflow-agentcard / core v0.5.0 (main entra por
  PR). Ultimo commit: mockups diseno/ trackeados como cantera (6735f96). Antes:
  spec agente CLI v1 (fa10acb) + tanda cockpit desktop (SwarmFlow/AgentCard/
  DiffViewer/Overview 3 columnas/pass legibilidad).
- Cockpit INTEGRADO y vigente: /overview con components/overview/* + AppShell +
  Panel.tsx replicando el lenguaje en todas las pestañas, cableado a hooks
  reales. diseno/ (scaffold v0 Next.js) es SOLO cantera de referencia, ya
  consumida; su duplicado e-commerce-nexus-dashboard/ quedo en .gitignore.
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
1. Fase A levantamiento (diseño final): integrar el cockpit v0. HECHO el slice
   Overview (tokens shadcn via `@theme inline` + utilidades glass/glow en index.css;
   `components/overview/` MetricsRow/Conversations/FilePanel/BottomRow cableados a
   hooks reales; HexSwarm como orquestacion live; sin mock). Gate:
   `docs/gates/faseA-cockpit-overview.md`. HECHO tambien la replica del lenguaje cockpit
   en las 5 pestañas restantes via chrome reutilizable `components/ui/Panel.tsx`.
   HECHAS Fases C+D: landing publica en `landing/` (React/Vite + Magic UI; Hero/Features/
   Screenshots/HowItWorks/Download/Footer) y GitHub Release `v0.5.0` (latest) con el
   instalador + `CHANGELOG.md`. El repo es PUBLICO (descarga anonima verificada 200).
   La descarga se resuelve en runtime (`useLatestInstaller`, sin hardcodear version).
   Seguridad: secret scanning + push protection habilitados; historial limpio.
   Landing DESPLEGADA en Vercel (proyecto "landing") y LIVE en dominio propio:
   https://enjambre.obsidia.mx (A enjambre -> 76.76.21.21 DNS-only en Cloudflare;
   cert SSL emitido con `vercel certs issue`). CI cubre ahora frontend+landing (job web).
   PENDIENTE menor: opcional renombrar el proyecto Vercel "landing" -> "enjambre";
   OG social card 1200x630; refrescar screenshots al look cockpit nuevo.
2. Seguridad sidecar (ANTES del agente CLI): token default-on autogenerado +
   handshake Tauri; validar Host/Origin (anti DNS-rebinding); confirmar bind
   127.0.0.1; pip-audit + pin de deps en CI.
3. Agente CLI: /build de `specs/cli-agent-v1.md` (Claude Code headless en
   worktree aislado).
4. Release real: `tauri-plugin-updater` con firma (patron de Eye) + script de
   release unico (PyInstaller+NSIS+Release).
5. Precios: consumir el JSON de precios de litellm en vez de estimaciones
   hardcodeadas en los adapters.
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
- RESUELTO 2026-07-03: las 2 claves filtradas en la carpeta vieja (OpenAI sk-proj-...,
  Gemini AQ.Ab8...) fueron rotadas/revocadas por el usuario. No estaban en el repo
  canonico (arbol e historial limpios).
- Precios en los adapters son ESTIMACIONES (no facturacion real); revisar antes
  de mostrar costo a usuarios de pago.
- (Opcional) sin firma Authenticode: el instalador dispara SmartScreen.
- Sidecar: auth es OPT-IN (ENJAMBRE_API_TOKEN); endurecer a default-on +
  validacion Host/Origin antes de crecer la superficie (agente CLI).

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

_Ultima actualizacion: 2026-07-01_
