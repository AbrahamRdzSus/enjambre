/*
 * Cliente HTTP del frontend -> sidecar FastAPI de ENJAMBRE (enjambre.api).
 * Base: 127.0.0.1:8000 por defecto (el sidecar permite el origen 5173 via CORS).
 * Token opcional (VITE_API_TOKEN) si el sidecar corre con ENJAMBRE_API_TOKEN.
 */
const BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const TOKEN = import.meta.env.VITE_API_TOKEN || '';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.headers as Record<string, string>),
  };
  if (TOKEN) headers['X-API-Token'] = TOKEN;

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
  token: TOKEN,
  get: <T>(p: string) => req<T>(p, { method: 'GET' }),
  post: <T>(p: string, body?: unknown) =>
    req<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(p: string, body?: unknown) =>
    req<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => req<T>(p, { method: 'DELETE' }),
};
