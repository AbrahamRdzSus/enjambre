import { REPO, SECURITY, PROVIDER_POLICY, LICENSE, OBSIDIA } from '../links';

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src="/logos/hex.png" alt="ENJAMBRE" width={28} height={28} />
          <div className="leading-tight">
            <span className="wordmark text-sm">ENJAMBRE</span>
            <p className="text-xs text-muted-foreground">
              by{' '}
              <a href={OBSIDIA} target="_blank" rel="noreferrer" className="hover:text-foreground">
                Obsidia Studio
              </a>{' '}
              · Apache-2.0
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a href={OBSIDIA} target="_blank" rel="noreferrer" className="hover:text-foreground">Ecosistema</a>
          <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-foreground">GitHub</a>
          <a href={LICENSE} target="_blank" rel="noreferrer" className="hover:text-foreground">Licencia</a>
          <a href={SECURITY} target="_blank" rel="noreferrer" className="hover:text-foreground">Seguridad</a>
          <a href={PROVIDER_POLICY} target="_blank" rel="noreferrer" className="hover:text-foreground">Politica de proveedores</a>
        </nav>
      </div>
      <p className="mx-auto mt-6 w-full max-w-6xl text-xs text-muted-foreground">
        ENJAMBRE no entrena ni revende modelos de terceros. OpenAI, Anthropic, Google, xAI
        y GitHub son marcas de sus respectivos titulares; su mencion no implica afiliacion
        ni respaldo. El usuario aporta y controla sus propias claves (BYOK).
      </p>
    </footer>
  );
}
