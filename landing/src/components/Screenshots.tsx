import SectionHeading from './ui/SectionHeading';
import Reveal from './ui/Reveal';

const SHOTS = [
  {
    src: '/shots/overview.png',
    title: 'Panel del enjambre',
    body: 'Tu equipo de agentes de un vistazo: estado en vivo, tokens, costo y tasa de exito.',
  },
  {
    src: '/shots/lanzar.png',
    title: 'Despacha en paralelo',
    body: 'Un prompt, varios agentes a la vez. Modo paralelo, secuencial o debate, y comparas las salidas.',
  },
  {
    src: '/shots/workspace.png',
    title: 'Aprobacion humana',
    body: 'Previsualiza el diff de cada cambio y aplicalo solo con tu aprobacion. Nada se escribe sin tu OK.',
  },
];

export default function Screenshots() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto w-full max-w-6xl">
        <SectionHeading
          kicker="El dashboard"
          title="Asi se ve"
          accent="ENJAMBRE"
          subtitle="Aplicacion de escritorio local-first. Capturas reales del dashboard (beta)."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {SHOTS.map((s, i) => (
            <Reveal key={s.src} index={i}>
              <figure className="glass card-hover h-full overflow-hidden">
                {/* Barra de ventana: da contexto de app de escritorio */}
                <div
                  className="flex items-center gap-1.5 border-b px-3 py-2"
                  style={{ borderColor: 'var(--line)', background: 'rgba(8,13,22,0.6)' }}
                >
                  <span className="size-2 rounded-full" style={{ background: '#ff5f57' }} />
                  <span className="size-2 rounded-full" style={{ background: '#febc2e' }} />
                  <span className="size-2 rounded-full" style={{ background: '#28c840' }} />
                  <span className="ml-2 font-mono text-[10px]" style={{ color: 'var(--fg-3)' }}>
                    enjambre — {s.src.replace('/shots/', '').replace('.png', '')}
                  </span>
                </div>
                <img
                  src={s.src}
                  alt={`Captura de ENJAMBRE: ${s.title}`}
                  loading="lazy"
                  className="w-full"
                  style={{ aspectRatio: '16 / 10', objectFit: 'cover', objectPosition: 'top left' }}
                />
                <figcaption className="p-5">
                  <h3 className="mb-1 text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
