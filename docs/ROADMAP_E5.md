# E5 — Empaque y release (plan accionable)

> Fase que requiere **Rust + MSVC** (no disponible en el entorno donde se cerraron
> E1-E4). Este doc deja los pasos turnkey para ejecutarla en la maquina con toolchain.
> Estado base: `main` ya tiene el agente CLI (E1) y el endurecimiento del sidecar
> (E4: host-guard, token default-on, rate limit, audit CI). Falta empacar eso.

## 0. Precondiciones (verificar antes de empezar)

```powershell
rustc --version          # Rust estable
cargo --version
cargo tauri --version    # tauri-cli 2.x ; si no: cargo install tauri-cli --version "^2"
python --version         # 3.10+  (para congelar el sidecar)
node --version           # 20+
# MSVC Build Tools instalados (link.exe en PATH). VS Build Tools "Desktop C++".
```

## Orden e interdependencias

```
E5.1 (token Tauri)  --->  BLOQUEA cualquier build empacado utilizable
       |                  (sin esto el sidecar exige token y el dashboard da 401)
       v
E5.2 (re-congelar sidecar con backend nuevo)
       v
E5.3 (S5: par de claves + pubkey)  --->  E5.4 (build firmado + installer)
       v
E5.5 (verificacion end-to-end del paquete)  --->  E5.6 (Release + latest.json)
```

---

## E5.1 — Cablear el token del sidecar al webview (cierra S1 en Tauri)  [HARD BLOCKER]

**Por que:** el sidecar es DEFAULT-ON de token en produccion (imprime
`ENJAMBRE_API_TOKEN=<tok>` en stdout al arrancar; ver `src/enjambre/api.py::_load_or_create_token`
y `serve.py::main`). La app empacada debe pasarle ese token al dashboard o todo salvo
`/health` responde 401. Contrato ya documentado en `SECURITY.md`. El cliente ya lee
`window.__ENJAMBRE_TOKEN__` (`frontend/src/api/client.ts`); `tauri/src/lib.rs` ya drena
el stdout del sidecar en un `rx.recv()`. Falta: parsear la linea e inyectarla.

**Paso A — frontend: leer el token de forma perezosa (no cachearlo al cargar el modulo).**
Evita la carrera "el bundle leyo el token antes de que Rust lo inyecte". En
`frontend/src/api/client.ts`, cambiar el `const TOKEN = ...` cacheado por una funcion:

```ts
function apiToken(): string {
  return import.meta.env.VITE_API_TOKEN
    || (typeof window !== 'undefined'
        ? (window as unknown as { __ENJAMBRE_TOKEN__?: string }).__ENJAMBRE_TOKEN__ ?? ''
        : '');
}
// en req(): const t = apiToken(); if (t) headers['X-API-Token'] = t;
```

**Paso B — Rust (`tauri/src/lib.rs`): parsear el stdout e inyectar.** En el `setup`,
dentro del loop que ya drena `rx`, capturar la linea del token y hacer `eval` en la
ventana `main`. Reemplazar el bloque `tauri::async_runtime::spawn(...)` por:

```rust
let handle = app.handle().clone();
tauri::async_runtime::spawn(async move {
    use tauri_plugin_shell::process::CommandEvent;
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let text = String::from_utf8_lossy(&line);
                if let Some(tok) = text.trim().strip_prefix("ENJAMBRE_API_TOKEN=") {
                    if let Some(win) = handle.get_webview_window("main") {
                        // inyecta antes de la primera llamada del cliente (lectura perezosa)
                        let _ = win.eval(&format!("window.__ENJAMBRE_TOKEN__={:?};", tok));
                    }
                }
            }
            CommandEvent::Terminated(_) => break,
            _ => {}
        }
    }
});
```

Nota: `get_webview_window("main")` — confirmar el `label` de la ventana en
`tauri.conf.json` (`app.windows[].label`, por defecto `main`). Si el webview aun no
existe cuando llega la linea, reintentar en `on_page_load` o guardar el token en un
`State` y hacer eval al primer `PageLoad`.

**Paso C — habilitar el agente CLI en el paquete (decision).** El sidecar empacado se
lanza en `lib.rs` con `.env("SIDECAR_PORT","8000")`. Para exponer `/cli/*` en la app,
anadir `.env("ENJAMBRE_CLI_AGENTS","1")`, y compilar el frontend con `VITE_CLI_AGENTS=1`
(ver E5.4). Requiere el binario `claude` en el PATH del usuario final (documentarlo).
Si NO se quiere CLI en el paquete v1, omitir ambos y queda solo el tipo "API".

