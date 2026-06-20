"""Plugin de ejemplo para ENJAMBRE (Fase 6).

Muestra el contrato completo del SDK sin claves ni red: un proveedor "echo" que
responde con el ultimo mensaje, una plantilla de agente y una de workflow. Sirve
de plantilla para escribir un plugin real.

Uso directo (sin entry points):

    from enjambre.extensions import register_plugin
    from examples.echo_plugin import EchoPlugin
    register_plugin(EchoPlugin())

Como entry point, en el pyproject del paquete del plugin:

    [project.entry-points."enjambre.plugins"]
    echo = "examples.echo_plugin:EchoPlugin"
"""

from __future__ import annotations

from enjambre.extensions import AgentTemplate, PluginRegistrar, WorkflowTemplate
from enjambre.providers import (BaseProvider, Message, ProviderResult, Usage,
                                ValidationResult)


class EchoProvider(BaseProvider):
    """Proveedor local que devuelve el ultimo mensaje del usuario. Sin red."""

    name = "echo"
    default_model = "echo-1"

    async def validate_key(self) -> ValidationResult:
        return ValidationResult(True, "echo no requiere clave")

    async def chat(self, messages: list[Message], *, model: str | None = None,
                   max_tokens: int = 1024) -> ProviderResult:
        last = next((m.content for m in reversed(messages) if m.role == "user"), "")
        return ProviderResult(
            provider=self.name, model=model or self.default_model,
            text=f"echo: {last}", usage=Usage(input_tokens=len(last), output_tokens=len(last)))


ECHO_AGENT = AgentTemplate(
    name="echo-builder", provider="echo", model="echo-1", role="builder",
    system_prompt="Repite y reformula la peticion.")

ECHO_DEBATE = WorkflowTemplate(
    name="echo-debate", mode="debate", rounds=2,
    description="Debate de ejemplo entre agentes echo.")


class EchoPlugin:
    """Plugin que registra el proveedor echo + sus templates."""

    name = "echo"

    def register(self, reg: PluginRegistrar) -> None:
        reg.register_provider("echo", EchoProvider, overwrite=True)
        reg.register_agent_template(ECHO_AGENT, overwrite=True)
        reg.register_workflow_template(ECHO_DEBATE, overwrite=True)
