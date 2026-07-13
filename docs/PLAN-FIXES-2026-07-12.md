# Plan de Fixes — Enjambre — 2026-07-12

> Derivado de `docs/AUDITORIA-ULTRA-2026-07-12.md` (doble auditor Claude + Codex).
> **Este documento se APRUEBA antes de ejecutar. NO implementa nada: es solo el plan.**
> Rama objetivo: `feat/v0.6.1-robustez`. Modelo de amenaza: proceso local del mismo
> usuario o prompt/modelo malicioso dentro del agente CLI. No hay brecha remota.

## Resumen de severidad

- 9 hallazgos P1 (seguridad / promesas sobre-vendidas).
- 7 hallazgos P2 (correctitud / robustez / higiene).

Esfuerzo: S = < media jornada, M = 1-2 jornadas, L = 3+ jornadas o decision de diseno.

---

## P1 — Hallazgos

### P1-1 — El agente CLI NO esta sandboxeado; puede leer las claves BYOK
- Severidad: P1
- Ruta: `src/enjambre/cli_agent.py:89-154` (spawn en `:123`)
- Problema: el "worktree aislado" solo aisla las ESCRITURAS al repo destino. El
  proceso `claude` corre con el usuario real, red y entorno completos: puede LEER
  cualquier ruta (incluido `.env` con las claves BYOK), exfiltrar por red y tocar el
  sistema fuera del worktree. El gate humano solo cubre APLICAR el diff.
- Pasos:
  1. Decidir el nivel de contencion. Opcion minima (S): no cambiar ejecucion pero
     ajustar los claims (ver P1-8) documentando que el CLI corre con acceso total.
  2. Opcion real (L): confinar el proceso `claude`:
     - Lanzarlo con un entorno reducido (`env=` explicito), SIN heredar variables de
       proveedor/BYOK ni `PATH` ampliado; nunca pasar las keys al subproceso.
     - Restringir el CWD y, donde el SO lo permita, la FS visible (contenedor
       `docker --network none` como ya existe para el sandbox de comandos, o job
       object / restricciones de red en Windows).
     - Allowlist de rutas legibles (reusar el patron `ENJAMBRE_ALLOWED_ROOTS`).
  3. Ajustar `SECURITY.md` (el token NO protege de malware del mismo usuario) y los
     claims de "worktree aislado" en `CLAUDE.md` / `docs/CLI_AGENT.md`.
- Criterio de aceptacion: test que verifique que el entorno pasado al subproceso NO
  contiene claves BYOK ni variables de proveedor; documentacion actualizada. Si se
  implementa contencion FS, test de que el agente no puede leer una ruta fuera del
  allowlist.
- Esfuerzo: S (solo re-documentar) / L (contencion real).

### P1-2 — Traversal de lectura en `/workspace/context` (VERIFICADO)
- Severidad: P1
- Ruta: `src/enjambre/workspace.py:82` (`build_context`)
- Problema: hace `root / rel_norm` sin `resolve()+is_relative_to`, asi que
  `../../archivo` o una ruta absoluta lee fuera del root. Mitigado (no cerrado) por
  `is_blocked_file` + `redact_secrets`.
- Pasos:
  1. En `build_context`, tras componer la ruta candidata: `candidate = (root / rel).resolve()`.
  2. Rechazar si `not candidate.is_relative_to(root.resolve())` (error 400 / omitir).
  3. Reusar el mismo patron ya presente en `ChangeSet.apply` (fuente de verdad).
- Criterio de aceptacion: test que reproduzca el traversal (`rel="../../etc/hosts"` y
  una ruta absoluta) y verifique que ahora se BLOQUEA (excepcion o exclusion), no que
  se lee y redacta.
- Esfuerzo: S.

### P1-3 — `/changes/preview` lee el archivo ANTES de validar traversal
- Severidad: P1
- Ruta: `src/enjambre/changes.py:27`, `src/enjambre/api.py:562`
- Problema: exfiltra un archivo externo via un diff sin necesidad de aplicar cambios.
- Pasos:
  1. Validar `resolve()+is_relative_to(root)` ANTES de abrir/leer el archivo en el
     path de preview.
  2. Compartir el helper de validacion con P1-2 (una sola funcion `safe_resolve`).
- Criterio de aceptacion: test que pida preview de una ruta fuera del root y verifique
  que falla antes de leer (no devuelve contenido externo).
- Esfuerzo: S.

### P1-4 — La aprobacion re-lee el worktree vivo (TOCTOU)
- Severidad: P1
- Ruta: `src/enjambre/api.py:638`
- Problema: un proceso hijo persistente puede cambiar archivos entre el preview y el
  approve; borrados/binarios/permisos/symlinks no se reproducen fielmente. Se aplica
  el estado vivo, no el diff revisado.
