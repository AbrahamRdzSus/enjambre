// Predev: lee el token que el sidecar autogenera (data_dir/api-token) y lo deja en
// frontend/.env.local como VITE_API_TOKEN para que el dashboard en dev (:5173) pueda
// autenticar contra el sidecar (token DEFAULT-ON). Replica enjambre.paths.data_dir.
// Arranca el sidecar ANTES de `npm run dev` para que el token ya exista.
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function dataDir() {
  const override = (process.env.ENJAMBRE_DATA_DIR || '').trim();
  if (override) return override;
  if (process.platform === 'win32' && process.env.APPDATA) {
    return join(process.env.APPDATA, 'enjambre');
  }
  const xdg = process.env.XDG_DATA_HOME;
  return xdg ? join(xdg, 'enjambre') : join(homedir(), '.local', 'share', 'enjambre');
}

const tokenFile = join(dataDir(), 'api-token');
let token = '';
try {
  token = readFileSync(tokenFile, 'utf-8').trim();
} catch {
  console.warn(
    `[load-token] no encontre ${tokenFile}. Arranca el sidecar primero ` +
    '(uvicorn enjambre.api:app) para que genere el token, luego reintenta `npm run dev`.',
  );
}

// Escribe .env.local (gitignoreado). Si no hubo token, deja el valor vacio.
writeFileSync(join(process.cwd(), '.env.local'), `VITE_API_TOKEN=${token}\n`, 'utf-8');
if (token) console.log('[load-token] VITE_API_TOKEN cargado desde el sidecar.');
