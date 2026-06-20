# Gate: fase5-sandbox

Construye la ejecucion segura (Fase 5 del ROADMAP): Enjambre puede ejecutar los
tests de un cambio SIN poner en riesgo la maquina del usuario. Complementa la
Fase 4: antes de abrir el PR se pueden correr los tests y reportar el resultado.
Regla dura: ejecutar es accion destructiva -> aprobacion humana, igual que apply.

## Entra
- `commands.py`: politica de comandos peligrosos. `check_command(argv)` devuelve
  un motivo si el comando es peligroso (None si es seguro). Bloquea como minimo:
  `rm -rf` sobre `/`/`~`/`*`, `dd`, `mkfs`, fork-bomb, `shutdown`/`reboot`,
  `chmod`/`chown -R` sobre `/`, `curl|wget ... | sh/bash`, `sudo`/`su`,
  `git push --force`, redirecciones a dispositivos (`> /dev/sd*`).
- `sandbox.py`: runner aislado.
  - `mode="dry"` (DEFECTO): no ejecuta; devuelve el plan (comando + aislamiento).
    No requiere aprobacion (es preview).
  - Ejecucion real (`mode="docker"` | `"host"`) requiere `approved=True`.
  - `mode="docker"`: corre en contenedor con `--network none`, working dir montado,
    timeout. Si Docker no esta disponible, BLOQUEA (no cae a host en silencio).
  - `mode="host"`: ejecucion directa, solo si se pide explicitamente.
  - Politica de comandos se aplica SIEMPRE antes de ejecutar (incluso en host);
    un comando peligroso nunca se ejecuta aunque haya aprobacion.
  - Captura stdout/stderr/exit code/duracion. Timeout -> resultado marcado.
  - `RunResult` con `ok` (exit 0 y no bloqueado), `blocked` (motivo), `mode`.
  - Log auditable: cada intento (ejecutado o bloqueado) se registra en
    `Sandbox.audit` con timestamp, argv, modo y desenlace.
  - `run_tests(cmd=...)`: conveniencia que corre el comando de tests del repo y
    devuelve un `RunResult` reportable (apto para adjuntar al PR de Fase 4).

## NO entra (fases posteriores)
- Plugin/Provider SDK, marketplace (Fase 6).
- Construir/publicar imagenes Docker propias: se usa una imagen base parametrizable.
- Reintentos automaticos con IA / auto-fix: este slice ejecuta y reporta; el loop
  de correccion vive en la orquestacion (Fase 3) bajo aprobacion humana.
- UI nueva en `app.py` mas alla de exponer la accion (GUI sigue siendo prototipo).
- Integrar el reporte dentro de `submit_change_request` (Fase 4) de forma automatica:
  aqui se entrega el `RunResult` reportable; cablearlo al cuerpo del PR es opcional.

## Verificacion (objetiva)
- `pytest` en verde (Fases 1-5); no se rompe ningun test previo.
- `check_command` detecta los peligrosos listados y deja pasar uno seguro (pytest).
- `mode="dry"` no ejecuta y no requiere aprobacion.
- Ejecucion real sin `approved=True` lanza; un comando peligroso nunca se ejecuta
  aunque `approved=True` (devuelve `blocked`).
- `mode="docker"` con Docker ausente devuelve `blocked` (no ejecuta en host).
- Ejecucion en host de un comando seguro captura stdout y exit code, y agrega una
  entrada al log de auditoria. Timeout produce un resultado marcado, no cuelga.

## Congelado: 2026-06-20
