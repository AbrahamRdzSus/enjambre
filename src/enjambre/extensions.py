"""SDK de extensiones de ENJAMBRE (Fase 6): proveedores, agentes y flujos.

Permite que terceros agreguen capacidades SIN tocar el core:
- Provider SDK: `providers.register_provider` (re-exportado aqui).
- Templates de agentes y de workflows, registrables por nombre.
- `Plugin` (protocolo) + `register_plugin` / `load_plugins` (entry points).

ADVERTENCIA de seguridad: cargar un plugin ejecuta su codigo. Instala solo
plugins en los que confies; Enjambre no aisla codigo de terceros.
"""

from __future__ import annotations

from dataclasses import dataclass
from importlib import metadata
from typing import Callable, Protocol, runtime_checkable

from .multiagent import MODES, Mode
from .providers import register_provider, unregister_provider  # re-export
from .registry import Agent

ENTRY_POINT_GROUP = "enjambre.plugins"

__all__ = [
    "register_provider", "unregister_provider",
    "AgentTemplate", "WorkflowTemplate",
    "register_agent_template", "get_agent_template", "list_agent_templates",
    "register_workflow_template", "get_workflow_template",
    "list_workflow_templates",
    "Plugin", "PluginRegistrar", "register_plugin", "load_plugins",
    "clear_templates",
]


# --- templates -------------------------------------------------------------
@dataclass(frozen=True)
class AgentTemplate:
    """Plantilla reusable de un agente. `build` la instancia con un nombre."""

    name: str
    provider: str
    model: str = ""
    role: str = "builder"
    system_prompt: str = ""

    def build(self, name: str | None = None, *, enabled: bool = True) -> Agent:
        agent = Agent(
            name=name or self.name,
            provider=self.provider,
            model=self.model,
            role=self.role,
            enabled=enabled,
            system_prompt=self.system_prompt,
        )
        agent.validate()
        return agent


@dataclass(frozen=True)
class WorkflowTemplate:
    """Plantilla de flujo de la Fase 3 (modo de orquestacion reusable)."""

    name: str
    mode: Mode
    rounds: int = 2
    description: str = ""

    def __post_init__(self) -> None:
        if self.mode not in MODES:
            raise ValueError(
                f"Modo desconocido {self.mode!r}; validos: {', '.join(MODES)}")


_AGENT_TEMPLATES: dict[str, AgentTemplate] = {}
_WORKFLOW_TEMPLATES: dict[str, WorkflowTemplate] = {}


def register_agent_template(tpl: AgentTemplate, *, overwrite: bool = False) -> None:
    _put(_AGENT_TEMPLATES, tpl.name, tpl, overwrite, "agente")


def get_agent_template(name: str) -> AgentTemplate:
    return _AGENT_TEMPLATES[name]


def list_agent_templates() -> list[str]:
    return sorted(_AGENT_TEMPLATES)


def register_workflow_template(tpl: WorkflowTemplate, *,
                               overwrite: bool = False) -> None:
    _put(_WORKFLOW_TEMPLATES, tpl.name, tpl, overwrite, "workflow")


def get_workflow_template(name: str) -> WorkflowTemplate:
    return _WORKFLOW_TEMPLATES[name]


def list_workflow_templates() -> list[str]:
    return sorted(_WORKFLOW_TEMPLATES)


def clear_templates() -> None:
    """Vacia los registros de templates (util para aislar tests)."""
    _AGENT_TEMPLATES.clear()
    _WORKFLOW_TEMPLATES.clear()


# --- plugins ---------------------------------------------------------------
@dataclass
class PluginRegistrar:
    """Lo que recibe `Plugin.register`: la API de alta del SDK.

    Es una fachada fina sobre las funciones de registro para que un plugin no
    tenga que importar medio paquete.
    """

    register_provider: Callable[..., None] = register_provider
    register_agent_template: Callable[..., None] = register_agent_template
    register_workflow_template: Callable[..., None] = register_workflow_template


@runtime_checkable
class Plugin(Protocol):
    """Contrato de un plugin: un nombre y un hook de registro."""

    name: str

    def register(self, reg: PluginRegistrar) -> None: ...


def register_plugin(plugin: Plugin, *,
                    registrar: PluginRegistrar | None = None) -> None:
    """Ejecuta el hook `register` del plugin (alta directa, sin entry points)."""
    if not hasattr(plugin, "register"):
        raise TypeError(f"El plugin {plugin!r} no implementa register()")
    plugin.register(registrar or PluginRegistrar())


def load_plugins(*, group: str = ENTRY_POINT_GROUP,
                 registrar: PluginRegistrar | None = None) -> list[str]:
    """Descubre y registra plugins publicados como entry points.

    Tolerante: si no hay ninguno, devuelve lista vacia. Devuelve los nombres de
    los plugins cargados.
    """
    reg = registrar or PluginRegistrar()
    loaded: list[str] = []
    for ep in _iter_entry_points(group):
        plugin = ep.load()
        instance = plugin() if isinstance(plugin, type) else plugin
        register_plugin(instance, registrar=reg)
        loaded.append(getattr(instance, "name", ep.name))
    return loaded


# --- interno ---------------------------------------------------------------
def _put(store: dict, name: str, value, overwrite: bool, kind: str) -> None:
    if not name:
        raise ValueError(f"El template de {kind} necesita un nombre")
    if name in store and not overwrite:
        raise ValueError(
            f"Template de {kind} {name!r} ya registrado; usa overwrite=True")
    store[name] = value


def _iter_entry_points(group: str):
    eps = metadata.entry_points()
    # API estable en 3.10+: select(group=...). Fallback defensivo.
    select = getattr(eps, "select", None)
    if select is not None:
        return list(select(group=group))
    return list(eps.get(group, []))  # type: ignore[attr-defined]
