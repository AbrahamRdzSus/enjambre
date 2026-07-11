# Spec: Panel "Actividad por modelo" (dock inferior estilo Jules)

## 1. Objetivo
Un dock inferior en la pantalla de ejecucion (RunPage) que visualice, agrupada por
agente/modelo, la salida de cada uno (mensajes, bloques de codigo, tool-calls) en
vivo, con step badges de progreso y una vista comparativa lado-a-lado de las salidas
antes de aprobar.

## 2. Contexto real del codigo (verificado 2026-07-11)
- El bus SSE YA existe: `src/enjambre/logs.py::LogBus` emite `LogEvent {ts, level,
  event, message, agent, fields}`; se sirve por `GET /logs/stream` (SSE, replay
  configurable) en `api.py:604`. El frontend ya consume SSE crudo en
  `frontend/src/pages/LogsPage.tsx` (stream plano por nivel, SIN agrupar por agente).
- El handler `/run` (`api.py:405-446`) emite: `run.start`, `run.warning`,
  `agent.done` (uno por agente), `run.done`. HOY `agent.done` NO lleva el contenido
  de la salida (solo `message="ok"`/error + `provider` + `cost_usd`).
- El CONTENIDO por agente (texto/propuesta completa) esta en la RESPUESTA JSON de
  `/run` -> `out["runs"]` (via `orchestrator` en modo parallel, `_multiagent_out`
  en sequential/debate/vote). Esa es la fuente para la comparativa.
- Tool-calls SOLO existen en agentes tipo "CLI" (`/cli/*`, `cli_agent.py`); los
  agentes tipo "API" (`providers/base.py::BaseProvider.chat`) son completado de un
  tiro y su salida es texto (puede contener bloques ```code```). El panel debe tratar
  ambos, sin fingir tool-calls donde no los hay.
- `DiffViewer.tsx` ya existe y se reusa para diffs (agente CLI).

Conclusion de arquitectura: el panel se alimenta de DOS fuentes complementarias:
  (a) SSE `/logs/stream` -> actividad en vivo + step badges (progreso).
  (b) respuesta de `/run` (`out.runs`) -> contenido completo por agente para la
      comparativa lado-a-lado.

## 3. Requisitos exactos (cada uno verificable)

### Backend (Python, enriquecer eventos)
1. `LogBus.emit` y `LogEvent` NO cambian de forma (contrato estable). El enriquecimiento
   viaja en `fields` (dict libre ya existente), sin romper consumidores actuales.
