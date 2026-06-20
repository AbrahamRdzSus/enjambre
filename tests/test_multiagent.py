"""Tests de la orquestacion multiagente (Fase 3), offline con MockTransport.

El transporte distingue dos clases de llamada por el cuerpo del prompt:
- prompt de revision (contiene "ARQUITECTO"): responde "SCORE: <n>" donde n
  depende del candidato citado, para poder verificar el ranking del voto.
- prompt normal de builder: responde un texto marcado con el modelo y un eco del
  prompt (para verificar que secuencial/debate encadenan contexto).
"""

import asyncio
import json

import httpx

from enjambre.gates import parse_gate
from enjambre.multiagent import MultiAgent
from enjambre.registry import Agent, Registry

KEYS = {"openai": "ok", "anthropic": "ok", "google": "ok", "xai": "ok"}


def _text_from_body(body: dict) -> str:
    """Reconstruye el prompt enviado, sea formato OpenAI o Anthropic."""
    if "messages" in body:
        return " ".join(m.get("content", "") for m in body["messages"]
                        if isinstance(m.get("content"), str))
    return json.dumps(body)


def _handler(request: httpx.Request) -> httpx.Response:
    body = json.loads(request.content) if request.content else {}
    prompt = _text_from_body(body)

    if "ARQUITECTO" in prompt:
        # Score mas alto si revisa al builder openai; sirve para ordenar el voto.
        score = 92 if "PROPUESTA DE a-openai" in prompt else 60
        text = f"SCORE: {score}\nRacional: juzgado contra el gate."
    else:
        # Eco corto del prompt para verificar encadenamiento secuencial/debate.
        tail = prompt[-60:].replace("\n", " ")
        text = f"respuesta[...{tail}]"

    if request.url.path.endswith("/messages"):
        return httpx.Response(200, json={
            "content": [{"type": "text", "text": text}],
            "usage": {"input_tokens": 12, "output_tokens": 7},
        })
    return httpx.Response(200, json={
        "choices": [{"message": {"content": text}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5},
    })


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(_handler))


def _ma(registry: Registry) -> MultiAgent:
    return MultiAgent(registry, keys=KEYS, client=_client())


def _builders_only() -> Registry:
    return Registry([
        Agent(name="a-openai", provider="openai", model="gpt-4o-mini", role="builder"),
        Agent(name="b-xai", provider="xai", model="grok-2", role="builder"),
    ])


def _with_architect() -> Registry:
    return Registry([
        Agent(name="a-openai", provider="openai", model="gpt-4o-mini", role="builder"),
        Agent(name="b-xai", provider="xai", model="grok-2", role="builder"),
        Agent(name="arch", provider="anthropic", model="claude-opus-4-8",
               role="architect"),
    ])


# --- modos -----------------------------------------------------------------
def test_parallel_one_candidate_per_builder():
    ma = _ma(_builders_only())
    rep = asyncio.run(ma.run("parallel", "arregla el bug", review=False))
    assert len(rep.rounds) == 1
    assert {c.agent for c in rep.final} == {"a-openai", "b-xai"}
    assert all(c.ok for c in rep.final)


def test_sequential_chains_previous_output():
    ma = _ma(_builders_only())
    rep = asyncio.run(ma.run("sequential", "tarea base", review=False))
    # El segundo builder vio un prompt distinto (encadeno el output del primero).
    assert len(rep.final) == 2
    assert rep.final[0].text != rep.final[1].text


def test_debate_runs_two_rounds_seeing_prior():
    ma = _ma(_builders_only())
    rep = asyncio.run(ma.run("debate", "diseña la API", rounds=2, review=False))
    assert len(rep.rounds) == 2
    # El eco del prompt difiere entre rondas: la ronda 2 vio otro contexto.
    r1 = {c.agent: c.text for c in rep.rounds[0]}
    r2 = {c.agent: c.text for c in rep.rounds[1]}
    assert any(r1[name] != r2[name] for name in r1)


def test_vote_ranks_by_architect_score():
    ma = _ma(_with_architect())
    rep = asyncio.run(ma.run("vote", "implementa X"))
    # a-openai recibe 92, b-xai recibe 60 => a-openai primero.
    assert rep.ranked[0].agent == "a-openai"
    scores = {v.agent: v.score for v in rep.verdicts}
    assert scores["a-openai"] == 92 and scores["b-xai"] == 60


# --- pase de revision ------------------------------------------------------
def test_review_against_gate():
    ma = _ma(_with_architect())
    gate = parse_gate("# Gate: x\n## Entra\n- cumple esto\n## Congelado: hoy\n")
    rep = asyncio.run(ma.run("parallel", "haz X", gate=gate))
    assert len(rep.verdicts) == 2
    assert all(v.score is not None for v in rep.verdicts)


def test_review_without_architect_warns():
    ma = _ma(_builders_only())
    rep = asyncio.run(ma.run("parallel", "haz X", review=True))
    assert rep.verdicts == []
    assert any("architect" in w for w in rep.warnings)


def test_architect_excluded_from_candidates():
    ma = _ma(_with_architect())
    rep = asyncio.run(ma.run("parallel", "haz X"))
    # El arquitecto no compite como builder.
    assert "arch" not in {c.agent for c in rep.final}


def test_no_builders_warns():
    ma = _ma(Registry([Agent(name="arch", provider="anthropic", role="architect")]))
    rep = asyncio.run(ma.run("parallel", "haz X"))
    assert rep.final == []
    assert any("builders" in w for w in rep.warnings)
