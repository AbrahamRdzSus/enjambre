/*
 * Cliente HTTP del frontend -> sidecar FastAPI de ENJAMBRE (enjambre.api).
 * Base: 127.0.0.1:8000 por defecto (el sidecar permite el origen 5173 via CORS).
 * Token (sidecar DEFAULT-ON): en dev llega via VITE_API_TOKEN (lo carga el predev
 * scripts/load-token.mjs desde el token-file del sidecar); en la app Tauri empaquetada
 * el shell inyecta window.__ENJAMBRE_TOKEN__ (ver docs/SECURITY.md > token del sidecar).
 */
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Lectura PEREZOSA del token en cada request: en la app Tauri el shell inyecta
// window.__ENJAMBRE_TOKEN__ tras arrancar el sidecar, posiblemente despues de que
// carga este modulo; leerlo por-request evita la carrera de cachearlo vacio.
function apiToken(): string {
  return import.meta.env.VITE_API_TOKEN
    || (typeof window !== 'undefined'
        ? (window as unknown as { __ENJAMBRE_TOKEN__?: string }).__ENJAMBRE_TOKEN__ ?? ''
        : '');
}

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.headers as Record<string, string>),
  };
  const token = apiToken();
  if (token) headers['X-API-Token'] = token;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Error ${res.status}`);
  }
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
