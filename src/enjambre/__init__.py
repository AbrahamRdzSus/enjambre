"""ENJAMBRE core package.

Nucleo de orquestacion local-first BYOK: adapters de proveedor, registro de
agentes, politica de seguridad y orquestador paralelo (Fase 1, solo lectura).
"""

from __future__ import annotations

from . import config, policy
from .orchestrator import AgentRun, OrchestrationReport, Orchestrator
from .providers import (BaseProvider, Message, ProviderResult, Usage,
                        ValidationResult, build_provider)
from .registry import Agent, Registry

__version__ = "0.4.0"

__all__ = [
    "__version__",
    "config", "policy",
    "Orchestrator", "OrchestrationReport", "AgentRun",
    "Registry", "Agent",
    "build_provider", "BaseProvider", "Message", "ProviderResult",
    "Usage", "ValidationResult",
]
