"""ENJAMBRE core package.

Nucleo de orquestacion local-first BYOK: adapters de proveedor, registro de
agentes, politica de seguridad y orquestador paralelo (Fase 1, solo lectura).
"""

from __future__ import annotations

from . import commands, config, extensions, policy, sessions, workspace
from .changes import ApplyReport, ApprovalRequired, Change, ChangeSet
from .extensions import (
                         AgentTemplate,
                         Plugin,
                         PluginRegistrar,
                         WorkflowTemplate,
                         load_plugins,
                         register_agent_template,
                         register_plugin,
                         register_provider,
                         register_workflow_template,
)
from .gates import Gate, load_gate, parse_gate
from .github import Comment, GitHubClient, GitHubError, Issue, PullRequest
from .gitops import GitError, GitOps, Worktree
from .multiagent import MODES, Candidate, Mode, MultiAgent, MultiAgentReport, Verdict
from .orchestrator import AgentRun, OrchestrationReport, Orchestrator
from .providers import (
                         BaseProvider,
                         Message,
                         ProviderResult,
                         Usage,
                         ValidationResult,
                         build_provider,
)
from .pull_request import ChangeRequest, ChangeRequestResult, submit_change_request
from .registry import Agent, Registry
from .sandbox import AuditEntry, RunResult, Sandbox

__version__ = "1.0.0"

__all__ = [
    "__version__",
    "commands", "config", "extensions", "policy", "sessions", "workspace",
    "Orchestrator", "OrchestrationReport", "AgentRun",
    "Registry", "Agent",
    "build_provider", "BaseProvider", "Message", "ProviderResult",
    "Usage", "ValidationResult",
    "Change", "ChangeSet", "ApplyReport", "ApprovalRequired",
    "Gate", "load_gate", "parse_gate",
    "MultiAgent", "MultiAgentReport", "Candidate", "Verdict", "Mode", "MODES",
    "GitHubClient", "GitHubError", "Issue", "PullRequest", "Comment",
    "GitOps", "GitError", "Worktree",
    "ChangeRequest", "ChangeRequestResult", "submit_change_request",
    "Sandbox", "RunResult", "AuditEntry",
    "register_provider", "AgentTemplate", "WorkflowTemplate",
    "register_agent_template", "register_workflow_template",
    "Plugin", "PluginRegistrar", "register_plugin", "load_plugins",
]
