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
    <section className="px-6 py-16">
      <div className="mx-auto w-full max-w-6xl">
        <p className="eyebrow mb-2">El dashboard</p>
        <h2 className="mb-3 text-3xl font-bold">Asi se ve ENJAMBRE</h2>
        <p className="mb-10 max-w-2xl text-sm text-muted-foreground">
          Aplicacion de escritorio local-first. Capturas reales del dashboard (beta).
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          {SHOTS.map((s) => (
            <figure key={s.src} className="glass overflow-hidden">
              <img
                src={s.src}
                alt={`Captura de ENJAMBRE: ${s.title}`}
                loading="lazy"
                className="w-full border-b border-border"
                style={{ aspectRatio: '16 / 10', objectFit: 'cover', objectPosition: 'top left' }}
              />
              <figcaption className="p-5">
                <h3 className="mb-1 text-base font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
