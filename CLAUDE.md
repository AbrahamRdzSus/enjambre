# ENJAMBRE (Obsidia Studio)

> Proyecto del ecosistema Obsidia (rama Studio). Instrucciones para agentes de IA.
> Manten este archivo CORTO: se reinyecta en cada sesion.

## Que es
ENJAMBRE: orquestador local-first de agentes IA de codificacion (Grok/Claude/
Codex/Gemini/Jules en paralelo) con dashboard, comparacion de salidas y gate de
aprobacion humana. Capa de orquestacion/UI — NO entrena ni revende modelos (BYOK).
Stack: Python + Streamlit (GUI) + scripts PowerShell (hub Windows). Apache-2.0.

## Estado
MVP. `app.py` (Streamlit) tiene validacion de keys y logs **SIMULADOS**; la
orquestacion real es pendiente. Ver `docs/ROADMAP.md`, `docs/HANDOFF.md`,
`PROJECT_SUMMARY.json` (first_mvp).

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
streamlit run app.py     # GUI (MVP, simulada)
# o el hub de consola Windows:
.\enjambre-hub.ps1
```

## Como probar
```
# (pendiente test suite) validar manualmente la GUI y los scripts .ps1.
# Antes de dar por hecho: revisar que ninguna salida escriba archivos sin aprobacion.
```

## Contexto extra
- Gobernanza legal: `LEGAL_RISK_REVIEW.md`, `PROVIDER_POLICY.md`, `SECURITY.md`, `DISCLAIMER.md`.
- Diseno/UI: `docs/DESIGN_SYSTEM_REDESIGN.md` + `diseno/` (identidad hex morado/ambar, enjambre).
- Convenciones de agente: `AGENTS.md`. Indice del ecosistema: `FAMILY.md`.
