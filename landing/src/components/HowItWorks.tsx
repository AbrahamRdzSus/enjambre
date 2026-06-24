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
    body: 'Despacha un prompt a varios agentes a la vez, en modo paralelo, secuencial o debate.',
  },
  {
    n: '04',
    title: 'Revisa y aplica',
    body: 'Compara salidas, previsualiza el diff y aplica los cambios con tu aprobacion.',
  },
];

export default function HowItWorks() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <p className="eyebrow mb-2">Como funciona</p>
        <h2 className="mb-10 text-3xl font-bold">De prompt a cambio revisable</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="glass p-6">
              <span className="font-mono text-2xl font-bold" style={{ color: 'var(--amber)' }}>
                {s.n}
              </span>
              <h3 className="mb-2 mt-3 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
