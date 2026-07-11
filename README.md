# ENJAMBRE

> Tu equipo de IAs trabajando en paralelo.

ENJAMBRE es una aplicación local-first para coordinar múltiples agentes de IA en tareas de desarrollo de software. El usuario conecta sus propias API keys (BYOK), registra agentes, abre proyectos locales o repositorios GitHub, lanza tareas en paralelo, revisa la salida por agente, compara resultados y aplica cambios con control humano.

ENJAMBRE no es un modelo de IA, no entrena modelos y no vende acceso a modelos de terceros. Es una capa de orquestación, UI y flujo de trabajo.

## Estado

Producto local-first en beta, **v0.6.0**. Core real (Fases 1-5 del roadmap técnico, 214 tests) más seguridad del sidecar endurecida, agente CLI, panel de actividad por modelo y proxy de operaciones (OPS HUD). El instalador publicado es la v0.5.0; el paquete v0.6.0 se genera en la fase de empaque (E5). Apache-2.0.

## Objetivos

- Coordinar varios agentes de IA en paralelo.
- Mantener proyectos y API keys bajo control del usuario.
- Comparar respuestas por modelo/agente lado a lado.
- Mostrar logs, actividad por agente, consumo de tokens y costo estimado.
- Integrar proyectos locales y repositorios GitHub.
- Evitar lock-in de proveedor mediante adaptadores.
- Mantener una base open source fácil de auditar.

## Qué NO es

- No es un modelo fundacional.
- No es un servicio para distilar modelos.
- No entrena modelos usando outputs de proveedores.
- No revende outputs de OpenAI, Anthropic, Google, xAI u otros.
- No incluye API keys.
- No intenta saltarse límites, rate limits, filtros o medidas de seguridad de proveedores.
- No usa marcas de terceros como si fueran propias.

## Arquitectura

```txt
ENJAMBRE
├── Core Python (src/enjambre)        # motor real, 26 módulos, 214 tests
│   ├── orchestrator (paralelo async, solo lectura)
│   ├── multiagent (parallel/sequential/debate/vote + review por gate)
│   ├── changes (ChangeSet.apply bajo aprobación humana)
│   ├── sandbox (docker --network none)
│   ├── providers (OpenAI-compat, Anthropic, Google, xAI + SDK extensible)
│   ├── cli_agent (Claude Code headless en git worktree aislado)
│   └── github / pull_request / sessions / stats / logs (bus SSE)
├── Superficies de consumo
│   ├── CLI  `enjambre`               # agents/providers/validate/run/sessions
│   ├── Sidecar HTTP `enjambre.api`   # FastAPI (~29 endpoints + /logs/stream SSE)
│   ├── Frontend React/Vite           # dashboard cockpit sobre el sidecar
│   └── App de escritorio Tauri 2     # instalador NSIS, sidecar auto-spawn
├── Streamlit (app.py)                # PROTOTIPO de UI, no el destino
└── Compliance
    ├── BYOK (claves solo en memoria por sesión)
    ├── Aprobación humana de toda acción destructiva
    ├── Sidecar default-on: token + guard anti DNS-rebind + rate limit
    └── Audit logs + secret scanning
```

## Principio de seguridad

Todas las acciones destructivas pasan por confirmación humana: escribir/borrar archivos, ejecutar comandos, crear commits, crear pull requests, subir cambios, instalar dependencias y modificar configuración sensible. El sidecar es local-only (127.0.0.1) con token default-on, guard anti DNS-rebinding y rate limit (ver `SECURITY.md`).

## Modelo de agentes

| Agente | Modelo sugerido | Función |
|---|---|---|
| Arquitecto | Claude / Gemini / OpenAI | Divide tareas, diseña arquitectura y revisa consistencia |
| Backend Dev | OpenAI / Grok / Claude | Implementa servicios, endpoints y lógica |
| Frontend Dev | Gemini / Claude / OpenAI | Implementa componentes y estados UI |
| QA & Debug | OpenAI / Claude | Genera tests, detecta errores y revisa diffs |
| Doc Writer | Cualquier proveedor | Documenta cambios y genera guías |

Los modelos son configurables. El proyecto evita hardcodear dependencias exclusivas de un proveedor.

## Instalación y uso

### Usuarios (app de escritorio)

Descarga el instalador de Windows (NSIS) desde la landing o los GitHub Releases:

- Landing: https://enjambre.obsidia.mx
- Releases: https://github.com/AbrahamRdzSus/enjambre/releases/latest

La app trae el sidecar Python congelado (PyInstaller) y lo arranca sola. Tus datos viven en `%APPDATA%/enjambre`. El instalador aún no está firmado: Windows SmartScreen puede pedir confirmación.

### Desarrolladores

```bash
git clone https://github.com/AbrahamRdzSus/enjambre.git
cd enjambre
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
cp .env.example .env        # rellena con TUS keys

# CLI (sin GUI, usa el core real):
pip install -e .
enjambre agents             # agents | providers | validate | run "<prompt>" | sessions

# Sidecar HTTP + dashboard React (el destino de UI):
pip install -e ".[api]"
uvicorn enjambre.api:app --host 127.0.0.1 --port 8000
cd frontend && npm install && npm run dev   # http://localhost:5173

# Prototipo Streamlit (consume el core real, no es el destino):
pip install -e ".[gui]" && streamlit run app.py
```

### Feature flags del frontend (opt-in, off por defecto)

- `VITE_CLI_AGENTS=1` — pestaña "Agente CLI" (requiere `ENJAMBRE_CLI_AGENTS=1` y `claude` en PATH).
- `VITE_ACTIVITY_DOCK=1` — panel "Actividad por modelo" (dock inferior estilo Jules) en la pestaña Lanzar.
- `VITE_HUB_DEPLOY=1` — OPS HUD (proxy al hub de CD; requiere `ENJAMBRE_HUB_URL`/`ENJAMBRE_HUB_PIN`).

## Variables de entorno

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
XAI_API_KEY=
GITHUB_TOKEN=
ENJAMBRE_LOCAL_ONLY=true
ENJAMBRE_DISABLE_TRAINING_EXPORTS=true
```

## Reglas legales básicas

Lee `LEGAL_RISK_REVIEW.md` y `PROVIDER_POLICY.md` antes de publicar, empaquetar o monetizar.

1. El usuario usa sus propias API keys.
2. ENJAMBRE no incluye, comparte ni revende API keys.
3. ENJAMBRE no usa outputs para entrenar, ajustar, mejorar o distilar modelos competidores.
4. ENJAMBRE respeta rate limits, filtros, términos y políticas de cada proveedor.
5. Las marcas OpenAI, Claude, Gemini, Grok, xAI, Google, Anthropic, GitHub y otras pertenecen a sus titulares.
6. Los outputs pueden ser inexactos. El usuario debe revisarlos antes de aplicarlos.
7. El proyecto se distribuye sin garantía.

## Licencia

**Apache-2.0** (permisiva, con cláusula de patente explícita). Ver `LICENSE`.

## Descargo

Este repositorio no ofrece asesoría legal. Antes de uso comercial, publicación en marketplaces, distribución empaquetada o integración empresarial, consulta a un abogado especializado en software, datos e IA.
