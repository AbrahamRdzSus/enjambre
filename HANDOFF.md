# HANDOFF — enjambre

> Memoria viva del repo. El repositorio (este archivo + git + `docs/gates/`) es la
> unica fuente de verdad entre sesiones y entre agentes. No dependas de contexto
> que viva fuera del repo. Manten este archivo PODADO: indice, no historia completa.

## Estado actual
- Rama / version: **v0.6.0 PUBLICADA** (instalador NSIS firmado + auto-update vivo;
  E5 CERRADO). En curso **v0.6.1** en la rama `feat/v0.6.1-robustez`: pase de
  robustez + seguridad + pulido visual, salido de una **auditoria completa del
  programa** (backend + frontend + empaque), no solo del panel.
- Cockpit INTEGRADO y vigente: /overview con components/overview/* + AppShell +
  Panel.tsx replicando el lenguaje en todas las pestañas, cableado a hooks
  reales. diseno/ (scaffold v0 Next.js) es SOLO cantera de referencia, ya
  consumida; su duplicado e-commerce-nexus-dashboard/ quedo en .gitignore.
- Core REAL en `src/enjambre/` (~4200 LOC, 26 modulos, 214 tests verdes). Fases
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
  - Sidecar HTTP `enjambre.api` (FastAPI, ~29 endpoints incl. `/cli/*` `/hub/*`
    `/changes/*` + `/logs/stream` SSE). Seguridad DEFAULT-ON: token autogenerado,
    guard anti DNS-rebinding, rate limit; allowlist opt-in ENJAMBRE_ALLOWED_ROOTS.
  - Frontend React (`frontend/`) sobre el sidecar; incluye panel "Actividad por
    modelo" (dock estilo Jules, flag `VITE_ACTIVITY_DOCK`) y OPS HUD (`VITE_HUB_DEPLOY`).
  - App de escritorio Tauri 2 (`tauri/`) con sidecar PyInstaller auto-spawn ->
    instalador NSIS publicado `ENJAMBRE_0.5.0_x64-setup.exe`; el paquete v0.6.0 se
    genera en E5 (recongelar el sidecar para que corra el backend nuevo).
- Datos de usuario: `enjambre.paths.data_dir()` -> `%APPDATA%/enjambre` (override
  ENJAMBRE_DATA_DIR). registry/sessions/projects/stats persisten ahi.

## Siguiente paso

### HECHO (mergeado)
- Fase A cockpit integrado (Overview + replica del lenguaje en las 5 pestañas via
  `components/ui/Panel.tsx`). Gate `docs/gates/faseA-cockpit-overview.md`.
- Fases C+D: landing publica en `landing/` LIVE en https://enjambre.obsidia.mx
  (Vercel, cert SSL) + GitHub Release `v0.5.0` (latest) con el instalador. Repo PUBLICO.
- Seguridad sidecar DEFAULT-ON: token autogenerado + handshake Tauri (E5.1), guard
  anti DNS-rebinding (Host loopback), rate limit token-bucket, audit CVE en CI.
- Agente CLI (`specs/cli-agent-v1.md`): Claude Code headless en worktree aislado,
  diff bajo aprobacion humana. Opt-in `ENJAMBRE_CLI_AGENTS`. Doc `docs/CLI_AGENT.md`.
- F1 OPS HUD: proxy del sidecar al hub de CD (status/deploy/history/rollback + stream
  WS->SSE), JWT del hub server-side. Opt-in `VITE_HUB_DEPLOY`.
- Panel "Actividad por modelo" (dock estilo Jules): carriles por agente + step badges
  + tarjetas tipadas + comparativa lado-a-lado. Opt-in `VITE_ACTIVITY_DOCK`. Spec
  `specs/panel-actividad-por-modelo.md`.

- **E5 EMPAQUE/RELEASE COMPLETO (2026-07-11)**: sidecar recongelado con el backend nuevo,
  fix `externalBin` (Tauri añade el target-triple), par de claves de firma (privada+pass
  con el usuario: `~/.tauri/enjambre.key` + vault `04-compartido/keystores`, NUNCA en git),
  build firmado y **Release v0.6.0 PUBLICADO** (latest) con `ENJAMBRE_0.6.0_x64-setup.exe`
  + `.sig` + `latest.json`. El endpoint del updater
  (`releases/latest/download/latest.json`) resuelve 200. e2e verificado en vivo: la app
  empacada arranca sin 401, BYOK funciona, panel y pestaña Agente CLI visibles.

### v0.6.1 EN CURSO (rama `feat/v0.6.1-robustez`)

HECHO y commiteado (6 slices; tsc/eslint/build + 218 pytest + cargo check/clippy verdes):
- **D0 robustez** (`45f2d7e`): la app **mentia sobre su estado**. `/run` fallaba en
  silencio (accion principal!); sin ErrorBoundary un throw = ventana en blanco; Overview
  y Stats pintaban **ceros como datos reales** con el sidecar caido; mutaciones de
  AgentsPage mudas; el usuario veia el JSON crudo de FastAPI. `lib/errors.ts`,
  `ui/ErrorBoundary`, `ui/OfflineBanner`, ruta catch-all.
- **D1 panel** (`5e2a79b`): rediseño (mockup aprobado) + 2 bugs propios: la clave de
  dedupe **perdia salidas** del mismo agente en la misma rafaga, y ToolCallBody pegaba a
  `/cli/*` sin gatear. Estado honesto por `lane.status`, sin invasion, sin overflow,
  motion interrumpible, contrato `agent.output` tipado (union API|CLI).
- **D2 SSE** (`151cd74`): habia **TRES** EventSource al mismo endpoint -> uno
  (`stores/log-store.ts`). Fuera 4 componentes muertos + `recharts`.
- **D3 backend** (`7090227`): **el cockpit reportaba 0 tokens fuera de `parallel`**
  (Candidate no arrastraba `usage`). Un test **consagraba el bug**. 4 tests nuevos.
  Precios centralizados y FECHADOS (no inventados: no puedo verificarlos).
- **D4 seguridad** (`f1c1616`): **CSP** (el paquete v0.6.0 salio con `csp: null` y la app
  renderiza salida de modelos). `enjambre-sidecar.spec` estaba **gitignoreado**: la receta
  de empaque no se versionaba.
- **D4b token** (`a82e1e1`): la ruta del token **estaba rota** (carrera + F5 la borraba).
  De push (`eval`, que la CSP puede bloquear) a **pull** (`invoke('api_token')`, esperado
  antes del primer render). CI: job `desktop` (cargo check + clippy), que **no existia** —
  por eso se colo el bug de `externalBin` en E5.

PENDIENTE de v0.6.1:
1. **D5**: design system (Panel/PageHeader a medias; DeployPage lo ignora), motion #1
   (Toggle anima `left` con `transition-all`) y #3 (reduced-motion aniquila todo), foco
   visible (hoy solo `box-shadow`, lo recorta cualquier `overflow-hidden`), a11y.
2. **D6**: resto de docs + subir version a 0.6.1 en los **4** sitios (pyproject,
   tauri.conf.json, Cargo.toml, **frontend/package.json, que sigue en 0.1.0**).
3. **E**: build firmado (**lo hace el usuario; el agente NO toca la clave privada**) y
   Release. El auto-update desde v0.6.0 debe ofrecerla -> valida el updater end-to-end.

### PENDIENTE (despues de v0.6.1)
- Precios: consumir el JSON de litellm en vez de estimaciones fechadas a mano.
- Decidir el destino de la **superficie SDK sin cablear**: `github.py`/`gitops.py`/
  `pull_request.py` (Fase 4) y `sandbox.py` (Fase 5) tienen tests pero NO estan
  conectados a `api.py` ni `cli.py`; `gates.py` es inalcanzable desde la API (nunca se
  pasa `gate`). No es codigo muerto: es alcance sin cablear. No anunciarlos como features.
- `app.py` (Streamlit) funciona pero esta rezagado: congelarlo como demo o retirarlo.
- Pulido menor: OG social card 1200x630; refrescar screenshots al look cockpit.
Ver `docs/ROADMAP.md` (tecnico, Fases 0-6), `docs/ROADMAP_E5.md` (empaque) y
`docs/ROADMAP_LEVANTAMIENTO.md` (producto distribuible, Fases A-E).

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
- RESUELTO: la auth del sidecar es DEFAULT-ON (token autogenerado + guard anti
  DNS-rebinding + rate limit; commits e2b438a/ed4ec37/2e912a8). Ya no es opt-in.

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

_Ultima actualizacion: 2026-07-11_
