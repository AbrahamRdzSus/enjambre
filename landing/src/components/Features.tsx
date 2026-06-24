import {
  Layers,
  KeyRound,
  ShieldCheck,
  Plug,
  GitPullRequestArrow,
  Boxes,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const FEATURES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Layers,
    title: 'Agentes en paralelo',
    body: 'Despacha un mismo prompt a varios agentes a la vez y compara sus salidas lado a lado, por modelo y por rol.',
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

export default function Features() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <p className="eyebrow mb-2">Por que ENJAMBRE</p>
        <h2 className="mb-10 text-3xl font-bold">Orquestacion seria, control local</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass p-6">
              <span className="mb-4 grid size-10 place-items-center rounded-lg" style={{ background: 'rgba(139,92,246,0.14)', color: 'var(--purple)' }}>
                <f.icon size={20} />
              </span>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
