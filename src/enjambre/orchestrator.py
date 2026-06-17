"""Orquestador: despacha UN prompt a N agentes en paralelo (Fase 1).

Esta fase es de solo lectura: compara salidas lado a lado. NO escribe ni ejecuta
archivos (eso es Fase 2+ con su safety gate). El prompt se escanea por secretos
antes de salir a cualquier proveedor.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

import httpx

from . import config, policy
from .providers import Message, ProviderResult, ValidationResult, build_provider
from .registry import Agent, Registry


@dataclass
class AgentRun:
    agent: str
    provider: str
    model: str
    result: ProviderResult


@dataclass
class OrchestrationReport:
    prompt: str
    runs: list[AgentRun] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def total_cost_usd(self) -> float:
        return sum(r.result.cost_usd for r in self.runs)

    @property
    def ok_runs(self) -> list[AgentRun]:
        return [r for r in self.runs if r.result.ok]


class Orchestrator:
    """Coordina agentes del registro sobre proveedores BYOK.

    `keys` mapea proveedor -> API key; si es None se resuelven del entorno via
    `config`. `client` permite inyectar un httpx.AsyncClient (tests).
    """

    def __init__(self, registry: Registry, *,
                 keys: dict[str, str] | None = None,
                 client: httpx.AsyncClient | None = None) -> None:
        self.registry = registry
        self._keys = keys
        self._client = client

    def _key_for(self, provider: str) -> str:
        if self._keys is not None:
            return self._keys.get(provider, "")
        return config.get_key(provider)

    def _provider_for(self, agent: Agent):
        return build_provider(agent.provider, self._key_for(agent.provider),
                              client=self._client)

    async def validate_keys(self) -> dict[str, ValidationResult]:
        """Valida la clave de cada proveedor usado por agentes habilitados."""
        providers = {a.provider for a in self.registry.enabled()}
        results: dict[str, ValidationResult] = {}

        async def _one(name: str) -> tuple[str, ValidationResult]:
            prov = build_provider(name, self._key_for(name), client=self._client)
            return name, await prov.validate_key()

        for name, res in await asyncio.gather(*(_one(p) for p in providers)):
            results[name] = res
        return results

    async def run(self, prompt: str, *, agents: list[str] | None = None,
                  max_tokens: int = 1024,
                  redact: bool = True) -> OrchestrationReport:
        """Despacha `prompt` a los agentes (por nombre) o a todos los habilitados."""
        report = OrchestrationReport(prompt=prompt)

        # 1. Gate de secretos sobre el prompt antes de que salga a la red.
        scan = policy.scan_secrets(prompt)
        outgoing = prompt
        if not scan.clean:
            kinds = ", ".join(sorted({f.kind for f in scan.findings}))
            if redact:
                outgoing = policy.redact_secrets(prompt)
                report.warnings.append(
                    f"Se detectaron y redactaron secretos en el prompt ({kinds}).")
            else:
                report.warnings.append(
                    f"El prompt contiene secretos ({kinds}); envio bloqueado.")
                return report

        # 2. Seleccion de agentes.
        selected = self.registry.enabled()
        if agents is not None:
            wanted = set(agents)
            selected = [a for a in self.registry.agents if a.name in wanted]
        if not selected:
            report.warnings.append("No hay agentes seleccionados/habilitados.")
            return report

        # 3. Despacho paralelo.
        async def _dispatch(agent: Agent) -> AgentRun:
            messages = []
            if agent.system_prompt:
                messages.append(Message("system", agent.system_prompt))
            messages.append(Message("user", outgoing))
            try:
                provider = self._provider_for(agent)
                result = await provider.chat(messages, model=agent.model or None,
                                             max_tokens=max_tokens)
            except Exception as exc:  # adapter desconocido / error inesperado
                result = ProviderResult(agent.provider, agent.model, error=str(exc))
            return AgentRun(agent.name, agent.provider, agent.model, result)

        report.runs = list(await asyncio.gather(*(_dispatch(a) for a in selected)))
        return report
