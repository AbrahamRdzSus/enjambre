"""ENJAMBRE core package.

Nucleo de orquestacion local-first BYOK: adapters de proveedor, registro de
agentes, politica de seguridad y orquestador paralelo (Fase 1, solo lectura).
"""

from __future__ import annotations

from . import config, policy, workspace
from .changes import ApplyReport, ApprovalRequired, Change, ChangeSet
from .orchestrator import AgentRun, OrchestrationReport, Orchestrator
from .providers import (BaseProvider, Message, ProviderResult, Usage,
                        ValidationResult, build_provider)
from .registry import Agent, Registry

__version__ = "0.5.0"

__all__ = [
    "__version__",
    "config", "policy", "workspace",
    "Orchestrator", "OrchestrationReport", "AgentRun",
    "Registry", "Agent",
    "build_provider", "BaseProvider", "Message", "ProviderResult",
    "Usage", "ValidationResult",
    "Change", "ChangeSet", "ApplyReport", "ApprovalRequired",
]
