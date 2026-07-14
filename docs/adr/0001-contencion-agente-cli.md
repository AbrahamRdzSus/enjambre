# ADR 0001 - Contencion real de FS/red del agente CLI (W3, v0.6.2)

- Estado: PROPUESTO (espera OK de Abraham antes de implementar)
- Fecha: 2026-07-13
- Contexto de: auditoria ULTRA 2026-07-12 (P1 mas grande), roadmap Fase C

## Contexto

El agente CLI (`cli_agent.run_cli_task`) lanza `claude -p` en un **git worktree**. El worktree
solo aisla **ESCRITURAS**: la unica escritura al proyecto real pasa por
`changes.ChangeSet.apply(approved=True)`. Pero el proceso `claude` corre con el usuario, el
filesystem y la red COMPLETOS del sistema. Puede:

- leer cualquier archivo que el usuario pueda leer (incluido `.env`, `~/.ssh`, claves fuera
  del worktree) aunque su diff no se apruebe;
- hacer peticiones de red arbitrarias (exfiltrar lo que leyo).

Mitigacion ya hecha en v0.6.1 (W1): al subproceso se le pasa un entorno SIN claves BYOK
(`cli_agent._clean_env`). Eso quita UNA via (heredar `OPENAI_API_KEY` del entorno), pero NO
contiene lecturas de FS ni la red. Los docs ya son honestos ("el worktree aisla solo
ESCRITURAS"), pero la contencion real sigue pendiente.

**Complicacion central:** a diferencia del sandbox de `run_command` (`sandbox.py`, docker
`--network none`), `claude` **NECESITA red** para hablar con su propia API (api.anthropic.com).
No se puede cortar la red del todo. La contencion tiene que ser: **FS = solo el worktree**;
**red = egress restringido a los hosts que claude necesita**.

## Opciones

### A. Docker con worktree montado + egress allowlist  (RECOMENDADA)
Correr `claude` dentro de un contenedor que monta SOLO el worktree como volumen, con la red
filtrada a un allowlist (api.anthropic.com y lo minimo que el CLI necesite).
- Pros: reusa el patron y la dependencia que Enjambre YA exige para `run_command`
  (`sandbox.py`); aislamiento de FS fuerte (el contenedor no ve nada fuera del worktree);
  egress controlable; multiplataforma (Docker Desktop en Windows, Docker en Linux); fail-closed
  natural (sin Docker -> se bloquea, no cae a host) coherente con la decision ya tomada en
  `sandbox.py`.
- Contras: exige Docker instalado; hay que meter el binario `claude` y su auth (`~/.claude`)
  al contenedor SIN filtrar otras credenciales; egress allowlist real requiere un proxy o
  red interna + firewall (Docker `--network none` no aplica; un bridge normal deja salir a
  todo); latencia de arranque del contenedor por corrida.

### B. Sandbox OS-nativo (Windows AppContainer/Job Object; Linux bubblewrap/landlock+seccomp)
- Pros: sin dependencia de Docker; potencialmente mas ligero.
- Contras: especifico por plataforma (dos implementaciones a mantener); fragil (claude puede
  romperse bajo restricciones de token/seccomp); alta complejidad y superficie de bugs;
  dificil de testear en CI.

### C. WSL2 desechable (solo Windows)
Correr claude en una distro WSL efimera con solo el worktree bind-montado.
- Pros: aislamiento decente en Windows.
- Contras: Windows-only (Enjambre tambien corre en Linux); pesado; setup fragil.

### D. Solo proxy de egress (sin contencion de FS)
Forzar el trafico de claude por un proxy que solo permite api.anthropic.com.
- Pros: simple; ataca la exfiltracion por red.
- Contras: NO contiene lecturas locales de FS (el riesgo P1 principal). Parcial.

## Decision

**Opcion A (Docker), por fases**, reusando la infraestructura de `sandbox.py`:

- **Fase W3.1 - aislamiento de FS (entrega el grueso del valor):** correr claude en un
  contenedor con solo el worktree montado (`-v {worktree}:/work`), red bridge normal (claude
  llega a su API). Esto ya elimina la lectura de `.env`/claves FUERA del worktree, que es el
  corazon del P1. Fail-closed si no hay Docker: sin Docker, el agente CLI queda deshabilitado
  (o cae al modo actual worktree-solo-escrituras PERO marcado como no-contenido en la UI, sin
  falsa promesa). Auth de claude: montar `~/.claude` read-only, NADA mas del home.
- **Fase W3.2 - egress allowlist:** meter el contenedor en una red interna + un proxy/firewall
  que solo deje salir a los hosts necesarios; cerrar exfiltracion por red.

Se documenta que Docker es el UNICO aislamiento real (igual que en `run_command`), y que sin
Docker el agente CLI no ofrece contencion (se dice, no se finge).

## Consecuencias

- Trabajo real: empaquetar/mecanismo para `claude` + auth dentro del contenedor sin filtrar
  credenciales; definir la imagen base; manejar el mapeo de usuario/permly del volumen; medir
  latencia; tests de que sin Docker es fail-closed y de que el contenedor no ve fuera del
  worktree.
- Riesgo: la Fase W3.2 (egress) es la mas cara; si se difiere, dejar W3.1 entregado y decir en
  los docs que la red del contenedor aun no esta restringida.
- Coherencia: mismo criterio fail-closed que `sandbox.Sandbox` -> sin sorpresas para el usuario
  que ya acepto Docker para `run_command`.

## Pendiente antes de implementar

OK de Abraham sobre: (1) exigir Docker para el agente CLI (o degradar a worktree-solo marcado),
(2) alcance de la Fase W3.1 vs esperar tambien W3.2, (3) como inyectar la auth de claude al
contenedor de forma segura.
