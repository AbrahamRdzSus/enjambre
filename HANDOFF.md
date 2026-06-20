# HANDOFF — enjambre

> Memoria viva del repo. El repositorio (este archivo + git + `docs/gates/`) es la
> unica fuente de verdad entre sesiones y entre agentes. No dependas de contexto
> que viva fuera del repo. Manten este archivo PODADO: indice, no historia completa.

## Estado actual
- Rama / version: feature/nucleo-real / core v0.5.0 (main quedo intacta; entra por PR)
- Que funciona hoy:
  - FASE 1 - nucleo de orquestacion real (rompe el "MVP simulado"): adapters httpx
    (OpenAI, xAI, Anthropic, Google) con validate_key/chat/estimate_cost;
    `registry.py` (UTF-8, recupera UTF-16 heredado); `config.py` (proveedor->env);
    `orchestrator.py` (despacho PARALELO asyncio, solo lectura); `policy.py`
    cableado (secret scanner + redaccion). Gate: docs/gates/core-real-orchestration.md.
  - FASE 2 - workspace seguro: `workspace.py` (arbol respetando .enjambreignore +
    BLOCKED_FILES, contexto con secretos redactados); `changes.py` (Change/ChangeSet,
    unified diff, apply() bajo aprobacion humana: rechaza sin approved, bloquea path
    traversal/archivos sensibles/secretos, atomico, branch temporal git opcional).
    Gate: docs/gates/fase2-workspace-seguro.md.
  - `app.py`: 2 pestañas (Comparar agentes / Workspace), sin simulacion.
  - 41 tests en verde (offline, httpx.MockTransport + tmp_path).
- Que esta a medias: GUI Streamlit funcional pero prototipo; la migracion a Tauri
  (decision arquitectonica) sigue pendiente y reusara este mismo core.

## Siguiente paso
1. Fase 3 (orquestacion multiagente real): roles architect/builder, modos
   paralelo/secuencial/debate/votacion, comparacion por criterios, checkpoints.
   El blueprint architect-loop (docs/ARCHITECT_LOOP_BLUEPRINT.md) guia esto.
2. Migracion incremental a sidecar Tauri consumiendo `src/enjambre` (este core).

## Decisiones congeladas
<!-- Decisiones que NO se vuelven a discutir sin una razon nueva. Linkea el commit/gate. -->
- Fase 1 es SOLO LECTURA: el orchestrator nunca escribe ni ejecuta archivos
  (gate core-real-orchestration). La escritura llega en Fase 2 con safety gate.
- Proveedores soportados y sus nombres canonicos viven en `providers/__init__.py`
  (PROVIDERS) y se mapean a env vars en `config.PROVIDER_ENV` (= .env.example).
- BYOK: el core nunca persiste claves; viven en memoria por sesion.

## Riesgos / bloqueos abiertos
- ACCION DEL USUARIO: rotar/revocar las 2 claves filtradas en la carpeta vieja
  (OpenAI sk-proj-..., Gemini AQ.Ab8...). No estan en el repo canonico.
- El harness Write preserva el encoding previo de un archivo existente: al
  sobrescribir registered.json (era UTF-16) quedo UTF-16 sin BOM. Resuelto
  reescribiendo via Python (Registry.save -> UTF-8) y el lector ya tolera ambos.
- Precios en los adapters son ESTIMACIONES (no facturacion real); revisar al subir.

## Gates de aceptacion (docs/gates/)
Antes de ejecutar un cambio grande, escribe el criterio de aceptacion en
`docs/gates/<slice>.md` y CONGELALO (no lo edites para que pase el trabajo a
posteriori). Un gate define: que entra, que NO entra, y como se verifica
(comando, prueba, o evidencia observable). El que ejecuta cumple el gate; un
pase de revision SEPARADO juzga el diff contra la intencion, no solo "pasan los
tests".

## Protocolo de trabajo (resumen)
1. SCOUT: reconocimiento barato del area antes de planear (no plantillas fijas).
2. GATE: congela criterios en `docs/gates/`.
3. EJECUTA: cambios del tamano de un PR; aislar trabajo paralelo (worktrees) si aplica.
4. REVISA: pase separado que lee el diff contra la intencion + corre los gates.
5. ACTUALIZA este HANDOFF y poda lo viejo.

_Ultima actualizacion: 2026-06-17_
