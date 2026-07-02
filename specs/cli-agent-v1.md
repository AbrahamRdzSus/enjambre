# Agente CLI (v1: prueba minima con Claude Code headless)

## 1. Objetivo

Agregar un segundo TIPO de agente a Enjambre — "CLI" (proceso de coding-agent real,
hoy Claude Code en modo headless) junto al tipo "API" actual (`chat()` de
completado) — validando en v1 el contrato minimo end-to-end: lanzar 1 agente CLI
en un git worktree aislado, ver su diff, y aprobarlo para aplicarlo al proyecto
real, reusando la UI/Project/sesiones/diff-gate ya existentes.

Este es un incremento DENTRO de Enjambre (mismo repo/producto), no una app nueva:
UI, entidad Project, ChangeSet.apply, sesiones y stats se reusan tal cual con
cualquier backend de agente.

## 2. Por que un tipo de agente nuevo, no reusar `chat()`

`providers/base.py::BaseProvider.chat(messages) -> ProviderResult` es un
completado de texto de un solo tiro (BYOK, sin tools, sin tocar disco). Un CLI
como `claude -p` es un proceso largo, con estado, que EDITA ARCHIVOS DIRECTO en
el filesystem que se le de. Mezclarlo en `chat()` rompe el contrato (que asume
texto de vuelta, no side-effects). Por eso va en un modulo aislado con su propio
contrato, y el orquestador decide por tipo de agente cual camino tomar.

## 3. Requisitos exactos (v1)

1. Nuevo modulo `src/enjambre/cli_agent.py` con:
   - `async def run_cli_task(prompt: str, project_root: str | Path, *, agent_name: str = "claude-cli", timeout: float = 600.0) -> CliTaskResult`
   - `CliTaskResult` (dataclass): `ok: bool`, `diff: str` (unified diff agregado de
     todos los archivos tocados), `changed_files: list[str]`, `log: str` (stdout/
     stderr capturado o el JSON de `claude --output-format json`), `worktree_path: str`,
     `branch: str`, `error: str | None`.
   - Flujo interno:
     a. Crear un git worktree aislado del `project_root` en una rama nueva
        (`enjambre/cli/<timestamp>-<slug>`), via `git worktree add`. Requiere que
        `project_root` sea un repo git; si no lo es, `ok=False` con `error`
        explicito (no degradar en silencio).
     b. Ejecutar `claude -p "<prompt>" --output-format json` (subprocess async,
        `cwd=worktree_path`), con `timeout`. Sin red bloqueada (el CLI la
        necesita para su propio modelo); sin permisos especiales elevados mas
        alla de los del usuario actual.
     c. Al terminar (exito o timeout), correr `git -C <worktree> diff --stat` +
        `git -C <worktree> diff` para capturar cambios reales hechos por la CLI
        dentro del worktree (fuente de verdad = git, no el output del CLI).
     d. Devolver `CliTaskResult` con el worktree y la rama SIN limpiar (se
        limpian solo al aprobar o descartar, paso 4/5).
   - Politica: `policy.check_mode` sigue aplicando; el agente CLI NUNCA escribe
     directo al `project_root` real, solo a su worktree. Solo `changes.ChangeSet.apply`
     (existente) toca el `project_root`, y solo con `approved=True`.

2. Endpoint nuevo en el sidecar (`api.py`), bajo el prefijo `/cli`:
   - `POST /cli/run` — body `{project_id: str, prompt: str}` -> resuelve
     `root` via `projects.list_projects()` (mismo patron que `changes_preview`/
     `changes_apply`), llama `run_cli_task`, persiste el resultado en memoria
     (dict por `run_id` generado con `uuid4`, TTL o cleanup simple) y responde
     `{run_id, ok, diff, changed_files, log, error}`.
   - `POST /cli/{run_id}/approve` — body `{approved: bool}`:
     - Si `approved=True`: lee el contenido nuevo de cada `changed_files` desde
       el worktree, construye `ChangeSet` (`Change(path, new_content)` por
       archivo), llama `ChangeSet.apply(root=project_root, approved=True)`
       (SIN `git_branch`, el worktree YA es el aislamiento), devuelve el
       `ApplyReport` tal cual lo consume el frontend hoy (`ApplyReport{ok,
       written, rejected, temp_branch}`).
     - Si `approved=False`: no toca `project_root`.
     - En ambos casos: al final, `git worktree remove --force <worktree_path>`
       y borrar la rama temporal (cleanup, corra o no la aprobacion).
   - `GET /cli/{run_id}` — poll de estado mientras corre (para el frontend,
     ya que el subprocess puede tardar); estados: `running | done | error`.
   - Reusar la validacion de proyecto/roots existente (`projects.list_projects`,
     `ENJAMBRE_ALLOWED_ROOTS` si aplica) — NO reinventar el allowlist.

