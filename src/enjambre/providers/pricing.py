"""Tablas de precios de los proveedores. Fuente unica y FECHADA.

Estos numeros son ESTIMACIONES para dar una idea del costo, no facturacion real:
los proveedores cambian precios sin aviso, y aqui no hay ningun mecanismo que lo
detecte. Antes vivian dispersos en cada adapter y habian derivado a ritmos
distintos (Anthropic con modelos de 2025, OpenAI aun en gpt-4o, Google en
gemini-1.5), sin ninguna fecha que permitiera saber cuan viejos eran.

Unidad: (USD por 1M tokens de entrada, USD por 1M tokens de salida).

Al tocar cualquier tabla, ACTUALIZA `PRICING_AS_OF`. El sidecar publica esa fecha
en /providers para que la UI pueda decir de cuando son los datos.

Pendiente conocido (HANDOFF): consumir el JSON de precios de litellm en vez de
mantener esto a mano.
"""

from __future__ import annotations

# Fecha de la ultima revision manual de las tablas de abajo (YYYY-MM-DD).
PRICING_AS_OF = "2026-07-12"

Pricing = dict[str, tuple[float, float]]

ANTHROPIC: Pricing = {
    "claude-opus-4-8": (15.0, 75.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-haiku-4-5-20251001": (1.0, 5.0),
}

OPENAI: Pricing = {
    "gpt-4o": (2.5, 10.0),
    "gpt-4o-mini": (0.15, 0.6),
}

GOOGLE: Pricing = {
    "gemini-1.5-pro": (1.25, 5.0),
    "gemini-1.5-flash": (0.075, 0.3),
}

XAI: Pricing = {
    "grok-2-latest": (2.0, 10.0),
    "grok-beta": (5.0, 15.0),
}

# Proveedores con tier gratuito: no se estima costo (queda en 0.0).
FREE: Pricing = {}
