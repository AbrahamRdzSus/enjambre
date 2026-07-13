/*
 * Cliente HTTP del frontend -> sidecar FastAPI de ENJAMBRE (enjambre.api).
 * Base: 127.0.0.1:8000 por defecto (el sidecar permite el origen 5173 via CORS).
 * Token (sidecar DEFAULT-ON): en dev llega via VITE_API_TOKEN (lo carga el predev
 * scripts/load-token.mjs desde el token-file del sidecar); en la app Tauri empaquetada
 * el shell inyecta window.__ENJAMBRE_TOKEN__ (ver docs/SECURITY.md > token del sidecar).
 */
import { OfflineError, apiErrorFrom } from '../lib/errors';
import { apiToken } from './token';

const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// El token lo resuelve `ensureApiToken()` en el arranque (main.tsx), ANTES del primer
// render. Aqui solo se lee el valor ya resuelto: para cuando corre cualquier peticion
// -- o se abre el EventSource de /logs/stream, que lo lee una sola vez -- el token ya
// esta. Ver api/token.ts para por que el empujon por `eval` no bastaba.

type ReqOpts = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

async function req<T>(path: string, opts?: ReqOpts): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts?.headers,
  };
  const token = apiToken();
  if (token) headers['X-API-Token'] = token;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers });
  } catch {
    // fetch solo rechaza si la peticion NO llego (sidecar caido, puerto cerrado).
    // Se distingue del error HTTP para que la UI pueda decir "sin conexion" en vez
    // de pintar ceros como si fueran datos reales.
    throw new OfflineError();
  }
  if (!res.ok) throw apiErrorFrom(res.status, await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

export const api = {
  base: BASE,
  get token() { return apiToken(); },  // perezoso: el SSE lo lee al abrir el stream
  get: <T>(p: string) => req<T>(p, { method: 'GET' }),
  post: <T>(p: string, body?: unknown) =>
    req<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(p: string, body?: unknown) =>
    req<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => req<T>(p, { method: 'DELETE' }),
};
