import Reveal from './Reveal';

// Encabezado de seccion con firma propia: kicker hex + titulo (acento en degradado)
// + regla con glow. Unifica la identidad y rompe el patron generico eyebrow+h2.
export default function SectionHeading({
  kicker,
  title,
  accent,
  subtitle,
  align = 'left',
}: {
  kicker: string;
  title: string;
  accent?: string;
  subtitle?: string;
  align?: 'left' | 'center';
}) {
  const centered = align === 'center';
  return (
    <Reveal className={centered ? 'flex flex-col items-center text-center' : ''}>
      <span className="kicker mb-3">{kicker}</span>
      <h2 className="text-3xl font-extrabold leading-tight sm:text-[2.1rem]">
        {title} {accent && <span className="wordmark">{accent}</span>}
      </h2>
      {subtitle && (
        <p className={`mt-3 text-sm text-muted-foreground sm:text-base ${centered ? 'max-w-2xl' : 'max-w-xl'}`}>
          {subtitle}
        </p>
      )}
      <hr className={`rule-glow mt-6 ${centered ? 'w-40' : 'w-24'}`} />
    </Reveal>
  );
}
