# E6 — Cockpit "Agentic OS": planteamiento de diseño (2026-07-08)

Fusión del lenguaje visual tipo V.A.U.L.T. (HUD oscuro de referencia, ver `05-private-research/01-obsidia-strategy/IDEAS-Y-HERRAMIENTAS-2026-07-08.md` §1) con la identidad existente de Enjambre. **Regla de oro: se adopta la ESTRUCTURA del HUD, nunca su colorimetría ni su iconografía.** Documento de diseño; la construcción es fase E6 (después de E2).

## 1. Qué se toma del HUD de referencia (estructura)

- Layout de 3 columnas: **vitales** (izq) | **visualización central** (centro) | **command deck** (der).
- Métrica héroe única al pie del centro (número grande + label pequeño).
- Micro-etiquetas monospace en MAYÚSCULAS con tracking amplio para metadatos.
- Command deck = grid de acciones de 1 clic (aquí: skills/misiones).
- Reloj/estado de sesión persistente en esquina superior derecha.
- Densidad informativa alta con jerarquía por opacidad (no por color).

## 2. Qué NO se toma (identidad protegida)

- ✘ Verde neón / esfera de partículas verde → la viz central es **el enjambre hexagonal** (ya diseñado en el gap de mockups: viz hexagonal del swarm) con partículas moradas `--purple-main #8B5CF6` y acentos ámbar `--amber-main #FFB020`.
- ✘ Negro puro → se mantienen los fondos morados profundos del design system: `--bg-main #050509`, `--bg-panel #080D16`, `--bg-elevated #0D111C`, bordes `#211338`.
- ✘ Estética militar/terminal fría → se conserva el galaxy `SiteBackground` existente (atenuado bajo los paneles) y el glassmorphism ya aprobado.

## 3. Mapa de fusión (tokens)

| Elemento HUD referencia | En Enjambre |
|---|---|
| Verde neón de datos | `--purple-main` (series), `--amber-main` (alertas/acento) |
| Esfera de partículas | Enjambre hexagonal: agentes = hexágonos, aristas = tareas en vuelo |
| Fondo negro | `--bg-main/#050509` + galaxy tenue (opacity ≤ 0.25 bajo paneles) |
| Tipografía HUD mono | Mono existente solo para micro-labels y cifras; UI general con la sans actual |
| Scanlines/ruido | NO (ya se aprendió: masks difuminan contenido — gotcha hex-field 06-27) |
| Command deck verde | Botones estilo tecla hex en relieve (patrón del landing feat/landing-galaxy) |

## 4. Anatomía de la pantalla E6

```
┌─ VITALES ──────────┬─ ENJAMBRE (viz hex) ─────────┬─ COMMAND DECK ────────┐
│ agentes activos    │                              │ ▸ skills 1-clic       │
│ tokens/costo hoy   │      ⬡ ⬡ ⬡                  │   (catálogo ~/.claude │
│ % éxito misiones   │    ⬡ ⬡ ⬡ ⬡   (swarm vivo)   │    + skills del repo) │
│ ventana contexto   │      ⬡ ⬡ ⬡                  │ ▸ misiones worktree   │
│ sparklines mono    │                              │   (spec cli-agent-v1) │
│                    │   135 TAREAS COMPLETADAS     │ ▸ agenda/notas        │
└────────────────────┴──────── métrica héroe ───────┴───────────────────────┘
```

## 5. Plan por fases (dentro de E6)

1. **E6.1 Tokens y chasis** (1-2 días): extender `index.css` con los micro-tokens HUD (labels mono, jerarquía por opacidad); layout 3 columnas sobre AppShell existente. Sin datos nuevos.
2. **E6.2 Command deck / skills 1-clic** (2-3 días): catálogo de skills + spawn headless (arquitectura en IDEAS-Y-HERRAMIENTAS §1).
3. **E6.3 Vitales**: métricas desde transcripts de `~/.claude` (sesiones, tokens, costo).
4. **E6.4 Viz hexagonal del swarm**: cierra el gap de mockups conocido (memoria `enjambre-gap-diseno-mockups`); reutilizar graph-animation existente si aplica.
5. **E6.5 Misiones**: integración con el agente CLI (requiere E2 terminado).

## 6. Reglas de ejecución

- Herramientas de diseño obligatorias (regla del ecosistema): ui-ux-pro-max + 21st Magic para componentes nuevos; NUNCA SVG a mano.
- Todo componente nuevo entra por `diseno/` como cantera solo si se prueba aislado primero (patrón preview.html del landing).
- Accesibilidad: jerarquía por opacidad debe mantener AA sobre `--bg-panel`; verificar `--fg-faint #8a80ad` en labels mono.
