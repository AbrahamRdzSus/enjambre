# Spec para v0 / Builder.io — ENJAMBRE dashboard

> Pega ESTE texto junto a la imagen del mockup en v0.dev/Builder. Sirve para que
> el componente generado salga ya alineado a nuestra paleta, fuentes y DATOS reales,
> y sea facil de integrar (Vite + React 19 + Tailwind 4 + shadcn/ui).

## Stack objetivo
- React 19 + **Vite** (NO Next.js — evita APIs solo-Next como `next/image`, server actions, `"use client"` no aplica).
- **Tailwind CSS v4** + shadcn/ui. Animacion con `motion` (framer-motion). Iconos: lucide-react. Charts: recharts.
- Datos de ejemplo en el componente, pero usando los NOMBRES DE CAMPO de abajo (asi el cableado real es directo).

## Design tokens (paleta cyber/glassmorphism, oscuro)
- Fondo: `#0c0a14` (app), `#141020` (raised), `#1a1530` (card), borde `#2a2342`.
- Acentos: morado `#8B5CF6` (soft `#a684f8`), ambar `#FFB020` (soft `#ffc54d`).
- Texto: `#f3f0fa` (fg), `#a99fc7` (mute), `#6f6690` (faint).
- Estado: ok `#22c55e`, warn `#f59e0b`, error `#ef4444`.
- Fuentes: DM Sans (titulos/wordmark), Inter (cuerpo), JetBrains Mono (datos/numeros, tabular-nums).
- Efectos: glassmorphism (blur 12px + bg translucido), gradient-border morado->ambar, glow sutil, grid tech de fondo. Radios 8/12/16.

## Layout (fiel al mockup cockpit)
- **Sidebar** izquierda: logo hex + wordmark ENJAMBRE; selector de proyecto; arbol de archivos; lista de agentes con dot de estado; API keys; footer "local-first · BYOK" + estado sidecar.
- **Header**: nombre del proyecto; metricas tokens / costo / % exito (mono, tabular); boton ambar grande "Lanzar Enjambre".
- **Centro**: visualizacion hexagonal — nucleo brillante + agentes orbitando en hexagono, conexiones con glow, estado "pensando".
- **Panel derecho**: salidas/chat por agente (cards apilables).
- **Franja inferior**: actividad en tiempo real + barras de uso de tokens por proveedor.

## Datos reales (campos del API — usalos como shape de los placeholders)
- **Agent**: `{ name, provider ('openai'|'anthropic'|'google'|'xai'), model, role ('builder'|'architect'), enabled }`.
- **Provider key status**: `{ provider, env, key_present: bool }`.
- **Stats**: `{ sessions, total_tokens, total_cost_usd, by_provider: { [prov]: { runs, ok, errors, input_tokens, output_tokens, cost_usd } }, by_day: { [fecha]: costo } }`.
- **Run report**: `{ prompt, mode, total_cost_usd, runs: [ { agent, provider, model, result: { text, cost_usd, latency_ms, error|null, usage:{input_tokens,output_tokens} } } ], warnings: [] }`.
- **LogEvent** (SSE): `{ ts, level ('info'|'warn'|'error'), event ('run.start'|'agent.done'|'run.done'|...), message, agent|null }`.

## Reglas
- Sin emojis como iconos (usa lucide). Respeta `prefers-reduced-motion`. Una sola CTA primaria por pantalla. Contraste AA.
- Mantener identidad propia morado/ambar; NO usar logos de terceros (OpenAI/Anthropic/etc.) como marca.

## Entrega
Copia el codigo generado y pegalo en el chat con Claude, o guardalo en `frontend/v0/Cockpit.tsx`.
Claude lo porta a Vite/Tailwind4, cambia los datos falsos por los hooks reales
(useAgents/useStats/useRun/useLogs) y lo integra.
