# Gate: fase3-multiagente

Construye la orquestacion multiagente real (Fase 3 del ROADMAP) sobre el nucleo
de Fase 1 (despacho paralelo, solo lectura) y Fase 2 (workspace + apply seguro).
Aqui los agentes dejan de compararse "sueltos": adquieren ROLES y MODOS de
colaboracion, y un pase de ARQUITECTO juzga los candidatos contra ESTE gate.
Sigue el patron de `docs/ARCHITECT_LOOP_BLUEPRINT.md` (split architect/builder,
gates congelados, arquitecto-como-revisor). Regla dura: el arquitecto NO aprueba
su propio output; la integracion final es human-in-the-loop (Fase 2 `apply`).

## Entra
- `gates.py`: parsear un gate `docs/gates/<slice>.md` a una estructura
  (`entra`, `no_entra`, `verificacion`, `congelado`); `load_gate(path)` /
  `parse_gate(text)`. El gate congelado es el contrato que usa el pase de revision.
- `multiagent.py` sobre el `Orchestrator` de Fase 1, con cuatro modos:
  - `parallel`: todos los builders responden el mismo prompt a la vez (reusa Fase 1).
  - `sequential`: cada builder recibe el output del anterior (cadena de refinamiento).
  - `debate`: N rondas; en cada ronda los builders ven las respuestas de los demas.
  - `vote`: corre `parallel` y luego el ARQUITECTO puntua/rankea los candidatos.
- Roles canonicos en `Agent.role` ya existentes: `architect` (planea/revisa, no se
  auto-aprueba) y `builder` (ejecuta). El multiagente separa builders del architect.
- Pase de revision del arquitecto: `review(gate, candidates)` -> por cada candidato
  un veredicto con score (si el arquitecto lo emite) y racional, ordenado. NUNCA
  escribe ni auto-aplica; solo recomienda para la aprobacion humana de Fase 2.
- Gate de secretos heredado de Fase 1 aplica a todo prompt saliente (incluido el
  contexto de debate y el prompt de revision).
- Tests offline (httpx.MockTransport, como Fase 1/2) de los 4 modos, del parser de
  gates y del pase de revision (incluye: sin architect -> warning; debate multironda;
  secuencial encadena; voto ordena por score).

## NO entra (fases posteriores)
- GitHub / PRs (Fase 4). Sandbox Docker / ejecucion de tests reales (Fase 5).
- Worktrees por builder: la Fase 2 deja branch temporal; subir a worktree-por-builder
  es refinamiento posterior, no bloquea este gate.
- Auto-merge / auto-apply: la integracion sigue pasando por `ChangeSet.apply`
  (Fase 2) con aprobacion humana explicita.
- UI nueva en `app.py` mas alla de exponer el modo elegido (la GUI Streamlit sigue
  siendo prototipo; el core se reusa en la migracion a Tauri).

## Verificacion (objetiva)
- `pytest` en verde (Fase 1 + Fase 2 + Fase 3); no se rompe ningun test previo.
- `parse_gate` recupera `entra`/`no_entra`/`verificacion`/`congelado` de este archivo.
- `parallel` produce un candidato por builder; `sequential` encadena (el prompt del
  builder k>0 contiene el output del k-1); `debate` con `rounds=2` ejecuta 2 rondas
  y la ronda 2 ve las respuestas de la ronda 1; `vote` devuelve candidatos ordenados.
- `review` sin agente `architect` habilitado devuelve warning y no inventa scores.
- Ningun modo escribe en disco: Fase 3 es lectura + recomendacion.

## Congelado: 2026-06-19
