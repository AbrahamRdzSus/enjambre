/**
 * Traduccion de errores del sidecar a mensajes que un humano puede leer.
 *
 * Antes, client.ts lanzaba `new Error(await res.text())`: como FastAPI responde
 * `{"detail": "..."}`, el usuario terminaba viendo JSON crudo en la pantalla.
 * ApiError conserva el status para que la UI pueda ramificar, y `message` ya viene
 * en español listo para pintar.
 */

export class ApiError extends Error {
  readonly status: number;
  /** El `detail` del backend, si vino. Util para diagnostico, no para la UI. */
  readonly detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/** Fallo de red: el fetch ni siquiera llego al sidecar (proceso caido, puerto cerrado). */
export class OfflineError extends Error {
  constructor() {
    super('No hay conexion con el sidecar de ENJAMBRE. Verifica que este corriendo.');
    this.name = 'OfflineError';
  }
}

const BY_STATUS: Record<number, string> = {
  401: 'El sidecar rechazo el token de acceso. Reinicia la aplicacion.',
  403: 'El sidecar rechazo la peticion por seguridad (host no permitido).',
  404: 'Ese recurso no existe en el sidecar. Puede que la funcion este desactivada.',
  429: 'Demasiadas peticiones seguidas. Espera unos segundos y reintenta.',
  500: 'El sidecar fallo al procesar la peticion.',
  502: 'El servicio remoto no respondio.',
  503: 'El sidecar no esta listo todavia.',
};

/**
 * Construye el mensaje a mostrar. Prioriza el `detail` del backend cuando es una
 * frase util (los de enjambre.api lo son: "falta ANTHROPIC_API_KEY", "ruta fuera
 * de la allowlist"...), y cae a una frase por status cuando no.
 */
export function apiErrorFrom(status: number, body: string): ApiError {
  let detail: string | undefined;
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    if (typeof parsed.detail === 'string') detail = parsed.detail;
    else if (parsed.detail != null) detail = JSON.stringify(parsed.detail);
  } catch {
    // el body no era JSON: puede ser texto plano del servidor
    if (body.trim() && !body.trim().startsWith('<')) detail = body.trim();
  }
  const message = detail || BY_STATUS[status] || `El sidecar respondio con un error ${status}.`;
  return new ApiError(status, message, detail);
}

/** Mensaje listo para pintar a partir de cualquier error capturado por React Query. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError || err instanceof OfflineError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Ocurrio un error inesperado.';
}

/** true si el fallo es "no hay sidecar" (para distinguir "sin datos" de "sin conexion"). */
export function isOffline(err: unknown): boolean {
  return err instanceof OfflineError;
}
