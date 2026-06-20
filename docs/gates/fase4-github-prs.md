# Gate: fase4-github-prs

Construye la integracion con GitHub (Fase 4 del ROADMAP): convertir una tarea
aprobada en un Pull Request revisable en el repo DEL USUARIO. Cierra el loop
sobre Fase 2 (ChangeSet + apply gated) y Fase 3 (multiagente). Esta es una
FUNCION del programa para su usuario final (BYOK), no el flujo de desarrollo de
Enjambre.

## Entra
- `config.github_token()`: lee `GITHUB_TOKEN` del entorno (ya en `.env.example`).
  BYOK: el core nunca persiste el token; vive en memoria por sesion.
- `github.py`: cliente REST httpx INYECTABLE (mismo patron que los providers,
  100% offline-testable con MockTransport). Operaciones minimas:
  - `list_issues(repo)` -> issues abiertos (numero, titulo, cuerpo, url).
  - `create_pull_request(repo, title, head, base, body)` -> PR creado (numero, url).
  - `comment(repo, number, body)` -> comentario en issue/PR (resumen + logs).
  Auth `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`.
  `repo` en formato `owner/name`.
- `gitops.py`: git local via subprocess, cada mutacion GATED por aprobacion
  humana (regla dura: branch/commit/push son acciones que escriben). Reutiliza el
  patron del helper de `changes.py`. Operaciones: `current_branch`, `has_changes`,
  `create_branch`, `stage`, `commit(msg, approved=...)`, `push(remote, branch, approved=...)`.
- Loop de cierre `submit_change_request(...)`: ata `ChangeSet` (Fase 2) ->
  branch+commit (gitops) -> push -> PR (github) -> comentario opcional con resumen.
  RECHAZA sin `approved=True`. El token nunca entra en prompts, diffs ni cuerpo de
  PR (policy.scan_secrets/redact ya cubre `github_token`).
- Tests offline: github con MockTransport; gitops y el loop contra un repo git
  temporal (tmp_path) usando un repo BARE local como `origin` (push sin red).
  Cubren: rechazo sin aprobacion, creacion de PR, lectura de issues, comentario,
  y que el token no se filtra.

## NO entra (fases posteriores)
- Sandbox Docker / ejecucion de tests reales del repo del usuario (Fase 5).
- Plugin/Provider SDK, marketplace (Fase 6).
- Auto-merge del PR: Enjambre ABRE el PR para revision humana; no lo mergea solo.
- OAuth app / GitHub App flow: en este slice es BYOK con Personal Access Token.
- UI nueva en `app.py` mas alla de exponer la accion (GUI sigue siendo prototipo).

## Verificacion (objetiva)
- `pytest` en verde (Fases 1-4); no se rompe ningun test previo.
- `create_pull_request` arma el payload correcto y parsea numero/url de la respuesta.
- `gitops.commit`/`push` lanzan si `approved` no es True; no mutan en ese caso.
- `submit_change_request` sin `approved=True` no escribe, no commitea, no pushea.
- El token BYOK no aparece en ningun prompt, diff ni cuerpo de PR.
- `github.py` no hace ninguna llamada de red real en tests (cliente inyectado).

## Congelado: 2026-06-20
