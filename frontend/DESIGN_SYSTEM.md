# Design System — ENJAMBRE dashboard

> Derivado de los mockups (`diseno/Dasboard de proyecto*.png`) + `diseno/ENJAMBRE_IA_Coder_UI_README.md`.
> Estilo: **cyberpunk / glassmorphism**, oscuro, morado + ámbar. Sin marcas de terceros.

## Tokens (ya en `src/index.css`)
- Superficies: `--bg-app #0c0a14`, `--bg-raised #141020`, `--bg-card #1a1530`, `--border #2a2342`.
- Acentos: morado `--purple #8b5cf6` (soft `#a684f8`, deep `#6d3df0`), ámbar `--amber #ffb020` (soft `#ffc54d`).
- Texto: `--fg #f3f0fa`, `--fg-mute #a99fc7`, `--fg-faint #6f6690`.
- Estado: ok `#22c55e`, warn `#f59e0b`, alert `#ef4444`.
- Fonts: display DM Sans, body Inter, mono JetBrains Mono.

## Efectos a aplicar (gap vs mockups)
- **Glassmorphism**: cards con `background: color-mix(in srgb, var(--bg-card) 70%, transparent)` + `backdrop-filter: blur(12px)` + borde `1px` con gradiente morado->ámbar sutil.
- **Glow**: halos radiales morado/ámbar detrás del core y en hover (box-shadow / SVG feGaussianBlur).
- **Gradient borders**: borde con `linear-gradient(135deg, var(--purple), var(--amber))` enmascarado.
- **Animación**: `motion` (framer-motion) — float/pulse del core, pulsos viajando por las líneas, entradas con stagger, contadores animados (number-ticker / magic ui).

## Pieza estrella: HexSwarm (viz del enjambre)
- **Core** central: hexágono/círculo con doble halo radial (morado interno, ámbar externo), pulso lento (scale 1->1.06).
- **Agentes** orbitando: N nodos distribuidos en círculo alrededor del core (hexágono = 6 posiciones canónicas; más de 6 -> reparten en el anillo). Cada nodo = hex pequeño con color por **rol** (architect=ámbar, builder=morado) y label.
- **Estados** del nodo: `idle` (tenue), `enabled` (color pleno), `thinking/running` (pulso + glow), `error` (alert).
- **Líneas** core<->agente: gradiente morado, con un pulso que viaja del core al nodo cuando esta "running".
- **Movimiento**: rotación lenta del anillo + float; respeta `prefers-reduced-motion`.
- Data: consume `useAgents()` (real). Estado `running` vendra del run en vivo (futuro: /logs o estado de agente).

## Componentes a construir (orden)
1. **HexSwarm** (esta) — Overview hero + cockpit.
2. Shell: splash animado, header rico (proyecto + boton ambar + tokens/costo/salud), sidebar con logo real.
3. Stat cards (Tremor) + feed + chips de agente + anillo de progreso.
