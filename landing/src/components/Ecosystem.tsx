import { ArrowUpRight } from 'lucide-react';
import { OBSIDIA, ECOSYSTEM } from '../links';
import Reveal from './ui/Reveal';

// Parte del ecosistema Obsidia. ENJAMBRE es un nodo (activo) de la constelacion;
// enlaza de vuelta a la landing paraguas y a las apps hermanas. La landing de
// Obsidia (otro repo) coloca el nodo de ENJAMBRE en su mapa y apunta aca.
export default function Ecosystem() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="eyebrow">Parte de algo mas grande</span>
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            Un nodo del ecosistema <span className="wordmark">Obsidia</span>
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            ENJAMBRE es una de las herramientas de Obsidia Studio. Misma identidad,
            misma filosofia: software local-first que respeta tus datos.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Nodo activo: este producto */}
          <Reveal>
            <div
              className="glass hex-field relative h-full overflow-hidden p-5"
              style={{
                borderColor: 'var(--purple)',
                background:
                  'radial-gradient(120% 90% at 0% 0%, rgba(139,92,246,0.16), transparent 60%), color-mix(in srgb, var(--panel-2) 80%, transparent)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <img src="/logos/hex.png" alt="" width={26} height={26} />
                <span className="wordmark text-sm">ENJAMBRE</span>
              </div>
              <p className="mt-3 text-xs" style={{ color: 'var(--amber)' }}>
                Estas aqui
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Orquestador de agentes IA de codificacion.
              </p>
            </div>
          </Reveal>

          {/* Nodos hermanos + vuelta al paraguas */}
          {ECOSYSTEM.map((node, i) => (
            <Reveal key={node.name} index={i + 1}>
              <a
                href={node.href}
                target="_blank"
                rel="noreferrer"
                className="glass card-hover group block h-full p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{node.name}</span>
                  <ArrowUpRight
                    size={16}
                    className="text-muted-foreground transition-colors group-hover:text-foreground"
                  />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{node.tagline}</p>
              </a>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href={OBSIDIA}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Ver todo el ecosistema en obsidia.mx <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