2. En `/run`, ademas de `agent.done`, emitir por agente un evento
   `agent.output` con `fields`:
   - `fields.kind`: `"message"` | `"code"` (clasificado en backend a partir de la
     presencia de bloques ```; si el texto es puro codigo -> `code`, si no -> `message`).
   - `fields.lang`: lenguaje del primer bloque de codigo si `kind=="code"` (o `null`).
   - `fields.preview`: primeros N=280 chars de la salida (para el feed en vivo; el
     contenido completo se toma de `out.runs`, no se duplica entero en el evento).
   - `agent`: nombre del agente. `provider` y `cost_usd` como en `agent.done`.
3. En `/cli/*`, emitir `agent.output` con `fields.kind="tool_call"` cuando el run CLI
   produjo diff/acciones (reusa lo que ya emite `cli.run.done`); `fields.changed_files`.
4. Nuevos tests en `tests/test_api.py` (o `tests/test_logs.py`) que verifican:
   - `/run` emite un `agent.output` por agente con `kind` in {message, code}.
   - la clasificacion `code` vs `message` es correcta para una salida con/ sin fence.
   - contrato viejo intacto: `agent.done`/`run.done` siguen igual (regresion).
5. Sin dependencias nuevas (stdlib + lo ya presente). Suite verde, ruff limpio.

### Frontend (React/Vite, dock inferior en RunPage)
6. Nuevo componente `frontend/src/components/activity/ActivityDock.tsx`: dock inferior
   plegable (colapsado por defecto a una barra de ~40px con resumen; expandible).
   Vive DENTRO de RunPage (no global).
7. El dock consume `/logs/stream` (reusa el patron EventSource de `LogsPage.tsx`:
   token perezoso `api.token`, replay), y agrupa eventos por `agent` en carriles.
8. Cada agente = una columna/carril con:
   - encabezado: nombre + `ProviderIcon` (ya existe) + estado (corriendo/ok/error).
   - step badge de progreso: "paso k — n eventos" derivado del conteo de eventos del
     agente entre `run.start` y su `agent.done`.
   - lista de tarjetas plegables, una por `agent.output`, tipadas por `fields.kind`:
     - `message` -> texto (markdown-lite, sin dep nueva pesada).
     - `code` -> bloque con resaltado de sintaxis y boton copiar.
     - `tool_call` -> chip de accion + `changed_files` + enlace a `DiffViewer`.
9. Vista comparativa (v1): boton "Comparar" en el dock que abre una rejilla
   lado-a-lado (una columna por agente) con la salida COMPLETA de `out.runs` del ultimo
   run; resalta visualmente cual difiere; cada columna con su costo y su boton
   "Aprobar" que reusa el flujo de aprobacion existente (`changes/apply` / `cli approve`
   segun tipo de agente). NO auto-aplica: respeta el gate humano.
10. Diseno con la identidad Enjambre (morado `--purple` #8B5CF6 / ambar, bg oscuro,
    tokens CSS ya definidos). Construir con ui-ux-pro-max + 21st Magic, NUNCA SVG a mano.
11. Gated tras flag `VITE_ACTIVITY_DOCK` (off por defecto -> RunPage sin cambios), en
    linea con el patron de flags del repo (`VITE_CLI_AGENTS`, `VITE_HUB_DEPLOY`).
12. `npm run build` + `tsc` + `eslint` verdes.

## 4. Casos borde
- Run con un solo agente: el dock muestra un carril; "Comparar" se desactiva (nada que
  comparar) o muestra la unica salida.
- Agente que falla (`agent.done` level=error): carril en estado error, tarjeta con el
  mensaje de error, NO aparece en la comparativa como aprobable.
- Salida vacia o solo-espacios: tarjeta `message` vacia con aviso, no rompe el layout.
- SSE cae a media ejecucion (`es.onerror`): badge "sin stream" (ya existe patron),
  el contenido de la comparativa sigue disponible via la respuesta de `/run`.
- Salida muy larga: tarjeta con altura maxima + scroll interno (no empuja el layout).
- Agente CLI vs API mezclados en el mismo run: cada carril renderiza segun su `kind`.
- Reconexion/replay: el replay del SSE no debe duplicar tarjetas (dedupe por
  `ts+agent+event`, como el `_id` actual pero estable).

## 5. Definicion de done
- Backend: `/run` emite `agent.output` tipado por agente; tests nuevos verdes;
  contrato viejo intacto (regresion verde); `pytest -q` y `ruff check .` limpios.
- Frontend: dock inferior plegable en RunPage detras de `VITE_ACTIVITY_DOCK`, agrupa
  por agente, tarjetas tipadas (message/code/tool_call) plegables, step badges, y
  comparativa lado-a-lado con aprobacion reusando el gate existente; build/tsc/eslint
  verdes.
- Sin flag activo, RunPage y el resto del cockpit quedan identicos (cero regresion).
- Verificado en vivo: lanzar un run con 2 agentes (p.ej. debate) y ver ambos carriles
  poblarse en tiempo real + comparar + aprobar uno.

## 6. Anclas Gortex (archivos/simbolos que el build tocara)
- `src/enjambre/logs.py` (`LogBus.emit`, `LogEvent`) — NO cambiar la forma; usar `fields`.
- `src/enjambre/api.py` — handler `run` (~405-446) para emitir `agent.output`;
  handler `/logs/stream` (~604) sin cambios; handlers `/cli/*` (~548-585) para tool_call.
- Fuente del contenido comparativo: `out["runs"]` (orchestrator parallel /
  `_multiagent_out`); NO reimplementar el run, solo leerlo.
- Frontend: `frontend/src/pages/RunPage.tsx` (montar el dock), reusar
  `frontend/src/pages/LogsPage.tsx` (patron EventSource), `components/ProviderIcon.tsx`,
  `components/DiffViewer.tsx`, `components/ui/Panel.tsx`, tokens CSS de identidad.
- Nuevo: `frontend/src/components/activity/ActivityDock.tsx` (+ subcomponentes).
- Tests: `tests/test_api.py` / `tests/test_logs.py`.

### Invariantes a respetar (no violar)
- BYOK + gate de aprobacion humana: la comparativa NUNCA auto-aplica; aprobar pasa por
  `changes/apply` (API) o `cli approve` (CLI) existentes.
- No duplicar el contenido completo en los eventos SSE (memoria del ring buffer): el
  evento lleva `preview`; el contenido entero se lee de la respuesta de `/run`.
- Contrato SSE estable: no romper `LogsPage` ni otros consumidores de `agent.done`.
- Sin dependencias nuevas pesadas en frontend (resaltado de codigo: preferir algo
  ligero o ya presente; justificar si se agrega).
- No fingir tool-calls en agentes tipo API (solo `kind` message/code ahi).

## 7. Ancla de ejecucion
- Feature: coherencia visual ALTA + toca contrato backend + frontend con identidad.
- Enrutador: **Opus inline** (Forma A: Opus orquesta y construye). El grueso frontend
  puede delegarse a sub-agente si crece, con review Opus, pero el diseno del contrato
  y del layout lo hace Opus.

## 8. Fuera de alcance v1 (anotado)
- Streaming token-a-token dentro de una tarjeta (los agentes API son completado de un
  tiro; requeriria tool-loop/streaming en el core, otra spec).
- Persistir la vista de actividad entre sesiones (hoy vive en memoria del run actual).
- Editar/reordenar carriles; temas claro/oscuro alternos (identidad oscura fija).
- Integrar el panel en otras tabs (Overview/Stats): v1 solo RunPage.
