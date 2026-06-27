import {
  Layers,
  KeyRound,
  ShieldCheck,
  Plug,
  GitPullRequestArrow,
  Boxes,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SectionHeading from './ui/SectionHeading';
import Reveal from './ui/Reveal';

const FEATURES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Layers,
    title: 'Agentes en paralelo',
    body: 'Despacha un mismo prompt a varios agentes a la vez y compara sus salidas lado a lado, por modelo y por rol. El enjambre trabaja, tu decides.',
  },
  {
    icon: KeyRound,
    title: 'BYOK — tus propias claves',
    body: 'Conectas tus API keys de OpenAI, Anthropic, Google o xAI. Viven en memoria por sesion; ENJAMBRE nunca las persiste ni las envia a terceros.',
  },
  {
    icon: ShieldCheck,
    title: 'Local-first y privado',
    body: 'Corre en tu maquina. Tu codigo y tus claves no salen de tu equipo. No hay servidor intermedio.',
  },
  {
    icon: Plug,
    title: 'Multi-proveedor sin lock-in',
    body: 'Adaptadores intercambiables para cada proveedor (incluido cualquier API compatible con OpenAI). Cambia de modelo sin reescribir tu flujo.',
  },
  {
    icon: GitPullRequestArrow,
    title: 'Aprobacion humana',
    body: 'Toda accion destructiva (escribir archivos, ejecutar, commit) pasa por un gate: revisas el diff y apruebas antes de aplicar.',
  },
  {
    icon: Boxes,
    title: 'Open source y auditable',
    body: 'Apache-2.0. No entrena ni revende modelos: es una capa de orquestacion, UI y flujo de trabajo facil de auditar.',
  },
];

function IconBadge({ icon: Icon, large = false }: { icon: LucideIcon; large?: boolean }) {
  return (
    <span
      className="grid place-items-center rounded-xl"
      style={{
        width: large ? 56 : 40,
        height: large ? 56 : 40,
        background: 'rgba(139,92,246,0.14)',
        color: 'var(--purple-2)',
        boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.22)',
      }}
    >
      <Icon size={large ? 26 : 20} strokeWidth={1.8} />
    </span>
  );
}

export default function Features() {
  const [hero, ...rest] = FEATURES;
  return (
    <section id="funciones" className="px-6 py-20">
      <div className="mx-auto w-full max-w-6xl">
        <SectionHeading
          kicker="Por que ENJAMBRE"
          title="Orquestacion seria,"
          accent="control local"
        />

        {/* Bento: celda principal grande + dos a la derecha + fila de tres */}
        <div className="mt-10 grid gap-4 lg:grid-cols-3 lg:auto-rows-[minmax(0,1fr)]">
          <Reveal className="lg:col-span-2 lg:row-span-2">
            <article className="glass card-hover hex-field relative flex h-full flex-col justify-between overflow-hidden p-7">
              <div>
                <IconBadge icon={hero.icon} large />
                <h3 className="mb-2 mt-5 text-2xl font-bold text-foreground">{hero.title}</h3>
                <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
                  {hero.body}
                </p>
              </div>
              <p className="mt-6 font-mono text-xs" style={{ color: 'var(--amber-2)' }}>
                parallel · sequential · debate · vote
              </p>
            </article>
          </Reveal>

          {rest.slice(0, 2).map((f, i) => (
            <Reveal key={f.title} index={i + 1}>
              <article className="glass card-hover flex h-full flex-col p-6">
                <IconBadge icon={f.icon} />
                <h3 className="mb-2 mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            </Reveal>
          ))}

          {rest.slice(2).map((f, i) => (
            <Reveal key={f.title} index={i + 3}>
              <article className="glass card-hover flex h-full flex-col p-6">
                <IconBadge icon={f.icon} />
                <h3 className="mb-2 mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