3. Frontend (dashboard React), panel nuevo en la pestana **Lanzar** (`RunPage`)
   o pestana propia — decision de implementacion libre siempre que:
   - Permita elegir "Agente CLI (claude)" + escribir un prompt + lanzar
     (`POST /cli/run`), mostrando estado "corriendo" (reusar `MicroLoader`/
     `CircleLoad` ya construidos) mientras se hace poll de `GET /cli/{run_id}`.
   - Al completar, muestre el diff con el `DiffViewer` YA EXISTENTE
     (`components/DiffViewer.tsx`, `diffs: Record<path, diffText>`) — construir
     ese record desde `changed_files` + el diff agregado o pidiendo diffs por
     archivo (decision de implementacion; si el backend ya diferencia por
     archivo en `CliTaskResult`, mejor exponerlo asi en vez de un diff unico).
   - Boton "Aprobar y aplicar" -> `POST /cli/{run_id}/approve {approved:true}`
     y boton "Descartar" -> `approved:false`. Mostrar el `ApplyReport` resultante
     igual que hoy en `ProjectsPage` (written/rejected).
   - Nuevo hook en `api/hooks.ts`: `useRunCliTask()`, `useCliRunStatus(runId)`,
     `useApproveCliRun()`, siguiendo el mismo patron de los hooks existentes
     (`useMutation`/`useQuery` de tanstack-query).

4. Flag de activacion: variable de entorno `ENJAMBRE_CLI_AGENTS=1` (o similar,
   nombre libre) que habilita los endpoints `/cli/*` y el panel en el frontend.
   Sin el flag, el comportamiento actual de Enjambre no cambia en nada
   (el tipo "API" sigue siendo el unico camino).

5. Requisito del sistema: el binario `claude` debe existir en `PATH` del
   proceso del sidecar. Si `POST /cli/run` se llama sin el binario disponible,
   responder error claro (`{ok:false, error:"claude CLI no encontrado en PATH"}`),
   no un 500 generico.

## 4. Casos borde a manejar

- `project_root` no es un repo git -> error explicito, no crear worktree a medias.
- El CLI produce 0 cambios (diff vacio) -> `ok=True`, `changed_files=[]`,
  `diff=""`; el frontend debe mostrar "sin cambios" (igual que hoy el
  DiffViewer con string vacio).
- Timeout del proceso CLI -> matar el subprocess, `ok=False`,
  `error="timeout tras Ns"`, y limpiar el worktree igual.
- El worktree queda con cambios sin commitear al aprobar/descartar -> no
  importa, se borra con `--force` en el cleanup (ya se leyo el contenido antes).
- Dos runs CLI concurrentes sobre el MISMO proyecto -> cada uno en su propio
  worktree/rama (nombres con timestamp+slug evitan colision); no hay lock
  compartido en v1 (aceptable para v1, anotar como limitacion conocida).
- Archivo que el CLI edito pero que `ChangeSet.apply` rechaza (secreto detectado,
  archivo bloqueado por politica, path traversal) -> debe aparecer en
  `ApplyReport.rejected` igual que en el flujo manual de `ProjectsPage`, NUNCA
  aplicarse silenciosamente.
- `claude -p` pide input interactivo o falla el parseo de `--output-format json`
  -> tratar como error controlado (`ok=False` + `log` crudo para debug), no
  crashear el sidecar.

## 5. Definicion de "done" (v1)

