"""Tests del loop agentico (enjambre.agent_loop): auto-read, pausa y reanudacion."""

import asyncio
import json

import httpx

from enjambre.agent_loop import ToolLoop
from enjambre.registry import Agent, Registry


def _run(coro):
    return asyncio.run(coro)


def _registry() -> Registry:
    # groq = OpenAICompatProvider (tool calling estilo OpenAI).
    return Registry(agents=[Agent("g", "groq", "llama-3.3-70b-versatile")])


def _seq_client(responses: list[dict]) -> httpx.AsyncClient:
    """Transporte que devuelve `responses` en orden, uno por cada POST de chat."""
    calls = {"i": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        i = calls["i"]
        calls["i"] = i + 1
        body = responses[min(i, len(responses) - 1)]
        return httpx.Response(200, json=body)

    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


def _tool_call_msg(call_id: str, name: str, arguments: dict) -> dict:
    return {
        "choices": [{
            "message": {"content": None, "tool_calls": [{
                "id": call_id, "type": "function",
                "function": {"name": name, "arguments": json.dumps(arguments)},
            }]},
            "finish_reason": "tool_calls",
        }],
        "usage": {"prompt_tokens": 5, "completion_tokens": 3},
    }


def _text_msg(text: str) -> dict:
    return {
        "choices": [{"message": {"content": text}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 4, "completion_tokens": 2},
    }


def test_auto_read_completes_without_human(tmp_path):
    (tmp_path / "main.py").write_text("print('hola')\n", encoding="utf-8")
    responses = [
        _tool_call_msg("c1", "read_file", {"path": "main.py"}),
        _text_msg("el archivo imprime hola"),
    ]

    async def go():
        async with _seq_client(responses) as client:
            loop = ToolLoop(_registry(), tmp_path, keys={"groq": "ok"}, client=client)
            return await loop.start("g", "que hace main.py?")

    state = _run(go())
    assert state.status == "done"
    assert state.text == "el archivo imprime hola"
    assert state.pending == []
    # se agregaron los usage de las dos llamadas
    assert state.usage.input_tokens == 9
    # el turno tool con el contenido del archivo quedo en el historial
    tool_turns = [m for m in state.messages if m.role == "tool"]
    assert len(tool_turns) == 1
    assert "hola" in tool_turns[0].content


def test_write_pauses_then_resume_applies(tmp_path):
    responses = [
        _tool_call_msg("c1", "write_file", {"path": "nuevo.py", "content": "x = 1\n"}),
        _text_msg("listo, cree el archivo"),
    ]

    async def go():
        async with _seq_client(responses) as client:
            loop = ToolLoop(_registry(), tmp_path, keys={"groq": "ok"}, client=client)
            state = await loop.start("g", "crea nuevo.py con x = 1")
            assert state.status == "awaiting_approval"
            assert len(state.pending) == 1
            pc = state.pending[0]
            assert pc.name == "write_file" and pc.danger == "write"
            assert "+x = 1" in pc.preview
            assert not (tmp_path / "nuevo.py").exists()  # aun NO escribio
            agent = loop._agent("g")
            return await loop.resume(state, agent, {pc.id: True})

    state = _run(go())
    assert state.status == "done"
    assert state.text == "listo, cree el archivo"
    assert (tmp_path / "nuevo.py").read_text(encoding="utf-8") == "x = 1\n"


def test_write_rejected_not_applied(tmp_path):
    responses = [
        _tool_call_msg("c1", "write_file", {"path": "nuevo.py", "content": "x = 1\n"}),
        _text_msg("ok, no lo hice"),
    ]

    async def go():
        async with _seq_client(responses) as client:
            loop = ToolLoop(_registry(), tmp_path, keys={"groq": "ok"}, client=client)
            state = await loop.start("g", "crea nuevo.py")
            pc = state.pending[0]
            return await loop.resume(state, loop._agent("g"), {pc.id: False})

    state = _run(go())
    assert state.status == "done"
    assert not (tmp_path / "nuevo.py").exists()
    # el modelo recibio el rechazo como tool_result
    tool_turns = [m for m in state.messages if m.role == "tool"]
    assert "rechazo" in tool_turns[0].content


def test_unknown_agent_errors(tmp_path):
    async def go():
        loop = ToolLoop(_registry(), tmp_path, keys={"groq": "ok"})
        return await loop.start("noexiste", "hola")

    state = _run(go())
    assert state.status == "error"
    assert "noexiste" in state.error


def test_max_iters_backstop(tmp_path):
    (tmp_path / "main.py").write_text("x\n", encoding="utf-8")
    # siempre devuelve un read_file -> nunca termina solo; el backstop corta.
    loop_resp = _tool_call_msg("c1", "read_file", {"path": "main.py"})

    async def go():
        async with _seq_client([loop_resp]) as client:
            loop = ToolLoop(_registry(), tmp_path, keys={"groq": "ok"},
                            client=client, max_iters=3)
            return await loop.start("g", "lee para siempre")

    state = _run(go())
    assert state.status == "done"
    assert state.iters == 3
    assert "limite de iteraciones" in state.text
