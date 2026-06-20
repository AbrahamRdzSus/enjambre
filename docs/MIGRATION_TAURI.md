# Migración: Streamlit (prototipo) → app real Tauri + React (sidecar Python)

> Estado: PLAN (no ejecutado). Decisión ya tomada (ver `REPO.md`, `HANDOFF.md`).
> Streamlit fue prototipo de UI; el destino es una aplicación de escritorio real.
> El core `src/enjambre/` ya está desacoplado de la UI a propósito para esto.

## Arquitectura de referencia (NO adhesión, sí patrón)

No se fusiona con Obsidia Eye. Se **reutiliza su arquitectura**, que ya está
probada y viva en `02-studio/01-eye/codigo`:

```
Tauri 2 (Rust, shell de escritorio)
  └─ lanza y supervisa un sidecar ──> FastAPI (Python 3.12)  ←  envuelve src/enjambre
  └─ sirve ──────────────────────────> React 19 + Vite + Tailwind (UI)
        IPC: HTTP localhost (127.0.0.1:PORT) entre React y el sidecar
```

Piezas de origen (entre otras opciones):
- **Shell + sidecar**: patrón de `obsidia/02-studio/01-eye/codigo/{tauri,fastapi}`
  (Cargo.toml, lib.rs gestiona el sidecar y health-check; tauri.conf.json).
- **Frontend base**: `obsidia/03-tooling/05-skeleton/desktop/frontend`
  (React 19 + Vite + react-router + zustand + tanstack-query + Tailwind 4).
  OJO: el skeleton hoy es **solo frontend**, NO trae el shell Tauri — el shell
  se toma de Eye.
- **Motor**: `src/enjambre/` tal cual, expuesto por una capa FastAPI delgada.

## Por qué FastAPI sidecar (no reescribir el core)

`src/enjambre` ya es async (httpx), con contratos limpios (Orchestrator,
MultiAgent, ChangeSet, Sandbox). Una capa FastAPI sólo traduce HTTP↔core;
no duplica lógica. Mantiene los 98 tests intactos y el human-gate en el core.

## Fases incrementales (cada una deja algo usable)

1. **Sidecar FastAPI** sobre el core, sin tocar UI. Endpoints mínimos:
   `POST /validate-keys`, `POST /run` (orquestación), `POST /changes/preview`,
   `POST /changes/apply` (exige `approved`), `POST /sandbox/run`. Tests de API.
2. **Shell Tauri** copiando el patrón de Eye (lib.rs arranca el sidecar en un
   puerto local, health-check, lo apaga al cerrar). App abre y muestra "vivo".
3. **Frontend React** desde el skeleton: páginas Proyectos / Agentes / Keys /
   Run (salidas lado a lado) / Diff+Approval / Logs. Consume el sidecar vía
   tanstack-query. Reemplaza la UI Streamlit pantalla por pantalla.
4. **Paridad + retiro de Streamlit**: cuando la app real cubra el flujo del
   prototipo, `app.py` pasa a `legacy/` (o se elimina) y `streamlit` sale de
   `[gui]` en pyproject.
5. **Empaquetado**: bundle Tauri (instalable) con el sidecar embebido; CI de
   build por plataforma (referencia: workflow de Eye).

## Reglas duras que NO cambian en la migración

- Toda acción destructiva sigue pasando por **aprobación humana** (el gate vive
  en el core `ChangeSet.apply` / `Sandbox`, no en la UI). La UI sólo muestra el
  diff y manda `approved=true` tras confirmación explícita.
- BYOK: las keys nunca salen del proceso local; el sidecar es `127.0.0.1` only.
- El secret-scan antes de red se mantiene en el core, no en la UI.

## No-objetivos de esta migración

- No reescribir el core ni los adapters de proveedor (ver decisión any-llm en
  `REPO_EVAL_CATALOG.md` #33: NO rip-and-replace; opt-in como plugin si acaso).
- No autonomía total: ENJAMBRE sigue siendo human-in-the-loop (diferenciador).
