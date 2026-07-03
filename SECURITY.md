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
  guardado. Defiende contra otro proceso local (malware) que pegue directo a 127.0.0.1.
  Opt-out consciente pasando `api_token=""`.

  Distribucion del token al cliente legitimo:
  - Sidecar imprime `ENJAMBRE_API_TOKEN=<tok>` en stdout en cada arranque.
  - **Dev (`:5173`):** el `predev` `frontend/scripts/load-token.mjs` lee el token-file
    y escribe `frontend/.env.local` con `VITE_API_TOKEN`. Arranca el sidecar ANTES de
    `npm run dev`.
  - **App Tauri empaquetada:** el cliente lee `window.__ENJAMBRE_TOKEN__`. PENDIENTE de
    cablear en el shell Rust (`tauri/src/lib.rs`): parsear la linea
    `ENJAMBRE_API_TOKEN=` del stdout del sidecar (ya se drena en el `rx.recv` del setup)
    e inyectarla al webview via init script / comando Tauri. Verificar con
    `cargo tauri build` (requiere Rust+MSVC). Este paso va con el empaque (E5).

- **Rate limit (default-on, token-bucket):** acota a un proceso local abusivo que
  martille endpoints caros (`/cli/run`, `/run`). Default generoso `240/8` (240 en
  rafaga, recarga 8/s) para no estorbar el polling de la UI; `/health` exento.
  Configurable con `ENJAMBRE_RATE_LIMIT="capacidad/refill_por_seg"`; `0` lo desactiva.
  429 al exceder.

- **Allowlist de roots** (`ENJAMBRE_ALLOWED_ROOTS`) y **docs apagadas por defecto**
  (`ENJAMBRE_API_DEV=1` para habilitarlas). Ver docstring de `src/enjambre/api.py`.

## Reportar vulnerabilidades

Abrir un issue privado o enviar correo al mantenedor del proyecto.
