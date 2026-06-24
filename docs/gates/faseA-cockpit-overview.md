# Gate — Fase A: cockpit v0 en Overview

CONGELADO. No editar para que el trabajo pase a posteriori.

## Que entra
- Adoptar la composicion densa "cockpit v0" en LA PANTALLA OVERVIEW del frontend
  React/Vite (`frontend/`), cableada a hooks reales del sidecar. Sin mock.
- Tokens semanticos (estilo shadcn) mapeados a la identidad ENJAMBRE via `@theme
  inline` + utilidades (`glass-strong`, `glow-*`, `scrollbar-thin`) en `index.css`.
- Componentes nuevos en `components/overview/`: MetricsRow, Conversations (sesiones
  recientes), FilePanel (workspace del proyecto activo), BottomRow (tokens por
  proveedor / actividad / rendimiento por agente).
- HexSwarm se reusa como "Orquestacion del enjambre" (viz live), no el componente
  estatico del mockup.

## Que NO entra
- Las otras 5 pestañas (Lanzar/Logs/Proyectos/Stats/Agentes): slice posterior.
- Paneles sin fuente real rellenos con mock. Sin datos -> empty-state honesto.
  Concretamente se OMITE el panel "deployments" y el chat con hilos en vivo del
  mockup (no hay backend); el composer enruta a /run.
- Cambios en backend/sidecar.

## Como se verifica
- `cd frontend && npm run build` (tsc -b + vite) en verde.
- `npm run lint` (eslint) y `npm run doctor` (react-doctor) en 0 errores.
- `npm run dev` con el sidecar en :8000: Overview muestra metrics-row (6), hex live,
  sesiones reales, arbol del proyecto activo y bottom-row con datos de stats/logs.
  Los empty-states aparecen cuando no hay datos (sin agentes / sin proyecto / sin
  sesiones). Ningun numero inventado.
- Cotejo visual contra `diseno/Dasboard de proyecto*.png`.
