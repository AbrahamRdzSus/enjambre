// Helper cn minimo (sin tailwind-merge): une clases truthy. Suficiente para los
// componentes portados de Magic UI / Aceternity (no hay clases en conflicto).
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}
