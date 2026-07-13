# ENJAMBRE (Obsidia Studio)

> Proyecto del ecosistema Obsidia (rama Studio). Instrucciones para agentes de IA.
> Manten este archivo CORTO: se reinyecta en cada sesion.

## Que es
ENJAMBRE: orquestador local-first de agentes IA de codificacion (Grok/Claude/
Codex/Gemini/Jules en paralelo) con dashboard, comparacion de salidas y gate de
aprobacion humana. Capa de orquestacion/UI — NO entrena ni revende modelos (BYOK).
Stack: core Python (`src/enjambre`) + sidecar HTTP FastAPI + frontend React/Vite +
app de escritorio Tauri 2; Streamlit (`app.py`) es prototipo. Apache-2.0.

## Estado
Core REAL en `src/enjambre/` (~4200 LOC, 27 modulos, 218 tests verdes): Fases 1-5
del ROADMAP implementadas (Fase 6/SDK parcial) — orquestacion paralela async con
gate de secretos, multiagente (roles architect/builder; modos parallel/sequential/
debate/vote; review por gate congelado), workspace seguro (ChangeSet.apply bajo
aprobacion + path-traversal + secret-scan), sandbox docker `--network none`,
github/PR, Provider SDK extensible. Ademas: seguridad del sidecar default-on (token,
guard anti DNS-rebinding, rate limit, audit CI), agente CLI (worktree + approve),
F1 OPS HUD (proxy al hub de CD) y panel "Actividad por modelo" (dock estilo Jules).
Consumo: CLI `enjambre`, sidecar `enjambre.api` (FastAPI, ~28 endpoints incl.
`/cli/*` `/hub/*` `/changes/*` + `/logs/stream` SSE), frontend React y app Tauri 2
(instalador NSIS **v0.6.0 PUBLICADO y firmado**, con auto-update; sidecar PyInstaller
auto-spawn; el webview corre con CSP y pide el token por `invoke('api_token')`).
En curso: **v0.6.1** (pase visual + robustez + CSP). 218 tests.
`app.py` (Streamlit) consume el core real pero es **prototipo de UI**, no el destino:
el destino es **Tauri 2 + React** (shell desde `obsidia-skeleton-desktop`,
arquitectura de referencia tipo Obsidia Eye) con `src/enjambre` como sidecar Python.
Ver `REPO.md`, `HANDOFF.md`, `docs/ROADMAP.md`, `docs/ROADMAP_LEVANTAMIENTO.md`.

## Reglas duras (ENJAMBRE)
- Idioma: ESPANOL. Progreso/info en texto plano y tablas, SIN emojis/Unicode.
- BYOK: el usuario trae sus propias API keys. NUNCA incluir, commitear ni filtrar
  claves. `.env` esta gitignoreado; `.env.example` solo placeholders.
- Toda accion destructiva (escribir/borrar archivos, ejecutar, commit, push,
  instalar deps) pasa por **aprobacion humana**.
- NO entrenar, ajustar ni distilar modelos de terceros con sus outputs; respetar
  rate limits, filtros y terminos de cada proveedor (ver `PROVIDER_POLICY.md`).
- Marcas de terceros (OpenAI, Anthropic, Google, xAI, GitHub) son de sus titulares.

## Como correr
```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # rellenar con TUS keys
streamlit run app.py     # GUI prototipo (consume el core real)
# o la CLI (sin GUI, usa el core real):
enjambre agents          # lista agentes | providers | validate | run "<prompt>" | sessions
enjambre --config enjambre.yaml agents   # agentes declarativos (parser propio, sin pyyaml)
# o el sidecar HTTP (capa para el frontend React; extra opcional [api]):
pip install -e ".[api]"; uvicorn enjambre.api:app --host 127.0.0.1 --port 8000
# seguridad (opt-in): ENJAMBRE_API_TOKEN (auth), ENJAMBRE_ALLOWED_ROOTS (allowlist
# de carpetas para /workspace), ENJAMBRE_API_DEV=1 (habilita /docs, apagado por def).
# seguridad (default-on): (1) guard anti DNS-rebinding: solo atiende requests con Host
# loopback (127.0.0.1/localhost/::1); anadir hosts con ENJAMBRE_ALLOWED_HOSTS o "*".
# (2) token del sidecar: en arranque puro exige X-API-Token; se autogenera/persiste en
# <data_dir>/api-token e imprime en stdout. Dev: `npm run dev` corre un predev que lo
# carga a VITE_API_TOKEN (arranca el sidecar primero). (3) rate limit token-bucket
# default 240/8 (ENJAMBRE_RATE_LIMIT="cap/refill", "0" desactiva). Detalle: SECURITY.md.
# agente CLI: ENJAMBRE_CLI_AGENTS=1 habilita los endpoints /cli/* (lanza Claude Code
# headless en un git worktree y aplica su diff bajo aprobacion). El worktree aisla
# ESCRITURAS, no lecturas/red; el subproceso corre sin claves BYOK en el entorno
# (cli_agent._clean_env); contencion real de FS/red = v0.6.2. Requiere el binario
# `claude` en el PATH del sidecar. Frontend: VITE_CLI_AGENTS=1 (pestana
# "Agente CLI"). OJO: opt-in en el SIDECAR SUELTO, pero ACTIVO en la app EMPAQUETADA
# (tauri/src/lib.rs lo pone; si no, la pestana no serviria de nada en el paquete). El
# gate humano sigue intacto: aprobar exige POST /cli/{id}/approve.
# Guia + ejemplo end-to-end (curl y dashboard): docs/CLI_AGENT.md.
# panel "Actividad por modelo" (opt-in): VITE_ACTIVITY_DOCK=1 muestra el dock
# inferior estilo Jules en la pestana Lanzar (carriles por agente + comparativa).
# OPS HUD (opt-in): VITE_HUB_DEPLOY=1 + ENJAMBRE_HUB_URL/ENJAMBRE_HUB_PIN cablea el
# proxy del sidecar al hub de CD (deploy/rollback). Sin los flags, nada cambia.
# frontend React (dashboard, consume el sidecar; ver frontend/):
cd frontend; npm install; npm run dev   # http://localhost:5173 (sidecar en :8000)
# app de escritorio (Tauri 2; requiere Rust+MSVC, ver docs/MIGRATION_TAURI.md):
cd tauri; cargo tauri dev     # ventana nativa | cargo tauri build = .exe/instalador
# o el hub de consola Windows:
.\enjambre-hub.ps1
```

## Como probar
```
pip install -e ".[dev]"
pytest -q        # 218 tests
ruff check .     # lint (E/F/I/UP/B); ambos corren en CI (.github/workflows/ci.yml)
# Antes de dar por hecho: revisar que ninguna salida escriba archivos sin aprobacion.
```

## Contexto extra
- Gobernanza legal: `LEGAL_RISK_REVIEW.md`, `PROVIDER_POLICY.md`, `SECURITY.md`, `DISCLAIMER.md`.
- Diseno/UI: `docs/DESIGN_SYSTEM_REDESIGN.md` + `diseno/` (identidad hex morado/ambar, enjambre).
- Convenciones de agente: `AGENTS.md`. Indice del ecosistema: `FAMILY.md`.
