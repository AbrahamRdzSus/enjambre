# Roadmap de levantamiento — ENJAMBRE

> De "app funcional con dashboard" a "producto distribuible y, opcionalmente, vendible".
> Estado base: backend completo (218 tests), dashboard React con identidad morado/ambar,
> app de escritorio Tauri, todo en GitHub (AbrahamRdzSus/enjambre). Ya mergeados:
> seguridad sidecar default-on, agente CLI, F1 OPS HUD y panel "Actividad por modelo".
>
> **E5 (empaque/release) CERRADO**: instalador **v0.6.0 publicado y firmado**, con
> auto-update vivo (`releases/latest/download/latest.json` responde 200).
>
> **Frente abierto: v0.6.1** — pase de robustez + seguridad + pulido visual, salido de una
> auditoria completa del programa. Lo que destapo (y no era el panel): el cockpit reportaba
> **0 tokens** fuera del modo `parallel`; `/run` fallaba **en silencio**; el webview salio
> **sin CSP** en un producto que renderiza salida de modelos; y el token del sidecar no
> llegaba de forma fiable (carrera + un F5 lo borraba). Ver HANDOFF.md.

## Fase A — Diseño final (HECHA)
- [x] 6 pantallas con look glass + viz hexagonal + stat cards/charts + modos + entidad proyecto + estado live.
- [x] Pulido: fondo texturizado, gauge, sparklines, efectos Magic UI (BorderBeam, Particles).
- [~] **Integrar el cockpit v0** (`diseno/frontend-v0-Cockpit.zip`): EN CURSO.
  - [x] Slice Overview: tokens shadcn mapeados a la identidad via `@theme inline` +
    utilidades (`glass-strong`/`glow-*`/`scrollbar-thin`); portados MetricsRow,
    Conversations (sesiones reales), FilePanel (workspace del proyecto activo) y
    BottomRow (tokens/actividad/rendimiento) cableados a hooks reales; HexSwarm como
    orquestacion live. Sin mock (empty-states honestos). build+lint+react-doctor verdes.
    Gate: `docs/gates/faseA-cockpit-overview.md`.
  - [x] panel "Actividad por modelo" (dock inferior estilo Jules) en la pestaña Lanzar,
    flag `VITE_ACTIVITY_DOCK` (carriles por agente + step badges + comparativa).
  - [ ] sidebar/topbar del cockpit (chrome) si se quiere acercar mas al mockup.
- [x] **Replicar el lenguaje del cockpit en las demas pestañas**: chrome `Panel`/`PageHeader`
  reutilizable (`components/ui/Panel.tsx`, header mono-uppercase tracked + borde) aplicado a
  Lanzar/Logs/Proyectos/Estadisticas/Agentes; tokens semanticos y empty-states consistentes con
  Overview. build+lint verdes, react-doctor 0 errores (28->26 issues, sin regresiones).

## Fase B — Instalador desktop (doble-click)
- [x] **PyInstaller**: sidecar congelado (`sidecar_entry.py` -> `enjambre.serve`) -> `enjambre-sidecar.exe` (26MB), verificado.
- [x] **externalBin**: `tauri/tauri.conf.json` `bundle.externalBin: binaries/enjambre-sidecar`.
- [x] **Spawn automatico**: `tauri/src/lib.rs` arranca el sidecar (SIDECAR_PORT=8000) en setup y lo mata en ExitRequested (tauri-plugin-shell).
- [x] **`cargo tauri build`** full -> **instalador NSIS `ENJAMBRE_0.5.0_x64-setup.exe` (28.9MB)** en `tauri/target/release/bundle/nsis/`.
- [x] **Directorio de datos de usuario:** `enjambre.paths.data_dir()` -> `%APPDATA%/enjambre` (override `ENJAMBRE_DATA_DIR`). registry/sessions/projects/stats persisten ahi (escribible). Registry.load() sin archivo -> 4 agentes por defecto. Instalador rehorneado con el sidecar corregido.
- [ ] (Opcional) **Firma de codigo** Windows Authenticode (~$200/año) para evitar SmartScreen.
- FASE B COMPLETA: `ENJAMBRE_0.5.0_x64-setup.exe` instalable, sidecar auto, datos persistentes.

## Fase C — Landing + web deploy
- [x] **Landing** publica en `landing/` (React/Vite + Tailwind4 + Magic UI: Particles +
  BorderBeam, look cyber). Reusa la identidad (`diseno/assets/enjambre`) y logos. Secciones:
  Hero (HexCore + CTA descarga), Features (BYOK/local-first/no-training/multi-proveedor/gate
  humano), HowItWorks, Download, Footer. build verde (`npm run build`).
- [x] **Deploy a Vercel**: LIVE en https://enjambre.obsidia.mx (A enjambre -> 76.76.21.21
  DNS-only en Cloudflare; cert SSL via `vercel certs issue`). Proyecto Vercel "landing".
- NOTA: el **dashboard NO se hostea** (es local-first, necesita el sidecar local) -> se distribuye como instalador. Solo la landing va a web.

## Fase D — Release / distribucion
- [x] **GitHub Release** `v0.5.0` con el instalador `ENJAMBRE_0.5.0_x64-setup.exe` adjunto +
  `CHANGELOG.md`. Release normal (latest) para que la landing linkee `/releases/latest/download`.
- [x] **Pagina de descarga** en la landing apuntando al release (`landing/src/links.ts`).
- [~] **Auto-update**: `tauri-plugin-updater` + `tauri-plugin-process` cableados (Cargo,
  lib.rs, tauri.conf.json `createUpdaterArtifacts`+`plugins.updater`, capabilities) +
  frontend `src/lib/updater.ts` (no-op fuera de Tauri) y `UpdateBanner` en AppShell.
  Endpoint = `releases/latest/download/latest.json`. PENDIENTE operativo (no codigo):
  generar par de claves de firma, poner la pubkey en la config, y publicar `latest.json`+`.sig`
  en cada release. Runbook en `docs/AUTO_UPDATE.md`.

## Fase E — Pre-venta / negocio (si aplica)
- [x] BYOK + local-first + no-training (diferenciador de privacidad ya implementado).
- [ ] Pricing/planes (precedente: licencia HMAC de Eye si se quiere gating).
- [ ] Legal: ToS + Privacy + EULA (PROVIDER_POLICY/LEGAL_RISK_REVIEW ya existen).
- [ ] Beta con usuarios reales.

## Transversal (ya OK)
- CI: pytest (matriz 3.10-3.12) + ruff + job `audit` (pip-audit + npm audit) verdes.
  Frontend: build+lint+react-doctor 0 errores.
- Seguridad sidecar DEFAULT-ON: token autogenerado, guard anti DNS-rebinding, rate limit.
- Agente CLI (worktree + approve) y F1 OPS HUD (proxy al hub de CD) mergeados.
- Gortex indexa el repo (grafo). Memoria de sesion en .claude.

## Orden sugerido
A (terminar diseño) -> B (instalador, el mayor valor: app distribuible) -> C+D (landing+release publico) -> E (negocio).