- Pasos:
  1. Persistir el diff REVISADO en el preview (snapshot inmutable, ya identificado por id).
  2. En approve, aplicar ese diff guardado, no re-derivarlo del worktree.
  3. Cerrar/limpiar procesos hijos antes de aplicar (ligado a P1-6).
- Criterio de aceptacion: test que modifique un archivo del worktree entre preview y
  approve y verifique que se aplica el diff original, no la mutacion.
- Esfuerzo: M.

### P1-5 — `ok=True` sin comprobar `proc.returncode` (VERIFICADO)
- Severidad: P1
- Ruta: `src/enjambre/cli_agent.py:153`
- Problema: `claude` puede terminar en error y la API igual devuelve exito si git puede
  calcular el diff. Fallo silencioso; justo lo que la rama "robustez" deberia cerrar.
- Pasos:
  1. Capturar `proc.returncode` tras el `await`/`communicate`.
  2. Si `returncode != 0`: marcar `ok=False`, propagar stderr/exit code al estado de
     la sesion y a la respuesta.
- Criterio de aceptacion: test con un comando CLI que retorne exit != 0 y verifique que
  la API devuelve `ok=False` con el codigo/mensaje de error.
- Esfuerzo: S.

### P1-6 — El timeout mata solo el proceso padre, no el arbol
- Severidad: P1
- Ruta: `src/enjambre/cli_agent.py:130`
- Problema: un agente/comando malicioso deja hijos vivos fuera de la limpieza.
- Pasos:
  1. Lanzar el proceso en su propio grupo/job (Windows: Job Object con
     kill-on-close; POSIX: `start_new_session=True` + kill al grupo).
  2. En timeout/cancelacion, terminar el arbol completo, no solo el PID padre.
- Criterio de aceptacion: test que spawnee un hijo de larga duracion y verifique que
  tras el timeout no quedan procesos vivos del arbol.
- Esfuerzo: M.

### P1-7 — La sesion guarda el prompt ORIGINAL en claro
- Severidad: P1
- Ruta: `src/enjambre/orchestrator.py:83`, `src/enjambre/sessions.py:72`, `frontend/src/pages/RunPage.tsx:80`
- Problema: el enviado al proveedor se redacta, la sesion no. Una API key pegada por
  error en el prompt se persiste en claro, y `save` esta activo por defecto.
- Pasos:
  1. Aplicar `redact_secrets` al prompt ANTES de persistirlo en la sesion.
  2. Verificar que el mismo redactado se refleja en la reconstruccion / UI.
- Criterio de aceptacion: test que guarde una sesion con un prompt que contenga un
  patron de API key y verifique que lo persistido esta redactado.
- Esfuerzo: S.

### P1-8 — `confirm`/`approved` es un booleano del cliente; sin roots permitidos
- Severidad: P1
- Ruta: `src/enjambre/api.py:171,192,638`; claim en `SECURITY.md:60`
- Problema: quien tenga el token registra cualquier root y pide escritura/ejecucion
  CLI. `SECURITY.md` afirma que el token protege contra malware local = FALSO para
  procesos del mismo usuario.
- Pasos:
  1. Exigir que los roots registrables esten dentro de `ENJAMBRE_ALLOWED_ROOTS`
     (rechazar fuera de la allowlist).
  2. Corregir `SECURITY.md:60`: el token NO protege frente a malware del mismo usuario;
     define con precision que SI protege (paginas web, otros usuarios, DNS-rebinding).
- Criterio de aceptacion: test que intente registrar un root fuera de la allowlist y
  verifique rechazo; revision del texto de `SECURITY.md`.
- Esfuerzo: M.

### P1-9 — Politica de comandos del sandbox host es denylist bypassable
- Severidad: P1
- Ruta: `src/enjambre/commands.py:15-46`
- Problema: regex sobre la linea de comando, trivial de evadir (`python -c`, `bash -c`,
  `git config core.hooksPath`). Solo `docker --network none` es sandbox real.
- Pasos:
  1. Documentar que el modo host NO es sandbox (solo docker lo es).
  2. Preferir allowlist de binarios/argumentos permitidos sobre denylist regex, o
     forzar docker para ejecucion real (fail-closed si no hay docker, como ya hace
     `ChangeSet`).
- Criterio de aceptacion: test que demuestre que un bypass conocido (`python -c "..."`)
  ya no pasa el filtro en modo host, o que el modo host queda documentado/forzado a
  docker.
- Esfuerzo: M.

---

## P2 — Correctitud / robustez / higiene

### P2-1 — Costo del arquitecto no se contabiliza
- Severidad: P2 | Ruta: `src/enjambre/multiagent.py:90-92`
- Pasos: sumar los tokens de los `verdicts` del arquitecto (modos vote/debate) al costo
  reportado, igual que se hizo con el bug 0-tokens de candidatos.
