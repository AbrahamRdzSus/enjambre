"""Loop de cierre Fase 4: tarea aprobada -> Pull Request revisable.

Ata las piezas existentes: `ChangeSet.apply` (Fase 2, escritura gated) ->
`GitOps` (branch/commit/push gated) -> `GitHubClient` (abre PR y comenta). Todo
bajo una unica aprobacion humana explicita. El token BYOK nunca entra en el
mensaje de commit ni en el cuerpo del PR: se redacta con policy antes de usarlos.
Enjambre ABRE el PR para revision humana; no lo mergea.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from . import policy
from .changes import ApprovalRequired, ChangeSet
from .github import Comment, GitHubClient, PullRequest
from .gitops import GitOps


@dataclass
class ChangeRequest:
    """Lo que el usuario aprueba enviar a GitHub."""

    repo: str                       # 'owner/name'
    branch: str                     # rama nueva para el trabajo
    title: str
    body: str = ""
    base: str = "main"
    commit_message: str | None = None   # default: el titulo
    issue_number: int | None = None     # si se da, se comenta el resumen ahi


@dataclass
class ChangeRequestResult:
    branch: str | None = None
    commit: str | None = None
    pushed: bool = False
    pull_request: PullRequest | None = None
    comment: Comment | None = None
    rejected: list[tuple[str, str]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.pull_request is not None and not self.rejected


async def submit_change_request(
    changeset: ChangeSet, gitops: GitOps, github: GitHubClient,
    request: ChangeRequest, *, approved: bool, push: bool = True,
) -> ChangeRequestResult:
    """Aplica los cambios, commitea, pushea y abre el PR. Solo si `approved`.

    Orden: branch -> apply (escribe) -> stage+commit -> push -> PR -> comentario.
    Si `apply` rechaza algun cambio, aborta antes de commitear (nada de medio loop).
    """
    if not approved:
        raise ApprovalRequired(
            "submit_change_request() requiere approved=True (aprobacion humana).")

    result = ChangeRequestResult()
    title = policy.redact_secrets(request.title)
    body = policy.redact_secrets(request.body)
    commit_msg = policy.redact_secrets(request.commit_message or request.title)

    # 1. Rama de trabajo aislada.
    result.branch = gitops.create_branch(request.branch, approved=True)

    # 2. Escribir los cambios (Fase 2: valida path traversal, secretos, bloqueados).
    apply_report = changeset.apply(Path(gitops.root), approved=True)
    if apply_report.rejected:
        result.rejected = apply_report.rejected
        result.warnings.append(
            "Cambios rechazados por el safety gate; no se commitea ni se abre PR.")
        return result
    if not apply_report.written:
        result.warnings.append("No habia cambios que escribir.")
        return result

    # 3. Stage + commit local.
    gitops.stage(approved=True)
    result.commit = gitops.commit(commit_msg, approved=True)

    # 4. Push (accion remota; respeta el flag).
    if push:
        gitops.push(branch=request.branch, approved=True)
        result.pushed = True
    else:
        result.warnings.append("push=False: el PR necesita la rama pusheada.")
        return result

    # 5. Abrir el PR.
    result.pull_request = await github.create_pull_request(
        request.repo, title=title, head=request.branch, base=request.base,
        body=body)

    # 6. Comentar el resumen en el issue origen, si se indico.
    if request.issue_number is not None:
        summary = (f"Enjambre abrio el PR #{result.pull_request.number}: "
                   f"{result.pull_request.url}")
        result.comment = await github.comment(
            request.repo, request.issue_number, summary)

    return result
