# Security Policy

## Secretos

ENJAMBRE nunca debe registrar API keys completas en logs ni enviarlas a agentes.

Formato visual permitido:

```txt
sk-••••••••••••4F2A
```

## Archivos bloqueados por defecto

- `.env`
- `.env.*`
- `*.pem`
- `*.key`
- `id_rsa`
- `id_ed25519`
- `secrets.*`
- `credentials.*`
- `*.p12`
- `*.pfx`

## Comandos peligrosos

Requieren confirmación explícita:

- `rm -rf`
- `sudo`
- `chmod -R 777`
- `curl ... | bash`
- `wget ... | sh`
- `git push --force`
- `npm publish`
- `docker system prune`
- migraciones de base de datos
- cambios de infraestructura

## Ejecución de código

Toda ejecución debe ocurrir en sandbox cuando sea posible.

## Sidecar HTTP (enjambre.api)

El sidecar escucha en `127.0.0.1`. Controles:

- **Guard anti DNS-rebinding (default-on):** solo atiende requests cuyo `Host` sea
  loopback (`127.0.0.1` / `localhost` / `::1`); el resto recibe 403. Sin esto, un
  sitio web abierto en el navegador podria disparar endpoints con side-effects
  (`/cli/*`, `/changes/apply`) via un dominio que resuelva a 127.0.0.1 (CORS bloquea
  leer la respuesta, no ejecutar el request). Anadir hosts con `ENJAMBRE_ALLOWED_HOSTS`
  (separado por `os.pathsep`) o `*` para desactivarlo.

- **Token del sidecar (default-on en produccion):** en el arranque puro (sin inyeccion
  de `registry`/`keys`) todo salvo `/health` exige `Authorization: Bearer <tok>` o
  `X-API-Token`. El token se resuelve asi: `ENJAMBRE_API_TOKEN` del entorno, o el
  persistido en `<data_dir>/api-token` (permisos 0600), o uno nuevo autogenerado y
  guardado. Comparacion en tiempo constante (`secrets.compare_digest`).
  **Que protege:** una pagina web abierta en el navegador (que no puede leer el
  token-file), OTRO usuario de la maquina (0600), y ataques de DNS-rebinding (junto al
  guard de Host). **Que NO protege:** malware corriendo como el MISMO usuario, que puede
  leer `<data_dir>/api-token` igual que lo lee el cliente legitimo; contra eso el token
  no es una barrera y no pretende serlo. Opt-out consciente pasando `api_token=""`.

  Distribucion del token al cliente legitimo:
  - Sidecar imprime `ENJAMBRE_API_TOKEN=<tok>` en stdout en cada arranque.
  - **Dev (`:5173`):** el `predev` `frontend/scripts/load-token.mjs` lee el token-file
    y escribe `frontend/.env.local` con `VITE_API_TOKEN`. Arranca el sidecar ANTES de
    `npm run dev`.
  - **App Tauri empaquetada (HECHO):** el shell (`tauri/src/lib.rs`) drena el stdout del
    sidecar, parsea la linea `ENJAMBRE_API_TOKEN=` y **guarda el token en estado
    gestionado**. El frontend lo PIDE con `invoke('api_token')` (ver
    `frontend/src/api/token.ts`), reintentando con backoff hasta que el sidecar lo
    publica, y `main.tsx` lo espera ANTES del primer render.

    Por que pull y no push: el `eval` al webview (que se conserva solo como fast-path)
    era una unica inyeccion best-effort. Como React renderiza de inmediato y el
    `EventSource` de `/logs/stream` lee el token UNA sola vez al montar, si el eval
    llegaba tarde el stream quedaba abierto sin token para siempre (401). Y una recarga
    del webview (F5/HMR) borraba la variable global sin que nadie la reinyectara. El IPC
    ademas no depende de la CSP, a diferencia del `eval`.

- **CSP del webview (default-on):** `tauri.conf.json > app.security.csp` restringe el
  webview a `default-src 'self'`, con `connect-src` limitado al sidecar local y al IPC
  de Tauri. Importa porque la app **renderiza salida de modelos**. `devCsp` es igual de
  estricta (mas lo minimo que Vite necesita en dev), asi que `cargo tauri dev` prueba la
  politica REAL. `frontend/src/lib/csp.ts` registra un listener de
  `securitypolicyviolation`: una CSP que bloquea en silencio es peor que uno ruidosa.

- **Actualizaciones (auto-update firmado):** el updater de Tauri solo acepta paquetes
  firmados con la clave privada de minisign; la publica va en `tauri.conf.json >
  plugins.updater.pubkey`. La **privada y su contrasena NUNCA entran al repo**: viven en
  `~/.tauri/enjambre.key` y en el vault del ecosistema (`04-compartido/keystores`). Si se
  pierden, las instalaciones existentes dejan de aceptar updates para siempre.

- **Rate limit (default-on, token-bucket):** acota a un proceso local abusivo que
  martille endpoints caros (`/cli/run`, `/run`). Default generoso `240/8` (240 en
  rafaga, recarga 8/s) para no estorbar el polling de la UI; `/health` exento.
  Configurable con `ENJAMBRE_RATE_LIMIT="capacidad/refill_por_seg"`; `0` lo desactiva.
  429 al exceder.

- **Allowlist de roots** (`ENJAMBRE_ALLOWED_ROOTS`) y **docs apagadas por defecto**
  (`ENJAMBRE_API_DEV=1` para habilitarlas). Ver docstring de `src/enjambre/api.py`.

## Agente CLI (contencion honesta)

El agente CLI (`ENJAMBRE_CLI_AGENTS=1`, ACTIVO en el paquete) lanza `claude -p` en un
git worktree. Alcance real de la contencion, sin adornos:

- **El worktree solo aisla ESCRITURAS.** El proceso `claude` corre con el usuario, la red
  y el sistema de archivos completos: PUEDE LEER cualquier cosa que el usuario pueda leer
  (incluido `.env` fuera del worktree) aunque su diff no se apruebe. No es un sandbox de
  lectura ni de red. El confinamiento real de FS/red es trabajo futuro (v0.6.2+).
- **Env sin claves BYOK (mitigacion, v0.6.1):** al subproceso `claude` se le pasa un
  entorno minimo (solo vars de sistema/PATH), sin `*_API_KEY` ni el token del sidecar, para
  que no pueda leerlas del entorno y exfiltrarlas. Su propia auth de Anthropic la toma de su
  config (`~/.claude`), no de una API key en el entorno: si dependes de `ANTHROPIC_API_KEY`
  en vez del login de `claude`, el agente CLI no la vera (autentica `claude` con su login).
- **Allowlist de roots exigida en el paquete:** el instalador fija `ENJAMBRE_ALLOWED_ROOTS`
  a la carpeta del usuario, asi que registrar un proyecto fuera de ahi (p. ej. `C:\Windows`)
  se rechaza al registrarlo. Ampliar la allowlist es por env var (pantalla de Ajustes: futuro).
- **Un solo modelo:** el agente CLI esta cableado a `claude`; el "multi-modelo" aplica a los
  agentes tipo API, no al CLI.
- La aplicacion del diff sigue pasando por `ChangeSet.apply(approved=True)` (gate humano +
  anti path-traversal + archivos bloqueados + secretos). Detalle: `docs/CLI_AGENT.md`.

## Reportar vulnerabilidades

Abrir un issue privado o enviar correo al mantenedor del proyecto.
