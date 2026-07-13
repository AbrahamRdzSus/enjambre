/**
 * Formato de numeros del cockpit. UNA sola implementacion.
 *
 * Antes vivia copiado en 4 sitios y ya habia divergido: AgentCard escribia "1.2k"
 * (minuscula) mientras Overview/Stats escribian "1.2K". El costo se redondeaba con
 * toFixed(2), (4), (5) y (6) segun la pantalla, para el MISMO dato.
 */

/** Tokens: 1234 -> "1.2K", 1234567 -> "1.23M". */
export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/**
 * Costo en USD. `precision` por contexto de lectura, no por capricho de cada pagina:
 *   'coarse' (2) -> totales que el usuario compara con su factura.
 *   'fine'   (6) -> costo por run/agente, que suele ser < $0.01 y con 2 decimales
 *                   se veria siempre como "$0.00".
 */
export function fmtCost(n: number, precision: 'coarse' | 'fine' = 'coarse'): string {
  return `$${n.toFixed(precision === 'fine' ? 6 : 2)}`;
}

/** Porcentaje entero, con guion cuando no hay base (evita mostrar "0%" sin datos). */
export function fmtPct(part: number, total: number): string {
  if (total <= 0) return '—';
  return `${Math.round((part / total) * 100)}%`;
}
