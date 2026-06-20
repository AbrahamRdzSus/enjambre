# Gate: fase2-workspace-seguro

Construye el workspace seguro (Fase 2 del ROADMAP) sobre el nucleo de Fase 1:
seleccion de contexto y aplicacion de cambios propuestos por agentes BAJO
aprobacion humana explicita. Aqui SI se puede escribir, pero solo tras el gate.

## Entra
- `workspace.py`: recorrer el arbol de un proyecto respetando `.enjambreignore`
  (+ patrones de `.gitignore`-style) y `policy.BLOCKED_FILES`; construir un string
  de contexto con los archivos seleccionados, redactando secretos (policy).
- `changes.py`: tipo `Change(path, new_content)` y `ChangeSet`; generar unified
  diff contra el contenido actual; `apply()` que:
  - RECHAZA si `approved` no es True (safety gate, regla dura del ecosistema).
  - bloquea rutas en `BLOCKED_FILES` y escapes fuera de la raiz (path traversal).
  - escanea secretos en el contenido nuevo y aborta si los hay.
  - opcionalmente crea una branch temporal git antes de escribir.
- Tests con `tmp_path` para workspace y changes (incluye rechazo sin aprobacion,
  bloqueo de archivos sensibles, path traversal, diff correcto).
- Seccion minima en `app.py`: arbol, seleccion, vista de diff, boton Aplicar
  (con aprobacion explicita).

## NO entra (fases posteriores)
- Orquestacion multi-rol / debate / votacion (Fase 3).
- GitHub / PRs (Fase 4). Sandbox Docker / ejecucion de tests (Fase 5).
- Generar el diff CON un agente real end-to-end (eso usa el core de Fase 1; aqui
  el foco es revisar/aplicar un diff dado de forma segura).

## Verificacion (objetiva)
- `pytest` en verde (Fase 1 + Fase 2).
- `apply()` lanza si `approved=False`; no escribe nada en ese caso.
- `apply()` rechaza rutas `..`/absolutas fuera de la raiz y archivos `BLOCKED_FILES`.
- `workspace.iter_files` nunca devuelve `.env`, `.git/`, `node_modules/`, etc.

## Congelado: 2026-06-17