- [ ] `cli_agent.run_cli_task()` implementado y con al menos 1 test que mockea
      el subprocess `claude` (sin depender de tener el binario real en CI) y
      valida: worktree creado, diff capturado via git, worktree limpiado.
- [ ] Endpoints `/cli/run`, `/cli/{run_id}`, `/cli/{run_id}/approve` en
      `api.py`, activos solo con el flag, con tests de contrato (shape de
      respuesta) igual de rigor que `changes_preview`/`changes_apply` hoy.
- [ ] Demo manual end-to-end: con `ENJAMBRE_CLI_AGENTS=1` y `claude` instalado,
      desde el dashboard: lanzar un prompt real contra un repo git de prueba,
      ver el diff en el DiffViewer existente, aprobar, y confirmar con
      `git status`/`git diff` en el repo real que los archivos cambiaron
      exactamente como el diff mostrado.
- [ ] Sin el flag activo, `pytest -q` completo (suite actual, hoy 170 tests)
      sigue en verde y el comportamiento de la app no cambia.
- [ ] `ruff check .` limpio en los archivos nuevos/tocados.
- [ ] Documentado en `CLAUDE.md` de Enjambre (seccion "Como correr") el flag
      nuevo y el requisito de `claude` en PATH.

## 6. Anclas Gortex (symbol_ids / archivos reales)

- `enjambre/src\enjambre\changes.py::ChangeSet.apply` — unico camino que
  escribe al `project_root` real; invariante: `approved=True` obligatorio,
  valida path-traversal/secretos/archivos bloqueados ANTES de escribir
  (`_reject_reason`). El agente CLI NO debe tener otro camino de escritura.
- `enjambre/src\enjambre\changes.py::Change` — `dataclass(path, new_content)`;
  asi se construye el `ChangeSet` desde los `changed_files` leidos del worktree.
- `enjambre/src\enjambre\policy.py::check_mode` — politica de modos prohibidos;
  respetar (no anadir un modo "auto" que la esquive).
- `enjambre/src\enjambre\api.py::changes_preview` (linea ~380) y
  `enjambre/src\enjambre\api.py::changes_apply` (linea ~384) — patron a
  replicar para `/cli/run` y `/cli/{run_id}/approve` (resolver `root` via
  `projects.list_projects()`, mismo estilo de respuesta).
- `enjambre/src\enjambre\projects.py::Project` / `list_projects` — fuente de
  verdad de `project_id -> root`; no crear un mecanismo paralelo de rutas.
- `enjambre/src\enjambre\providers\base.py::BaseProvider` — contrato del tipo
  "API" existente; el tipo "CLI" es deliberadamente OTRO contrato
  (`run_cli_task`), no una subclase de `BaseProvider`.
- `enjambre/frontend/src/components/DiffViewer.tsx` — visor de diff a reusar
  tal cual (`diffs: Record<string,string>`), construido en la tanda anterior.
- `enjambre/frontend/src/api/hooks.ts` — patron de hooks (`usePreviewChanges`,
  `useApplyChanges`) a replicar para los 3 hooks nuevos de CLI.
- `enjambre/frontend/src/pages/RunPage.tsx` / `ProjectsPage.tsx` — paneles
  existentes de lanzar/aprobar a usar como referencia de UX (CircleLoad,
  MicroLoader, ApplyReport rendering) para el panel CLI nuevo.
- `enjambre/src\enjambre\registry.py::Registry` — registro de agentes tipo
  API; el tipo CLI puede o no registrarse ahi en v1 (decision de
  implementacion), pero NO debe romper `Registry.get`/`Registry.add` existentes.

## 7. Fuera de alcance (explicito, para v2+)

- Multiples CLIs en paralelo / comparacion lado a lado (Codex, Gemini).
- Modo "auto-aplicar si pasan tests" via sandbox docker.
- Abrir Pull Request directo (se decidio: v1 aplica al working tree, no PR).
- Tool-use/MCP para los agentes tipo API (`chat()` sigue siendo completado
  simple en v1; esta spec NO lo toca).
- Lock/cola para runs CLI concurrentes sobre el mismo proyecto.
