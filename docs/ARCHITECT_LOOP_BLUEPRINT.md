# Blueprint: architect-loop -> ENJAMBRE

Referencia de diseno tomada de [DanMcInerney/architect-loop](https://github.com/DanMcInerney/architect-loop)
(MIT, compatible con Apache-2.0 de ENJAMBRE). architect-loop es, en esencia, una
implementacion funcional de lo que ENJAMBRE promete: un **arquitecto** que planea
y revisa + **builders** que ejecutan en paralelo, coordinados por el repo como
memoria. Este documento extrae sus 5 ideas y las ancla a las fases del
`ROADMAP.md`. No copiar codigo verbatim; portar patrones.

## Las 5 ideas y donde encajan

| Idea de architect-loop | Que es | Fase ENJAMBRE | Estado |
|---|---|---|---|
| Split arquitecto/builder | Un rol planea y revisa (nunca escribe); otros ejecutan tareas aisladas | Fase 3 (roles) | A construir |
| Gates congelados (`docs/gates/`) | Criterio de aceptacion escrito y CONGELADO antes de ejecutar | Fase 2/3 (criterios) | A construir |
| Repo como memoria (`HANDOFF.md`) | Unica fuente de verdad entre sesiones; nada vive fuera del repo | Transversal | Parcial (ya hay docs/HANDOFF.md) |
| Aislamiento por worktree | Cada builder corre en un git worktree con contexto fresco | Fase 2/3 (branch temporal -> worktree) | A construir |
| Arquitecto-como-revisor | Pase SEPARADO que lee el diff contra la intencion, no solo "pasan tests" | Fase 3 + safety gate | A construir |

Patron extra: **scout-then-decompose** — un reconocimiento barato del area ANTES
de disenar las lanes, en vez de plantillas fijas. Aplica al task planner (Fase 3).

## Como se traduce a la arquitectura actual

`docs/architecture.md` ya define: Agent registry, Task orchestrator, Workspace
manager, Git/diff manager, Safety gate. El blueprint solo precisa COMO deben
comportarse:

### 1. Roles en el Agent contract
El `Agent` ya tiene `role` y `system_prompt`. Definir dos roles canonicos:
- `architect`: planea slices del tamano de un PR, escribe el gate, NO escribe codigo,
  hace el pase de revision final. Suele ser el modelo mas capaz (ej. Claude/Opus).
- `builder`: recibe UN gate, discute el spec si esta mal, ejecuta en su worktree.
  Pueden correr 1-4 en paralelo (Codex/Grok/Gemini).

### 2. Gates congelados — formato sugerido `docs/gates/<slice>.md`
```
# Gate: <slice>
## Entra
- ...
## NO entra
- ...
## Verificacion (objetiva)
- comando / prueba / evidencia observable
## Congelado: <commit-sha o fecha>   # no se edita para "hacer que pase"
```
El Task orchestrator escribe el gate ANTES de despachar builders. El Safety gate
(pasos 1-6 de architecture.md) ya cubre plan -> archivos -> diff -> aprobacion;
el gate congelado es el contrato que el pase de revision usa para juzgar.

### 3. Worktrees en el Workspace manager
La Fase 2 dice "crear branch temporal". Subir a **worktree** por builder: cada uno
ve solo su rama, sin pisar a los demas -> paralelo seguro. Limpiar worktree si no
hubo cambios.

### 4. Pase de revision separado (no auto-aprobacion)
Regla dura del ecosistema Obsidia: autor y revisor en lanes distintos. El
arquitecto NO aprueba su propio plan ejecutado por el; lee el diff de cada builder
contra el gate y decide integrar/rechazar. Esto va en el modo "comparacion por
criterios" + checkpoints de la Fase 3.

### 5. HANDOFF + gates como memoria
Ya existe `docs/HANDOFF.md`. Adoptar la convencion: HANDOFF podado (indice, no
historia) + `docs/gates/` congelados + git como log. Coincide con la plantilla
`HANDOFF.md` que inyecta project-essentials.

## Que NO copiar
- architect-loop asume Claude Code + Codex CLI por subscripcion (sin API key).
  ENJAMBRE es **BYOK multi-proveedor**: los roles se mapean a adapters, no a CLIs fijos.
- Sus skills son `.md` para Claude Code; aqui la logica vive en `src/enjambre/`
  (orchestrator/policy), no en skills externas.

## Siguiente paso concreto (rompe el "MVP simulado")
Implementar, en orden, el camino minimo del loop real sobre lo ya scaffoldeado:
1. `docs/gates/` + lectura del gate en el orchestrator (texto, sin IA aun).
2. Despacho paralelo real a 2 adapters con rol `builder` (Fase 1 ya valida keys).
3. Diff por builder en worktree (Fase 2).
4. Pase `architect` que puntua cada diff contra el gate y pide aprobacion humana.
