// Enlaces canonicos del producto.
export const OWNER_REPO = 'AbrahamRdzSus/enjambre';
export const REPO = `https://github.com/${OWNER_REPO}`;
export const RELEASES = `${REPO}/releases`;
// Fallback de descarga: la pagina del ultimo release (siempre valida). El link
// directo al .exe se resuelve en runtime via useLatestInstaller (sobrevive a
// cambios de version sin hardcodear el nombre del asset).
export const DOWNLOAD_FALLBACK = `${REPO}/releases/latest`;
export const LATEST_API = `https://api.github.com/repos/${OWNER_REPO}/releases/latest`;
export const SECURITY = `${REPO}/blob/main/SECURITY.md`;
export const PROVIDER_POLICY = `${REPO}/blob/main/PROVIDER_POLICY.md`;
export const LICENSE = `${REPO}/blob/main/LICENSE`;

// Ecosistema Obsidia: redireccion de ida (a la landing paraguas) y vuelta.
// La landing de Obsidia (otro repo) enlaza de vuelta a este nodo (enjambre.obsidia.mx).
export const OBSIDIA = 'https://obsidia.mx';
export const ECOSYSTEM: { name: string; tagline: string; href: string }[] = [
  { name: 'Obsidia', tagline: 'El ecosistema', href: 'https://obsidia.mx' },
  { name: 'Sylvis', tagline: 'Calculadoras de carpinteria', href: 'https://sylvis.obsidia.mx' },
];
