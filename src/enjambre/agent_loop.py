"""Loop agentico: modelo -> herramienta -> modelo, con pausa por aprobacion humana.

A diferencia del `Orchestrator` (un solo tiro, solo lectura), este loop re-llama al
proveedor con el resultado de cada herramienta hasta que el modelo entrega una
respuesta final. Las herramientas de LECTURA se ejecutan en el acto; las de
ESCRITURA/SHELL PAUSAN el loop (`awaiting_approval`) y esperan la decision humana,
que reanuda via `resume()`. El estado vive en memoria (como `cli_runs`), no se
persiste.

Seguridad: el prompt se escanea por secretos antes de salir (como en el
orchestrator); las herramientas delegan su gate a `tools` (que a su vez usa
changes/sandbox/workspace). El loop NO ejecuta nada destructivo sin `approved=True`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import httpx

from . import config, policy, tools
from .providers import Message, Usage, build_provider
from .registry import Agent, Registry

MAX_ITERS = 8


@dataclass
class PendingCall:
    """Una tool call destructiva esperando la decision humana."""

    id: str
    name: str
    arguments: dict
    danger: str
    preview: str = ""


@dataclass
class LoopState:
    """Estado completo de una corrida del loop (serializable a dict para la API)."""

    agent: str
    messages: list[Message] = field(default_factory=list)
    pending: list[PendingCall] = field(default_factory=list)
    status: str = "running"          # running | awaiting_approval | done | error
    text: str = ""                   # respuesta final cuando status == done
    usage: Usage = field(default_factory=Usage)
    cost_usd: float = 0.0
    iters: int = 0
    error: str | None = None


class ToolLoop:
    """Coordina el ciclo chat<->tools de UN agente sobre un proyecto (root)."""

    def __init__(self, registry: Registry, root: str | Path, *,
                 keys: dict[str, str] | None = None,
                 client: httpx.AsyncClient | None = None,
                 danger_allowed: set[str] | None = None,
                 max_iters: int = MAX_ITERS) -> None:
        self.registry = registry
        self.root = str(Path(root))
        self._keys = keys
        self._client = client
        self._schemas = tools.tool_schemas(danger_allowed)
        self.max_iters = max_iters

    def _key_for(self, provider: str) -> str:
        if self._keys is not None:
            return self._keys.get(provider, "")
        return config.get_key(provider)

    def _provider_for(self, agent: Agent):
        return build_provider(agent.provider, self._key_for(agent.provider),
                              client=self._client)

    def _agent(self, name: str) -> Agent | None:
        return next((a for a in self.registry.agents if a.name == name), None)

    async def start(self, agent_name: str, prompt: str) -> LoopState:
        """Arranca el loop: gate de secretos + primer turno."""
        state = LoopState(agent=agent_name)
        agent = self._agent(agent_name)
        if agent is None:
            state.status = "error"
            state.error = f"agente {agent_name!r} no existe"
            return state

        # Gate de secretos sobre el prompt antes de que salga a la red.
        scan = policy.scan_secrets(prompt)
        outgoing = policy.redact_secrets(prompt) if not scan.clean else prompt

        if agent.system_prompt:
            state.messages.append(Message("system", agent.system_prompt))
        state.messages.append(Message("user", outgoing))
        await self._advance(state, agent)
        return state

    async def resume(self, state: LoopState, agent: Agent,
                     decisions: dict[str, bool]) -> LoopState:
        """Aplica las decisiones humanas sobre las llamadas pendientes y continua."""
        if state.status != "awaiting_approval":
            return state
        for pc in state.pending:
            if decisions.get(pc.id, False):
                res = tools.dispatch(pc.name, pc.arguments, self.root, approved=True)
                content = res.content if res.ok else (res.error or "fallo")
            else:
                content = "El usuario rechazo esta accion; no se ejecuto."
            state.messages.append(Message("tool", content, tool_call_id=pc.id,
                                          name=pc.name))
        state.pending = []
        state.status = "running"
        await self._advance(state, agent)
        return state

    # --- interno ----------------------------------------------------------
    async def _advance(self, state: LoopState, agent: Agent) -> None:
        """Corre chat<->tools hasta pausar (awaiting_approval) o terminar."""
        provider = self._provider_for(agent)
        while state.iters < self.max_iters:
            state.iters += 1
            result = await provider.chat(
                state.messages, model=agent.model or None,
                tools=self._schemas or None)
            state.usage = Usage(
                state.usage.input_tokens + result.usage.input_tokens,
                state.usage.output_tokens + result.usage.output_tokens)
            state.cost_usd += result.cost_usd

            if result.error:
                state.status = "error"
                state.error = result.error
                return

            if not result.tool_calls:  # respuesta final de solo texto
                state.text = result.text
                state.status = "done"
                return

            # Turno assistant con las tool_calls que pidio el modelo.
            state.messages.append(Message("assistant", result.text or "",
                                          tool_calls=result.tool_calls))
            gated: list[PendingCall] = []
            for tc in result.tool_calls:
                if tools.needs_approval(tc.name):
                    # preview sin ejecutar (dry): diff / comando docker.
                    prev = tools.dispatch(tc.name, tc.arguments, self.root,
                                          approved=False)
                    spec = tools.get_tool(tc.name)
                    gated.append(PendingCall(
                        tc.id, tc.name, tc.arguments,
                        spec.danger if spec else "write", prev.preview))
                else:
                    # tool de lectura (o desconocida): se ejecuta ya.
                    res = tools.dispatch(tc.name, tc.arguments, self.root)
                    content = res.content if res.ok else (res.error or "fallo")
                    state.messages.append(Message("tool", content,
                                                  tool_call_id=tc.id, name=tc.name))
            if gated:
                state.pending = gated
                state.status = "awaiting_approval"
                return
            # Todas eran lecturas -> otra vuelta con sus resultados.

        # Se agoto el presupuesto de iteraciones.
        state.status = "done"
        state.text = state.text or "(se alcanzo el limite de iteraciones del loop)"
