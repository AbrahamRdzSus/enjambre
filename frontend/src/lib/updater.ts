// Auto-update de la app de escritorio (Tauri). Solo corre dentro del shell Tauri;
// en el dashboard servido por navegador (Vite dev) es un no-op. Los plugins se
// importan dinamicamente para que el bundle de navegador no los exija en build.
// Ver docs/AUTO_UPDATE.md (claves de firma + latest.json + GitHub Release).

export interface UpdateInfo {
  version: string;
  notes: string;
  install: () => Promise<void>;
}

// Tauri inyecta __TAURI_INTERNALS__ en window solo dentro del shell nativo.
function inTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// Busca una actualizacion pendiente. Devuelve null si no hay, si no estamos en
// Tauri, o si falla la consulta (offline / sin release / endpoint caido).
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!inTauri()) return null;
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return null;
    return {
      version: update.version,
      notes: update.body ?? '',
      install: async () => {
        await update.downloadAndInstall();
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      },
    };
  } catch {
    return null;
  }
}