- Criterio: test que corra vote/debate y verifique que el costo incluye el del arquitecto.
- Esfuerzo: S.

### P2-2 — `/run` solo expone candidatos de la ultima ronda en debate
- Severidad: P2 | Ruta: `src/enjambre/api.py:118`
- Pasos: exponer tokens agregados de todas las rondas (sesiones/stats ya agregan bien;
  alinear la respuesta de `/run`).
- Criterio: test de debate multi-ronda donde los tokens de `/run` == suma de rondas.
- Esfuerzo: S.

### P2-3 — `MultiAgentReport` sin `prompt`; `usage` como dict al reconstruir
- Severidad: P2 | Ruta: `src/enjambre/sessions.py:66`, `src/enjambre/sessions.py:123`
- Pasos: incluir `prompt` en `MultiAgentReport` (sequential/debate/vote); al
  reconstruir, rehidratar `usage` a `Usage` (no `dict`) para consumidores que hacen
  `c.usage.input_tokens`.
- Criterio: test de round-trip guardar/cargar sesion multiagente que verifique `prompt`
  no vacio y `usage` como `Usage`.
- Esfuerzo: S.

### P2-4 — Falso exito con texto vacio
- Severidad: P2 | Ruta: `src/enjambre/openai_compat.py:70`
- Pasos: una respuesta 200 sin `choices`/contenido nulo debe marcarse como fallo, no
  convertirse en texto vacio exitoso.
- Criterio: test con payload 200 sin `choices` que verifique resultado fallido.
- Esfuerzo: S.

### P2-5 — Fallos silenciosos de estado
- Severidad: P2 | Ruta: `src/enjambre/projects.py:37`, `src/enjambre/logs.py:54`, `frontend/src/AppShell.tsx:34`
- Pasos: JSON corrupto debe avisar (log/warning) en vez de devolver lista vacia; contar
  eventos descartados de suscriptores lentos (metrica); `/health` OK no debe afirmar
  "Todos los sistemas" si el puerto pudo ser ocupado por otro proceso (validar identidad
  del sidecar, p. ej. con el token o un ping firmado).
- Criterio: tests unitarios de JSON corrupto (avisa) y de metrica de descartes.
- Esfuerzo: M.

### P2-6 — Endurecimiento de token (timing / query param)
- Severidad: P2 | Ruta: `src/enjambre/api.py:324` (`!=`)
- Pasos: usar `secrets.compare_digest` para comparar el token; evitar el token en query
  param (`?token=`) para SSE (mover a header o cookie de sesion) para que no filtre a
  logs.
- Criterio: test que verifique uso de `compare_digest`; revision de que SSE no usa query
  param con el token.
- Esfuerzo: S.

### P2-7 — Multi-modelo sobre-vendido + higiene de LICENSE/deps
- Severidad: P2 | Ruta: `CLAUDE.md`, `docs/CLI_AGENT.md`, `LICENSE`, `requirements.txt`
- Pasos: ajustar el claim multi-modelo (el agente CLI esta hardcodeado a `claude`; el
  resto son llamadas de texto a APIs); completar `LICENSE` con el texto Apache-2.0
  integro; fijar versiones en `requirements.txt` y quitar `rich` si ya no se usa; anadir
  SBOM/THIRD_PARTY_NOTICES.
- Criterio: revision manual; `LICENSE` con texto completo; `requirements.txt` con
  versiones pinneadas.
- Esfuerzo: S.

---

## Orden recomendado

Sigue la prioridad de la auditoria (seccion 4), agrupando por costo y dependencia:

1. **Wave 1 (S, cierres rapidos de seguridad):** P1-2, P1-3 (helper `safe_resolve`
   compartido), P1-5, P1-7, y la parte de re-documentacion de P1-1 y P1-8.
2. **Wave 2 (M, robustez de procesos):** P1-6 (matar arbol) -> habilita P1-4 (aplicar
   diff revisado). P1-8 allowlist de roots. P1-9 politica de comandos.
3. **Wave 3 (L, contencion real):** P1-1 confinamiento FS/red del agente CLI (decision
   de diseno; puede diferirse si se acepta el claim documentado en Wave 1).
4. **Wave 4 (P2):** P2-1, P2-2, P2-3, P2-4 (correctitud de costos/estado), P2-6
   (endurecimiento token), luego P2-5 y P2-7 (higiene).

Regla: cada fix entra con su test de regresion (regla de seguridad del monorepo). Los
traversal (P1-2, P1-3) exigen un test que REPRODUZCA el traversal y verifique bloqueo.

---

**Este plan se aprueba antes de ejecutar. NO implementa nada.**
