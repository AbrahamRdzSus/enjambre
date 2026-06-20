# Plugin SDK de ENJAMBRE

Terceros pueden agregar **proveedores**, **agentes** y **flujos** sin tocar el
core. Esta es la base del ecosistema open source (Fase 6 del ROADMAP).

> ADVERTENCIA: cargar un plugin ejecuta su codigo. Instala solo plugins en los
> que confies. Enjambre no aisla codigo de terceros.

## 1. Un proveedor nuevo

Hereda de `BaseProvider` e implementa `validate_key` y `chat`. Recibe la API key
en el constructor (BYOK) y nunca la persiste.

```python
from enjambre.providers import (BaseProvider, Message, ProviderResult,
                                ValidationResult)

class MiProvider(BaseProvider):
    name = "miproveedor"
    default_model = "modelo-1"

    async def validate_key(self) -> ValidationResult:
        return ValidationResult(bool(self.api_key), "")

    async def chat(self, messages: list[Message], *, model=None,
                   max_tokens=1024) -> ProviderResult:
        ...  # llamada HTTP con self.api_key; usa self._http() para el cliente
        return ProviderResult(self.name, model or self.default_model, text="...")
```

Registralo (sin editar el core):

```python
from enjambre.providers import register_provider
register_provider("miproveedor", MiProvider)
# A partir de aqui build_provider("miproveedor", key) y los agentes lo reconocen.
```

## 2. Plantillas de agente y de workflow

```python
from enjambre.extensions import (AgentTemplate, WorkflowTemplate,
                                 register_agent_template, register_workflow_template)

register_agent_template(AgentTemplate(
    name="qa", provider="miproveedor", role="builder",
    system_prompt="Eres QA. Encuentra bugs."))

register_workflow_template(WorkflowTemplate(
    name="revision-doble", mode="debate", rounds=2,
    description="Dos agentes debaten y un arquitecto puntua."))

agent = get_agent_template("qa").build(name="qa-1")  # -> Agent listo
```

Modos validos de workflow: `parallel`, `sequential`, `debate`, `vote` (Fase 3).

## 3. Empaquetar un plugin

Un plugin es un objeto con `name` y `register(reg)`:

```python
class MiPlugin:
    name = "mi-plugin"
    def register(self, reg):
        reg.register_provider("miproveedor", MiProvider)
        reg.register_agent_template(AgentTemplate("qa", provider="miproveedor"))
        reg.register_workflow_template(WorkflowTemplate("revision-doble", mode="debate"))
```

Alta directa (apps que embeban Enjambre, o tests):

```python
from enjambre.extensions import register_plugin
register_plugin(MiPlugin())
```

Descubrimiento automatico via entry points, en el `pyproject.toml` del plugin:

```toml
[project.entry-points."enjambre.plugins"]
mi-plugin = "mi_paquete.plugin:MiPlugin"
```

```python
from enjambre.extensions import load_plugins
load_plugins()  # descubre y registra todos los entry points del grupo
```

## 4. Ejemplo completo

`examples/echo_plugin.py` registra un proveedor `echo` (sin red ni claves), una
plantilla de agente y una de workflow. Sirve de punto de partida.

## 5. Benchmarks (enfoque)

Comparar proveedores/agentes se hace con tus propias claves y un set de tareas;
no se corre en CI (requiere red/claves). Reusa el `Orchestrator` (modo `vote` de
la Fase 3) y la estimacion de costo de cada `ProviderResult` para puntuar.
