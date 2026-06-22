# Roadmap de levantamiento — ENJAMBRE

> De "app funcional con dashboard" a "producto distribuible y, opcionalmente, vendible".
> Estado base: backend completo (167 tests), dashboard React con identidad morado/ambar,
> app de escritorio Tauri que compila a .exe, todo en GitHub (AbrahamRdzSus/enjambre).

## Fase A — Diseño final (EN CURSO)
- [x] 6 pantallas con look glass + viz hexagonal + stat cards/charts + modos + entidad proyecto + estado live.
- [x] Pulido: fondo texturizado, gauge, sparklines, efectos Magic UI (BorderBeam, Particles).
- [ ] **Integrar el cockpit v0** (`diseno/frontend-v0-Cockpit.zip`): adoptar sus tokens shadcn + portar componentes (sidebar/topbar/metrics-row/orchestration/conversations/file-panel/bottom-row) a Vite/Tailwind4, cablear a hooks reales (useAgents/useStats/useRun/useLogs).
- [ ] **Replicar el lenguaje del cockpit en las demas pestañas** (Lanzar/Logs/Proyectos/Estadisticas/Agentes).

## Fase B — Instalador desktop (doble-click)
- [x] **PyInstaller**: sidecar congelado (`sidecar_entry.py` -> `enjambre.serve`) -> `enjambre-sidecar.exe` (26MB), verificado.
- [x] **externalBin**: `tauri/tauri.conf.json` `bundle.externalBin: binaries/enjambre-sidecar`.
- [x] **Spawn automatico**: `tauri/src/lib.rs` arranca el sidecar (SIDECAR_PORT=8000) en setup y lo mata en ExitRequested (tauri-plugin-shell).
- [x] **`cargo tauri build`** full -> **instalador NSIS `ENJAMBRE_0.5.0_x64-setup.exe` (28.9MB)** en `tauri/target/release/bundle/nsis/`.
- [ ] **PENDIENTE — directorio de datos de usuario:** el sidecar congelado usa cwd para `agents/registered.json` y `.enjambre/`. Instalado en Program Files (read-only) NO podra escribir -> agentes/keys/sesiones no persisten. FIX: mover esos paths a `%APPDATA%/enjambre` (platformdirs) en config/registry/sessions. **Hacer antes de distribuir.**
- [ ] (Opcional) **Firma de codigo** Windows Authenticode (~$200/año) para evitar SmartScreen.

## Fase C — Landing + web deploy
- [ ] **Landing** publica de ENJAMBRE (assets en `diseno/assets/enjambre`, "logos y landings"). Stack: React/Vite + Magic UI/Aceternity (look cyber). 
- [ ] **Deploy a Vercel** (la landing es estatica -> facil).
- NOTA: el **dashboard NO se hostea** (es local-first, necesita el sidecar local) -> se distribuye como instalador. Solo la landing va a web.

## Fase D — Release / distribucion
- [ ] **GitHub Release** con el instalador adjunto + changelog.
- [ ] **Auto-update**: `tauri-plugin-updater` (Eye ya lo usa) + endpoint de releases.
- [ ] **Pagina de descarga** en la landing apuntando al release.

## Fase E — Pre-venta / negocio (si aplica)
- [x] BYOK + local-first + no-training (diferenciador de privacidad ya implementado).
- [ ] Pricing/planes (precedente: licencia HMAC de Eye si se quiere gating).
- [ ] Legal: ToS + Privacy + EULA (PROVIDER_POLICY/LEGAL_RISK_REVIEW ya existen).
- [ ] Beta con usuarios reales.

## Transversal (ya OK)
- CI: pytest (matriz 3.10-3.12) + ruff verdes. Frontend: build+lint+react-doctor 0 errores.
- Gortex indexa el repo (grafo). Memoria de sesion en .claude.

## Orden sugerido
A (terminar diseño) -> B (instalador, el mayor valor: app distribuible) -> C+D (landing+release publico) -> E (negocio).
