# Architecture

## Core modules

- UI
- Provider adapters
- Agent registry
- Task orchestrator
- Workspace manager
- Git/diff manager
- Safety and policy layer
- Logs and metrics

## Provider adapter contract

Cada proveedor debe implementar:

```python
class Provider:
    name: str
    def validate_key(self) -> bool: ...
    def chat(self, messages, tools=None) -> ProviderResult: ...
    def estimate_cost(self, usage) -> float: ...
```

## Agent contract

```python
class Agent:
    name: str
    role: str
    provider: str
    model: str
    enabled: bool
    system_prompt: str
```

## Safety gate

Antes de escribir o ejecutar:

1. Mostrar plan.
2. Mostrar archivos afectados.
3. Mostrar diff.
4. Pedir aprobación.
5. Ejecutar en sandbox.
6. Registrar log.
