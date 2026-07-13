# REPO.md

> Meta-ficha del repositorio: que es, a quien sirve y su lugar en el ecosistema.
> Complementa README.md (como usar) y CLAUDE.md (instrucciones a agentes).

- **Nombre**: enjambre
- **Audiencia**: ambos (open-source Apache-2.0; uso interno Obsidia Studio)
- **Tipo**: herramienta
- **Estado**: v0.6.0 PUBLICADA (instalador firmado + auto-update; core real Fases 1-5, 218 tests; + seguridad sidecar, agente CLI, OPS HUD, panel Actividad por modelo). En curso: v0.6.1 (pase visual + robustez + CSP)
- **Stack**: core Python (`src/enjambre`) + sidecar FastAPI + frontend React/Vite + Tauri 2; Streamlit prototipo
- **Despliegue**: local-first (corre en la maquina del usuario; BYOK)

## Para que sirve
Orquestador local-first de agentes IA de codificacion (Grok/Claude/Codex/Gemini/
Jules en paralelo): dashboard, comparacion de salidas lado-a-lado y gate de
aprobacion humana. Capa de orquestacion/UI; NO entrena ni revende modelos.

## Relaciones
- Depende de: proveedores externos via API (BYOK), ecosistema Obsidia (essentials).
- Usado por: desarrolladores que quieren comparar/orquestar varios modelos.
- Esqueleto de origen: **Esqueleto-Desktop** (obsidia-skeleton-desktop, linaje Eye).
  Enjambre es un PROGRAMA DE ESCRITORIO de Obsidia: el objetivo de roadmap es adoptar
  el shell del esqueleto (Tauri + React) con el nucleo Python actual como sidecar/motor,
  sustituyendo Streamlit. Migracion EN CURSO: ya existe frontend React/Vite + app Tauri 2
  (instalador NSIS) sobre el sidecar; Streamlit queda como prototipo.
- Relacionado: Obsidia Eye (rama Studio); solapa conceptualmente con Obsidia Hub
  y oh-my-claudecode. Blueprint de arquitectura: docs/ARCHITECT_LOOP_BLUEPRINT.md.

## Notas
- Obsidia Studio. Apache-2.0, open-source (BYOK = el usuario trae sus claves).
- Seguridad: 2 claves filtradas en versiones viejas (OpenAI/Gemini) ROTADAS/REVOCADAS
  2026-07-03. Repo canonico limpio (sin keys en arbol ni historial). BYOK: el core
  no persiste claves.
- Lo primero que debe saber alguien nuevo: el core es REAL (no simulado); Fases 1-5
  del ROADMAP hechas + seguridad sidecar/agente CLI/OPS HUD/panel mergeados, y **E5
  (empaque/release) CERRADO**: v0.6.0 publicada, firmada y con auto-update vivo.
  El frente abierto es **v0.6.1** (pase visual + robustez + CSP del webview).
- **SDK publico, sin UI**: `github.py`, `gitops.py`, `pull_request.py` (Fase 4) y
  `sandbox.py` (Fase 5) estan implementados y con tests, pero **NO estan cableados a
  `api.py` ni a `cli.py`**: son superficie de SDK, no features de la app. Igual
  `gates.py`: la API nunca pasa `gate` a `MultiAgent.run`, asi que el pase de revision
  del arquitecto solo es alcanzable desde codigo. No es codigo muerto; es alcance
  todavia sin cablear. Decidir antes de anunciarlos como features.
- `app.py` (Streamlit) FUNCIONA pero esta rezagado (no conoce multiagente, sesiones,
  stats, proyectos, logs, agente CLI). Es una demo congelada: el destino es Tauri+React.
- Precios: son ESTIMACIONES fechadas (`providers/pricing.py`, `PRICING_AS_OF`), no
  facturacion real. Pendiente: consumir el JSON de litellm.
