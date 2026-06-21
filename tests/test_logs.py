"""Tests del bus de logs estructurados (enjambre.logs)."""

import asyncio

from enjambre.logs import LogBus, sse_stream


def test_emit_and_recent():
    bus = LogBus()
    bus.emit("run.start", message="hola")
    bus.emit("agent.done", agent="a-openai", level="info")
    rec = bus.recent()
    assert [e.event for e in rec] == ["run.start", "agent.done"]
    assert rec[1].agent == "a-openai"


def test_recent_filter_by_agent():
    bus = LogBus()
    bus.emit("agent.done", agent="a")
    bus.emit("agent.done", agent="b")
    assert [e.agent for e in bus.recent(agent="a")] == ["a"]


def test_ring_buffer_bounded():
    bus = LogBus(capacity=3)
    for i in range(5):
        bus.emit("e", message=str(i))
    msgs = [e.message for e in bus.recent()]
    assert msgs == ["2", "3", "4"]  # solo los ultimos 3


def test_sse_stream_replays_and_stops():
    bus = LogBus()
    bus.emit("a")
    bus.emit("b")

    async def collect():
        out = []
        async for chunk in sse_stream(bus, replay=2, stop_after=2):
            out.append(chunk)
        return out

    chunks = asyncio.run(collect())
    assert len(chunks) == 2
    assert chunks[0].startswith("data: ")
    assert '"event": "a"' in chunks[0]
    assert chunks[0].endswith("\n\n")


def test_sse_stream_live_event():
    bus = LogBus()

    async def drive():
        out = []
        gen = sse_stream(bus, replay=0, stop_after=1)
        task = asyncio.ensure_future(gen.__anext__())
        await asyncio.sleep(0)        # deja que se suscriba
        bus.emit("live", message="x")  # evento en vivo
        out.append(await task)
        return out

    chunks = asyncio.run(drive())
    assert chunks[0].startswith("data: ")
    assert '"event": "live"' in chunks[0]
