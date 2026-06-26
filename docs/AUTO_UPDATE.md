# Auto-update — ENJAMBRE desktop (Fase D)

La app de escritorio (Tauri) se actualiza sola via `tauri-plugin-updater`. Al abrir,
el dashboard consulta un manifiesto `latest.json` publicado en el GitHub Release; si
hay una version mas nueva y FIRMADA, muestra el aviso "Nueva version X · Actualizar"
(abajo a la derecha), descarga, instala y reinicia.

Piezas (ya cableadas):
- `tauri/Cargo.toml`: `tauri-plugin-updater` + `tauri-plugin-process`.
- `tauri/src/lib.rs`: ambos plugins registrados.
- `tauri/tauri.conf.json`: `bundle.createUpdaterArtifacts: true` + `plugins.updater`
  (endpoint al release `latest`, `pubkey`, installMode `passive`).
- `tauri/capabilities/default.json`: permisos `updater:default` + `process:default`.
- Frontend: `src/lib/updater.ts` (no-op fuera de Tauri) + `src/components/UpdateBanner.tsx`
  montado en `AppShell`.

## Paso 1 — Generar el par de claves de firma (una sola vez)

```
cd tauri
cargo tauri signer generate -w %USERPROFILE%\.tauri\enjambre.key
```

Esto imprime una CLAVE PUBLICA y guarda la PRIVADA en `~/.tauri/enjambre.key`
(protegida por la contrasena que elijas).

- Pega la clave PUBLICA en `tauri/tauri.conf.json` -> `plugins.updater.pubkey`
  (reemplaza el placeholder `REEMPLAZAR_CON_LA_CLAVE_PUBLICA_...`).
- La clave PRIVADA y su contrasena NUNCA se commitean. Guardalas en el gestor de
  secretos del ecosistema (ver `04-compartido/keystores`). Si se pierden, no se
  podran firmar updates que las instalaciones existentes acepten.

## Paso 2 — Build firmado del instalador

Exporta la privada + su contrasena y corre el build normal:

```
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $env:USERPROFILE\.tauri\enjambre.key -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<tu-contrasena>"
cd tauri
cargo tauri build
```

Con `createUpdaterArtifacts: true` genera, ademas del instalador NSIS:
- `ENJAMBRE_<version>_x64-setup.exe`
- `ENJAMBRE_<version>_x64-setup.exe.sig`  (firma)

(en `tauri/target/release/bundle/nsis/`). Acuerdate de re-congelar el sidecar
PyInstaller antes si cambio el backend; ver `docs/ROADMAP_LEVANTAMIENTO.md` Fase B.

## Paso 3 — `latest.json` y GitHub Release

Crea el manifiesto `latest.json` que el updater consulta:

```json
{
  "version": "0.6.0",
  "notes": "Resumen de cambios visible al usuario.",
  "pub_date": "2026-06-25T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "<contenido del .sig>",
      "url": "https://github.com/AbrahamRdzSus/enjambre/releases/download/v0.6.0/ENJAMBRE_0.6.0_x64-setup.exe"
    }
  }
}
```

- `signature` = el contenido completo del archivo `.sig` generado en el paso 2.
- `version` SIN la `v` (la `v` solo va en el tag/nombre del release).

Publica el Release en GitHub (tag `v0.6.0`, marcado como `latest`) y adjunta:
`ENJAMBRE_0.6.0_x64-setup.exe`, su `.sig`, y `latest.json`. El endpoint configurado
(`.../releases/latest/download/latest.json`) siempre apunta al ultimo release, asi que
no hay que tocar la config en cada version.

## Notas

- El chequeo solo corre dentro del shell Tauri; en el dashboard de navegador
  (Vite dev / sidecar) `checkForUpdate()` devuelve `null` y el aviso no aparece.
- Si el `.sig` no coincide con la `pubkey`, el cliente rechaza el update (seguridad).
- Firma de codigo Authenticode (SmartScreen) es independiente y opcional; el
  auto-update funciona sin ella.
