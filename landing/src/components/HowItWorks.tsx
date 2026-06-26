import SectionHeading from './ui/SectionHeading';
import Reveal from './ui/Reveal';

const STEPS = [
  {
    n: '01',
    title: 'Conecta tus claves',
    body: 'Pega tus API keys (BYOK). Se quedan en memoria por sesion; no se guardan.',
  },
  {
    n: '02',
    title: 'Registra tus agentes',
    body: 'Define agentes con rol (arquitecto/builder) y el modelo de cada proveedor.',
  },
  {
    n: '03',
    title: 'Lanza en paralelo',
    body: 'Despacha un prompt a varios agentes a la vez: paralelo, secuencial o debate.',
  },
  {
    n: '04',
    title: 'Revisa y aplica',
    body: 'Compara salidas, previsualiza el diff y aplica los cambios con tu aprobacion.',
  },
];

export default function HowItWorks() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto w-full max-w-6xl">
        <SectionHeading
          kicker="Como funciona"
          title="De prompt a"
          accent="cambio revisable"
        />

        <div className="relative mt-12">
          {/* Conector: linea con degradado que enlaza los nodos (solo desktop) */}
          <div
            className="absolute left-0 right-0 hidden lg:block"
            style={{
              top: 22,
              height: 2,
              background:
                'linear-gradient(90deg, transparent, var(--purple) 12%, var(--amber) 88%, transparent)',
              opacity: 0.45,
            }}
          />

          <ol className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} index={i}>
                <li className="relative flex flex-col">
                  {/* Nodo hexagonal con el numero */}
                  <span
                    className="relative z-10 grid place-items-center"
                    style={{ width: 46, height: 46 }}
                  >
                    <span
                      className="absolute inset-0"
                      style={{
                        background: 'var(--panel-2)',
                        clipPath:
                          'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)',
                        boxShadow: 'inset 0 0 0 1.5px var(--purple)',
                      }}
                    />
                    <span
                      className="relative font-mono text-sm font-bold tnum"
                      style={{ color: 'var(--amber-2)' }}
                    >
                      {s.n}
                    </span>
                  </span>
                  <h3 className="mb-2 mt-5 text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