**Verificar (tras E5.2/E5.4):** abrir la app empacada -> el dashboard carga agentes
(no 401), `/cli` visible si se activo el flag.

---

## E5.2 — Re-congelar el sidecar con el backend nuevo

El binario congelado en `tauri/binaries/` es viejo (no trae host-guard, token, rate
limit ni el agente CLI). Recongelar:

```powershell
cd <repo>
pip install -e ".[api]" pyinstaller
pyinstaller enjambre-sidecar.spec        # genera dist/enjambre-sidecar.exe
```

Copiar/renombrar al nombre con target-triple que Tauri espera para `externalBin`
(`tauri.conf.json > bundle.externalBin: ["binaries/enjambre-sidecar"]`):

```powershell
$triple = (rustc -Vv | Select-String 'host:').ToString().Split()[-1]  # x86_64-pc-windows-msvc
Copy-Item dist\enjambre-sidecar.exe "tauri\binaries\enjambre-sidecar-$triple.exe" -Force
```

**Verificar:** correr el `.exe` congelado suelto -> debe imprimir
`ENJAMBRE_API_TOKEN=...` y servir en `127.0.0.1:8000` (`curl 127.0.0.1:8000/health`).

---

## E5.3 — S5: par de claves de firma de updates (una sola vez)

Seguir `docs/AUTO_UPDATE.md` Paso 1:

```powershell
cd tauri
cargo tauri signer generate -w $env:USERPROFILE\.tauri\enjambre.key
```

- Pegar la CLAVE PUBLICA en `tauri/tauri.conf.json > plugins.updater.pubkey`
  (reemplaza el placeholder `REEMPLAZAR_CON_LA_CLAVE_PUBLICA_...`).
- La PRIVADA + contrasena NUNCA se commitean -> guardarlas en
  `04-compartido/keystores` (gestor de secretos del ecosistema). Si se pierden, las
  instalaciones existentes no aceptaran updates futuros.

---

## E5.4 — Build firmado del instalador

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content $env:USERPROFILE\.tauri\enjambre.key -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<contrasena>"
# si se activa el agente CLI en el paquete (E5.1-C):
$env:VITE_CLI_AGENTS = "1"
cd tauri
cargo tauri build
```

Con `bundle.createUpdaterArtifacts: true` produce en
`tauri/target/release/bundle/nsis/`:
- `ENJAMBRE_<version>_x64-setup.exe`
- `ENJAMBRE_<version>_x64-setup.exe.sig`

Subir `version` en `tauri/tauri.conf.json` (hoy `0.5.0`) antes del build si es release
nuevo. SmartScreen: firma Authenticode es independiente y **opcional** (el auto-update
funciona sin ella); anotar como riesgo de UX (aviso al instalar), no bloqueante.

---

## E5.5 — Verificacion end-to-end del paquete (checklist)

Instalar el `.exe` y abrir la app. Confirmar:
- [ ] Arranca, el dashboard carga (agentes/providers) SIN 401 -> token inyectado (E5.1).
- [ ] Host-guard vivo: `curl -H "Host: evil.com" 127.0.0.1:8000/agents` -> 403.
- [ ] Rate limit vivo: rafaga > 240 req rapidas a un endpoint -> aparece 429.
- [ ] (Si se activo) pestana "Agente CLI": lanzar prompt contra un repo git ->
      ver diff -> aprobar -> `git diff` del repo coincide. Requiere `claude` en PATH.
- [ ] Cerrar la app mata el sidecar (no queda `enjambre-sidecar.exe` colgando).

---

## E5.6 — GitHub Release + `latest.json`

Seguir `docs/AUTO_UPDATE.md` Paso 3: crear `latest.json` (con el contenido del `.sig`
en `signature`, `version` SIN la `v`), publicar el Release con tag `v<version>` marcado
`latest`, adjuntar el `.exe`, su `.sig` y `latest.json`. El endpoint del updater
(`.../releases/latest/download/latest.json`) ya apunta al ultimo release.

**Nota de seguridad pendiente que ESTE release cierra:** al re-congelar (E5.2) el
paquete pasa a incluir host-guard + token + rate limit + audit; hasta entonces el
instalador v0.5.0 publicado corre el backend viejo sin esos controles.

---

## Resumen de "definicion de done" de E5

- E5.1 token cableado y verificado en el paquete (S1 completo).
- E5.2 sidecar recongelado con el backend E1+E4.
- E5.3 par de claves generado, pubkey en conf, privada en keystores (S5).
- E5.4 instalador firmado + `.sig`.
- E5.5 checklist end-to-end verde en la app instalada.
- E5.6 Release publicado con `latest.json`; auto-update funcional.
