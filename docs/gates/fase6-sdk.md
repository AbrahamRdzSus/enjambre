# Gate: fase6-sdk

Construye el ecosistema open source (Fase 6 del ROADMAP): terceros pueden agregar
PROVEEDORES, AGENTES y FLUJOS sin tocar el core. Cierra el roadmap. Criterio de
exito: "otros usuarios pueden crear proveedores, agentes y flujos sin tocar el core".

## Entra
- Provider SDK: `providers.register_provider(name, cls, *, overwrite=False)` que
  valida subclase de `BaseProvider` y la inscribe en `PROVIDERS`. A partir de ahi
  `build_provider(name, ...)` y el registro de agentes la reconocen. Sin editar el
  core.
- `extensions.py` (Plugin SDK):
  - `AgentTemplate(name, provider, model, role, system_prompt)` con `.build(name=...)`
    -> `Agent` listo para el `Registry`.
  - `WorkflowTemplate(name, mode, rounds, description)` que describe un flujo de la
    Fase 3 (modo parallel/sequential/debate/vote) reutilizable.
  - Registros en memoria: `register_agent_template` / `get_agent_template` /
    `list_agent_templates` (idem workflows).
  - `Plugin` (protocolo): expone `name` y `register(reg)` donde `reg` da acceso a
    `register_provider` / `register_agent_template` / `register_workflow_template`.
  - `load_plugins(group="enjambre.plugins")`: descubre plugins via entry points de
    `importlib.metadata` (opcional, tolerante si no hay ninguno) y los registra.
  - `register_plugin(plugin)`: alta directa (sin entry points), util para tests y
    para apps que embeban Enjambre.
- `examples/`: un plugin de ejemplo (provider eco + agente + workflow) que prueba
  el contrato end-to-end sin claves ni red.
- `docs/PLUGIN_SDK.md`: como escribir un provider, un agente, un workflow y empacar
  un plugin (entry point). Breve y accionable.

## NO entra (fuera del core de la fase)
- Marketplace alojado / web de comunidad: este slice deja el SDK y los docs; el
  hosting es infra, no codigo del core.
- Benchmarks como suite ejecutable contra proveedores reales (requiere claves/red);
  se documenta el enfoque, no se corre en CI.
- Cambiar el contrato `BaseProvider` (ya estable desde Fase 1) ni los modos de la
  Fase 3.
- Sandbox de plugins de terceros (cargar codigo arbitrario es responsabilidad del
  usuario que instala el plugin; se documenta la advertencia).

## Verificacion (objetiva)
- `pytest` en verde (Fases 1-6); no se rompe ningun test previo.
- `register_provider` rechaza una clase que no herede de `BaseProvider` y rechaza
  un nombre ya existente salvo `overwrite=True`; tras registrar, `build_provider`
  construye esa clase.
- `AgentTemplate.build` produce un `Agent` valido que el `Registry` acepta.
- `register_plugin` ejecuta el `register()` del plugin y deja disponibles su
  provider + agent template + workflow template.
- El plugin de `examples/` se carga y un agente construido desde su template corre
  por el `Orchestrator` (offline, sin red).
- Las altas de proveedor en tests no contaminan el set global entre tests
  (se limpian / usan nombres unicos).

## Congelado: 2026-06-20
