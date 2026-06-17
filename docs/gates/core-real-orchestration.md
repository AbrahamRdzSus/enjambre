# Gate: core-real-orchestration

Rompe el "MVP simulado": construye el nucleo de orquestacion real (Fase 1 del
ROADMAP) en `src/enjambre/`, reutilizable por Streamlit hoy y por el sidecar
Tauri despues.

## Entra
- Provider adapters reales via httpx async para: OpenAI, xAI (compat OpenAI),
  Anthropic, Google (Gemini). Cada uno implementa `validate_key`, `chat`,
  `estimate_cost` (contrato de `docs/architecture.md`).
- `registry.py`: cargar/guardar agentes en `agents/registered.json` (UTF-8).
- `config.py`: mapeo proveedor -> variable de entorno (alineado a `.env.example`:
  OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, XAI_API_KEY).
- `orchestrator.py`: despacho PARALELO de un prompt a N proveedores (asyncio),
  resultados lado a lado con texto, uso, costo estimado, latencia y error.
- `policy.py` cableado: secret scanner que bloquea fugas; el orchestrator nunca
  escribe ni ejecuta archivos en esta fase.
- Tests con `httpx.MockTransport` (sin keys reales) para los 4 adapters,
  registry y policy.
- `app.py` usa el core real (sin "simulado"); nombres de key correctos.

## NO entra (fases posteriores)
- Worktrees, diff apply, branch temporal (Fase 2).
- Roles architect/builder, debate/votacion, checkpoints (Fase 3).
- GitHub/PRs (Fase 4). Sandbox Docker / ejecucion (Fase 5).
- Front-end Tauri (migracion incremental posterior).

## Verificacion (objetiva)
- `pytest` pasa en verde (tests offline con transporte mock).
- `python -c "import enjambre; from enjambre.orchestrator import Orchestrator"`
  importa sin error.
- El orchestrator NO contiene ninguna ruta de escritura/ejecucion de archivos.
- `grep -ri "simulado" app.py` no devuelve nada.

## Congelado: 2026-06-17
