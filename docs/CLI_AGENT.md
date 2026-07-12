# Agente CLI (tipo "CLI")

Segundo TIPO de agente en Enjambre, junto al tipo "API" (`providers.base.BaseProvider.chat`).
Un agente "CLI" es un coding-agent real (hoy Claude Code headless, `claude -p`) que EDITA
archivos directo en el filesystem. Para no romper el contrato del tipo "API" (texto de vuelta,
sin side-effects) ni la regla de aprobacion humana de Obsidia, corre AISLADO en un git worktree
y su diff se aplica al proyecto real solo bajo aprobacion explicita.

Spec: `specs/cli-agent-v1.md`. Implementacion: `src/enjambre/cli_agent.py` + endpoints `/cli/*`
en `src/enjambre/api.py` + `frontend/src/pages/CliPage.tsx`.

## Invariante de seguridad

El agente CLI NUNCA escribe al `project_root` real. Solo toca su worktree temporal. La unica
escritura al proyecto sigue siendo `changes.ChangeSet.apply(approved=True)`, que valida
path-traversal, archivos bloqueados y secretos antes de escribir. Aprobar = aplicar ese diff.

## Activacion

**En el sidecar suelto (dev / uso desde CLI): opt-in.** Detras de un flag; sin el,
Enjambre se comporta igual que antes.

- Sidecar: `ENJAMBRE_CLI_AGENTS=1` habilita los endpoints `/cli/*`.
- Frontend: `VITE_CLI_AGENTS=1` muestra la pestana "Agente CLI".

**En la app EMPAQUETADA (instalador): ACTIVO por defecto.** El shell Tauri arranca el
sidecar con `ENJAMBRE_CLI_AGENTS=1` (`tauri/src/lib.rs`) y el bundle se compila con
`VITE_CLI_AGENTS=1`, porque si no la pestana "Agente CLI" no serviria de nada en el
paquete. Es decir: **el instalador distribuye los endpoints `/cli/*` habilitados**.

Que significa eso para tu superficie de ataque: `/cli/*` lanza Claude Code headless en
un git worktree aislado y produce un diff. **No aplica nada por su cuenta**: escribir
exige una aprobacion humana explicita (`POST /cli/{run_id}/approve`), que pasa por
`ChangeSet.apply` (bloquea path-traversal, archivos sensibles y secretos). Ademas el
sidecar solo atiende peticiones con `Host` loopback y exige el token. Si aun asi no
quieres esa superficie en tu maquina, no instales el paquete: usa el sidecar suelto sin
el flag.
- Requisito del sistema: el binario `claude` debe existir en el PATH del proceso del sidecar.
  Sin el, `POST /cli/run` responde `{ok:false, error:"claude CLI no encontrado en PATH"}`.

```bash
# sidecar
ENJAMBRE_CLI_AGENTS=1 uvicorn enjambre.api:app --host 127.0.0.1 --port 8000
# frontend (en otra terminal)
cd frontend && VITE_CLI_AGENTS=1 npm run dev   # http://localhost:5173
```

## Flujo end-to-end (ejemplo real, verificado)

Repo de prueba con un solo archivo:

```python
# app.py
def saludo():
    return "hola"
```

### 1. Registrar el proyecto (una vez)

```bash
curl -s -X POST http://127.0.0.1:8000/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"cli-demo","root":"C:/ruta/al/repo"}'
# -> {"id":"5934dbcf","name":"cli-demo","root":"...","created_at":"..."}
```

### 2. Lanzar el agente CLI

```bash
curl -s -X POST http://127.0.0.1:8000/cli/run \
  -H 'Content-Type: application/json' \
  -d '{"project_id":"5934dbcf","prompt":"Agrega una funcion despedida() en app.py que devuelva la cadena adios. No cambies nada mas."}'
```

Respuesta (real; el diff sale de `git`, no del output del CLI):

```json
{
  "run_id": "c33edc79f3ea4bd094a0f4e19e95e7c1",
  "ok": true,
  "changed_files": ["app.py"],
  "error": null,
  "diff": "diff --git a/app.py b/app.py\n--- a/app.py\n+++ b/app.py\n@@ -1,2 +1,6 @@\n def saludo():\n     return \"hola\"\n+\n+\n+def despedida():\n+    return \"adios\"\n"
}
```

En este punto el worktree y su rama (`enjambre/cli/<ts>-<slug>-<uuid>`) quedan SIN limpiar, y el
**repo real sigue intacto** (`git status` vacio): el cambio vive solo en el worktree.

### 3. Consultar estado (opcional)

```bash
curl -s http://127.0.0.1:8000/cli/c33edc79f3ea4bd094a0f4e19e95e7c1
# -> {"status":"done","ok":true,"changed_files":["app.py"],...}
```

### 4. Aprobar (aplicar) o descartar

```bash
# aplicar al repo real
curl -s -X POST http://127.0.0.1:8000/cli/c33edc79f3ea4bd094a0f4e19e95e7c1/approve \
  -H 'Content-Type: application/json' -d '{"approved":true}'
# -> {"ok":true,"written":["app.py"],"rejected":[],"temp_branch":null}

# o descartar (no toca el repo)
#   -d '{"approved":false}'  -> {"ok":true,"written":[],"rejected":[],...}
```

En ambos casos el worktree temporal y su rama se limpian (con reintentos + `git worktree prune`
+ fallback `rmtree` para tolerar handles rezagados en Windows). Tras aprobar:

```bash
git -C C:/ruta/al/repo diff
# el diff en el repo real coincide EXACTAMENTE con el que devolvio /cli/run
```

## En el dashboard

Pestana "Agente CLI": elige el proyecto en el header, escribe el prompt, "Lanzar agente CLI"
(muestra `MicroLoader` mientras corre), revisa el diff en el `DiffViewer` existente y pulsa
"Aprobar y aplicar" o "Descartar". El resultado (`written` / `rejected`) se muestra igual que
en la pestana Proyectos.

## Casos borde manejados

- `project_root` no es repo git -> `ok:false` con error explicito, sin worktree a medias.
- 0 cambios -> `ok:true`, `changed_files:[]`, `diff:""`; el front muestra "sin cambios".
- Timeout del CLI -> mata el proceso, `ok:false`, `error:"timeout tras Ns"`, limpia el worktree.
- Archivo rechazado por politica (secreto/path-traversal/bloqueado) -> aparece en
  `ApplyReport.rejected`, nunca se aplica en silencio.
- Runs concurrentes sobre el mismo proyecto -> cada uno en su worktree/rama (timestamp + slug +
  uuid evitan colision). Sin lock compartido en v1 (limitacion conocida).

## Fuera de alcance (v2+)

Multiples CLIs en paralelo / comparacion lado a lado, auto-aplicar con sandbox docker, abrir PR
directo, tool-use para los agentes tipo API, y lock/cola para runs concurrentes.
