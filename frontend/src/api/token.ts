/**
 * Obtencion del token del sidecar. UNA sola resolucion para toda la app.
 *
 * Historia: el shell de Tauri empujaba el token al webview con un `eval` unico
 * (`window.__ENJAMBRE_TOKEN__ = ...`) en cuanto el sidecar lo imprimia. Eso fallaba
 * de dos formas:
 *
 *   1. CARRERA. El sidecar tarda en arrancar (spawn + uvicorn + primer print), pero
 *      React renderiza de inmediato. Peor: el EventSource de /logs/stream lee el
 *      token UNA sola vez, al montar. Si el eval llegaba despues, el stream quedaba
 *      abierto sin token PARA SIEMPRE y las primeras peticiones daban 401.
 *   2. RECARGA. Un F5 (o el HMR de Vite) borraba la variable global, y nadie la
 *      volvia a inyectar: el shell solo parsea el stdout al arrancar el sidecar.
 *
 * Ademas, `eval` depende de que la CSP lo permita. La solucion es no depender del
 * empujon: el token se PIDE (`invoke('api_token')`), que va por el IPC de Tauri y no
 * por la CSP de scripts. Se reintenta hasta que el sidecar lo publica.
 */

const TOKEN_TIMEOUT_MS = 15_000;
const RETRY_BASE_MS = 60;
const RETRY_MAX_MS = 500;

/** Tauri inyecta __TAURI_INTERNALS__ solo dentro del shell nativo (patron de lib/updater.ts). */
function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function fromWindow(): string {
  if (typeof window === 'undefined') return '';
  return (window as unknown as { __ENJAMBRE_TOKEN__?: string }).__ENJAMBRE_TOKEN__ ?? '';
}

/** Valor ya resuelto. Los consumidores (client.ts) lo leen de forma SINCRONA. */
let resolved = '';
let pending: Promise<string> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pullFromTauri(): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core');
  const deadline = Date.now() + TOKEN_TIMEOUT_MS;
  let wait = RETRY_BASE_MS;

  while (Date.now() < deadline) {
    // El comando devuelve None mientras el sidecar no haya impreso el token.
    const tok = await invoke<string | null>('api_token').catch(() => null);
    if (tok) return tok;
    // El fast-path del eval puede haber llegado ya; si no, seguimos esperando.
    const pushed = fromWindow();
    if (pushed) return pushed;
    await sleep(wait);
    wait = Math.min(wait * 2, RETRY_MAX_MS);
  }
  return '';
}

/**
 * Resuelve el token una vez y lo cachea. Llamar en el arranque (main.tsx) ANTES de
 * renderizar: asi ninguna peticion ni EventSource sale sin token.
 */
export function ensureApiToken(): Promise<string> {
  if (resolved) return Promise.resolve(resolved);
  if (pending) return pending;

  pending = (async () => {
    // En dev por navegador el token viene horneado por el predev (load-token.mjs).
    const fromEnv = import.meta.env.VITE_API_TOKEN;
    if (fromEnv) return fromEnv;
    if (!inTauri()) return fromWindow();

    const tok = await pullFromTauri();
    if (!tok) {
      // No abortamos: /health responde sin token y la UI ya sabe mostrar el error
      // (OfflineBanner / run.isError) en vez de quedarse en blanco.
      console.error(
        '[enjambre] el sidecar no publico su token en %ds. El dashboard respondera 401.',
        TOKEN_TIMEOUT_MS / 1000,
      );
    }
    return tok;
  })();

  return pending.then((tok) => {
    resolved = tok;
    pending = null;
    return tok;
  });
}

/** Token ya resuelto (sincrono). Vacio si `ensureApiToken()` aun no ha terminado. */
export function apiToken(): string {
  return resolved || import.meta.env.VITE_API_TOKEN || fromWindow();
}
