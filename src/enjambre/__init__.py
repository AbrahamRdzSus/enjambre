"""ENJAMBRE core package.

Nucleo de orquestacion local-first BYOK: adapters de proveedor, registro de
agentes, politica de seguridad y orquestador paralelo (Fase 1, solo lectura).
"""

from __future__ import annotations

from . import config, policy, workspace
from .changes import ApplyReport, ApprovalRequired, Change, ChangeSet
from .gates import Gate, load_gate, parse_gate
from .github import (Comment, GitHubClient, GitHubError, Issue, PullRequest)
from .gitops import GitError, GitOps
from .multiagent import (MODES, Candidate, Mode, MultiAgent, MultiAgentReport,
                         Verdict)
from .orchestrator import AgentRun, OrchestrationReport, Orchestrator
from .providers import (BaseProvider, Message, ProviderResult, Usage,
                        ValidationResult, build_provider)
from .pull_request import (ChangeRequest, ChangeRequestResult,
                           submit_change_request)
from .registry import Agent, Registry

__version__ = "0.7.0"

__all__ = [
    "__version__",
    "config", "policy", "workspace",
    "Orchestrator", "OrchestrationReport", "AgentRun",
    "Registry", "Agent",
    "build_provider", "BaseProvider", "Message", "ProviderResult",
    "Usage", "ValidationResult",
    "Change", "ChangeSet", "ApplyReport", "ApprovalRequired",
    "Gate", "load_gate", "parse_gate",
    "MultiAgent", "MultiAgentReport", "Candidate", "Verdict", "Mode", "MODES",
    "GitHubClient", "GitHubError", "Issue", "PullRequest", "Comment",
    "GitOps", "GitError",
    "ChangeRequest", "ChangeRequestResult", "submit_change_request",
]
