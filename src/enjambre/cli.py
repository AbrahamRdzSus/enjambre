"""CLI secundaria de ENJAMBRE: usa el core real sin la GUI Streamlit.

`enjambre <comando>`:
  agents              lista los agentes registrados (agents/registered.json)
  providers           lista proveedores soportados y cuales tienen clave en el entorno
  validate            valida las claves de los proveedores usados por agentes habilitados
  run "<prompt>"      despacha el prompt a los agentes y muestra salidas lado a lado

BYOK: las claves se leen del entorno (.env via python-dotenv); nunca se persisten.
Fase 1 es solo lectura: `run` NO escribe ni ejecuta archivos.

Salida en texto plano, SIN emojis/Unicode (regla Obsidia).
"""

from __future__ import annotations

import argparse
import asyncio
import sys

import httpx

from . import agentfile, config, sessions, stats
from .orchestrator import Orchestrator
from .registry import DEFAULT_PATH, Registry


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="enjambre", description=__doc__.splitlines()[0])
    p.add_argument("--registry", default=str(DEFAULT_PATH),
                   help="ruta al registro de agentes (def: agents/registered.json)")
    p.add_argument("--config", "-c", default=None,
                   help="carga agentes desde un enjambre.yaml (en vez de --registry)")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("agents", help="lista los agentes registrados")
    sub.add_parser("providers", help="lista proveedores y claves presentes")
    sub.add_parser("validate", help="valida las claves de los proveedores en uso")
    sub.add_parser("sessions", help="lista las sesiones guardadas (.enjambre/sessions)")
    sub.add_parser("stats", help="agrega uso (tokens/costo) de las sesiones guardadas")

    run = sub.add_parser("run", help="despacha un prompt a los agentes habilitados")
    run.add_argument("prompt", help="el prompt a despachar")
    run.add_argument("--agents", help="lista separada por comas; def: todos los habilitados")
    run.add_argument("--max-tokens", type=int, default=1024)
    run.add_argument("--no-redact", action="store_true",
                     help="bloquea (en vez de redactar) si el prompt trae secretos")
    run.add_argument("--save", action="store_true",
                     help="persiste la corrida como sesion (.enjambre/sessions)")
    return p


# --- comandos --------------------------------------------------------------
def cmd_agents(registry: Registry) -> int:
    if not registry.agents:
        print("(sin agentes registrados)")
        return 0
    print(f"{'NAME':<20} {'ROLE':<10} {'PROVIDER':<10} {'MODEL':<24} ENABLED")
    for a in registry.agents:
        print(f"{a.name:<20} {a.role:<10} {a.provider:<10} {a.model:<24} "
              f"{'si' if a.enabled else 'no'}")
    return 0


def cmd_providers(env: dict[str, str] | None = None) -> int:
    have = set(config.available_providers(env))
    print(f"{'PROVIDER':<12} CLAVE")
    for prov in sorted(config.PROVIDER_ENV):
        print(f"{prov:<12} {'presente' if prov in have else 'falta'}")
    return 0


def cmd_validate(registry: Registry, *, keys: dict[str, str] | None = None,
                 client: httpx.AsyncClient | None = None) -> int:
    orch = Orchestrator(registry, keys=keys, client=client)
    results = asyncio.run(orch.validate_keys())
    if not results:
        print("(no hay proveedores en uso por agentes habilitados)")
        return 0
    rc = 0
    for prov, res in sorted(results.items()):
        print(f"{prov:<12} {'OK' if res.ok else 'FALLA'}  {res.detail}")
        if not res.ok:
            rc = 1
    return rc


def cmd_run(prompt: str, registry: Registry, *, agents: list[str] | None = None,
            max_tokens: int = 1024, redact: bool = True, save: bool = False,
            keys: dict[str, str] | None = None,
            client: httpx.AsyncClient | None = None) -> int:
    orch = Orchestrator(registry, keys=keys, client=client)
    report = asyncio.run(orch.run(prompt, agents=agents, max_tokens=max_tokens,
                                  redact=redact))
    for w in report.warnings:
        print(f"[aviso] {w}")
    if not report.runs:
        return 1
    for run in report.runs:
        r = run.result
        print(f"\n=== {run.agent} ({run.provider}/{run.model}) ===")
        if r.ok:
            print(r.text.strip() or "(respuesta vacia)")
        else:
            print(f"[error] {r.error}")
    print(f"\nCosto estimado total: ${report.total_cost_usd:.6f} USD "
          f"({len(report.ok_runs)}/{len(report.runs)} ok)")
    if save:
        sid = sessions.save(report)
        print(f"Sesion guardada: {sid}")
    return 0 if report.ok_runs else 1


def cmd_stats() -> int:
    st = stats.from_store()
    if not st.sessions:
        print("(sin sesiones guardadas; corre 'enjambre run --save' primero)")
        return 0
    print(f"Sesiones: {st.sessions}  |  Tokens: {st.total_tokens}  |  "
          f"Costo total: ${st.total_cost_usd:.6f} USD\n")
    print(f"{'PROVEEDOR':<12} {'RUNS':>5} {'OK':>4} {'ERR':>4} {'TOKENS':>9} {'COSTO USD':>12}")
    for name, t in sorted(st.by_provider.items()):
        print(f"{name:<12} {t.runs:>5} {t.ok:>4} {t.errors:>4} {t.total_tokens:>9} "
              f"{t.cost_usd:>12.6f}")
    return 0


def cmd_sessions() -> int:
    items = sessions.list_sessions()
    if not items:
        print("(sin sesiones guardadas)")
        return 0
    print(f"{'ID':<24} {'KIND':<14} CREATED              PROMPT")
    for s in items:
        prompt = (s.prompt[:40] + "...") if len(s.prompt) > 40 else s.prompt
        print(f"{s.id:<24} {s.kind:<14} {s.created_at[:19]}  {prompt}")
    return 0


# --- entrypoint ------------------------------------------------------------
def main(argv: list[str] | None = None) -> int:
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:  # python-dotenv es dep del core; defensivo por si falta
        pass

    args = build_parser().parse_args(argv)
    if args.config:
        try:
            registry = agentfile.load_config(args.config).to_registry()
        except (OSError, agentfile.ConfigError) as exc:
            print(f"[error] enjambre.yaml: {exc}", file=sys.stderr)
            return 2
    else:
        registry = Registry.load(args.registry)

    if args.command == "agents":
        return cmd_agents(registry)
    if args.command == "providers":
        return cmd_providers()
    if args.command == "validate":
        return cmd_validate(registry)
    if args.command == "sessions":
        return cmd_sessions()
    if args.command == "stats":
        return cmd_stats()
    if args.command == "run":
        selected = ([s.strip() for s in args.agents.split(",")]
                    if args.agents else None)
        return cmd_run(args.prompt, registry, agents=selected,
                       max_tokens=args.max_tokens, redact=not args.no_redact,
                       save=args.save)
    return 2  # pragma: no cover - subparser required lo impide


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
