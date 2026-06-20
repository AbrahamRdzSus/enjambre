"""Bus de eventos de log estructurados (para la tab "Logs en Vivo" del dashboard).

Eventos estructurados (no texto plano) para que el frontend filtre por agente y
nivel (ver diseno/ENJAMBRE_Dashboard_Design.md). El bus mantiene un ring buffer
acotado (memoria estable en un sidecar de larga vida) y permite suscribirse para
streaming SSE. Sin dependencias nuevas: solo stdlib.

Patron elegido tras investigar (SSE vs WebSocket): los logs son unidireccionales
server->cliente, asi que se sirven por SSE (HTTP plano, EventSource nativo); no
hace falta WebSocket ni sse-starlette.
"""

from __future__ import annotations

import asyncio
import json
import time
from collections import deque
from collections.abc import AsyncIterator
from dataclasses import asdict, dataclass, field

Level = str  # "info" | "warn" | "error"


@dataclass
class LogEvent:
    ts: float
    level: Level
    event: str               # p.ej. "run.start", "agent.done", "run.done"
    message: str = ""
    agent: str | None = None  # para filtrar por agente en el dashboard
    fields: dict = field(default_factory=dict)


class LogBus:
    """Ring buffer de eventos + fan-out a suscriptores (SSE)."""

    def __init__(self, capacity: int = 500) -> None:
        self._buf: deque[LogEvent] = deque(maxlen=capacity)
        self._subs: set[asyncio.Queue[LogEvent]] = set()

    def emit(self, event: str, *, level: Level = "info", message: str = "",
             agent: str | None = None, **fields: object) -> LogEvent:
        ev = LogEvent(ts=time.time(), level=level, event=event, message=message,
                      agent=agent, fields=dict(fields))
        self.publish(ev)
        return ev

    def publish(self, ev: LogEvent) -> None:
        self._buf.append(ev)
        for q in list(self._subs):
            try:
                q.put_nowait(ev)
            except asyncio.QueueFull:  # suscriptor lento: se descarta el evento
                pass

    def recent(self, limit: int = 100, *, agent: str | None = None) -> list[LogEvent]:
        items = [e for e in self._buf if agent is None or e.agent == agent]
        return items[-limit:]

    def subscribe(self) -> asyncio.Queue[LogEvent]:
        q: asyncio.Queue[LogEvent] = asyncio.Queue(maxsize=1000)
        self._subs.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[LogEvent]) -> None:
        self._subs.discard(q)


def _sse(ev: LogEvent) -> str:
    """Serializa un evento al formato SSE (campos event/data)."""
    return f"event: {ev.event}\ndata: {json.dumps(asdict(ev), ensure_ascii=False)}\n\n"


async def sse_stream(bus: LogBus, *, replay: int = 0,
                     stop_after: int | None = None) -> AsyncIterator[str]:
    """Generador SSE: opcionalmente reemite los ultimos `replay` y luego sigue en vivo.

    `stop_after` (solo para tests) corta tras N eventos; None = infinito (uso real).
    """
    sent = 0
    for ev in bus.recent(replay) if replay else []:
        yield _sse(ev)
        sent += 1
        if stop_after is not None and sent >= stop_after:
            return
    q = bus.subscribe()
    try:
        while True:
            ev = await q.get()
            yield _sse(ev)
            sent += 1
            if stop_after is not None and sent >= stop_after:
                return
    finally:
        bus.unsubscribe(q)
