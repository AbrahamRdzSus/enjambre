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
Core REAL en `src/enjambre/` (~3450 LOC, 29 modulos, 170 tests verdes): Fases 1-5
del ROADMAP implementadas (Fase 6/SDK parcial) — orquestacion paralela async con
gate de secretos, multiagente (roles architect/builder; modos parallel/sequential/
debate/vote; review por gate congelado), workspace seguro (ChangeSet.apply bajo
aprobacion + path-traversal + secret-scan), sandbox docker `--network none`,
github/PR, Provider SDK extensible. Consumo: CLI `enjambre`, sidecar `enjambre.api`
(FastAPI, 20 endpoints + `/logs/stream` SSE), frontend React y app Tauri 2
(instalador NSIS `ENJAMBRE_0.5.0_x64-setup.exe`, sidecar PyInstaller auto-spawn).
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
# seguridad (default-on): guard anti DNS-rebinding: solo atiende requests con Host
# loopback (127.0.0.1/localhost/::1). Anadir hosts con ENJAMBRE_ALLOWED_HOSTS
# (separado por os.pathsep) o "*" para desactivarlo (binds no-loopback conscientes).
# agente CLI (opt-in): ENJAMBRE_CLI_AGENTS=1 habilita los endpoints /cli/* (lanza
# Claude Code headless en un git worktree aislado y aplica su diff bajo aprobacion).
# Requiere el binario `claude` en el PATH del sidecar. En el frontend, activarlo con
# VITE_CLI_AGENTS=1 (muestra la pestana "Agente CLI"). Sin el flag, nada cambia.
# Guia + ejemplo end-to-end (curl y dashboard): docs/CLI_AGENT.md.
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
pytest -q        # 170 tests
ruff check .     # lint (E/F/I/UP/B); ambos corren en CI (.github/workflows/ci.yml)
# Antes de dar por hecho: revisar que ninguna salida escriba archivos sin aprobacion.
```

## Contexto extra
- Gobernanza legal: `LEGAL_RISK_REVIEW.md`, `PROVIDER_POLICY.md`, `SECURITY.md`, `DISCLAIMER.md`.
- Diseno/UI: `docs/DESIGN_SYSTEM_REDESIGN.md` + `diseno/` (identidad hex morado/ambar, enjambre).
- Convenciones de agente: `AGENTS.md`. Indice del ecosistema: `FAMILY.md`.
