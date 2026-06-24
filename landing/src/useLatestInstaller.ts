import { useEffect, useState } from 'react';
import { LATEST_API, DOWNLOAD_FALLBACK } from './links';

// Resuelve el instalador de Windows del ULTIMO release en runtime, sin hardcodear
// la version. Busca el primer asset .exe (x64) del release latest; si la API falla
// (rate limit, offline), cae a la pagina de releases. Asi el boton sigue valido
// aunque suba v0.6.0, v1.0.0, etc.

interface ReleaseAsset { name: string; browser_download_url: string }

export function useLatestInstaller(): { href: string; version: string | null } {
  const [href, setHref] = useState<string>(DOWNLOAD_FALLBACK);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(LATEST_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { tag_name?: string; assets?: ReleaseAsset[] }) => {
        if (!alive) return;
        const exe = (data.assets ?? []).find((a) =>
          /x64.*\.exe$|\.exe$/i.test(a.name),
        );
        if (exe) setHref(exe.browser_download_url);
        if (data.tag_name) setVersion(data.tag_name);
      })
      .catch(() => {
        /* deja el fallback (pagina de releases) */
      });
    return () => {
      alive = false;
    };
  }, []);

  return { href, version };
}
