// Marca por provider: monograma en un chip con el color de la marca. lucide-react no
// incluye logos de terceros, así que usamos una insignia sobria y consistente con el
// lenguaje "cockpit" en vez de SVGs de marca (evita problemas de licencia).

const BRAND: Record<string, { label: string; color: string }> = {
  openai: { label: 'AI', color: '#10a37f' },     // OpenAI verde
  anthropic: { label: 'C', color: '#d97757' },   // Claude terracota
  google: { label: 'G', color: '#4285f4' },      // Gemini azul
  xai: { label: 'x', color: '#e5e7eb' },         // Grok / xAI
};

export default function ProviderIcon({ provider, size = 16 }: { provider: string; size?: number }) {
  const b = BRAND[provider] ?? { label: provider.slice(0, 1).toUpperCase(), color: 'var(--fg-mute)' };
  return (
    <span
      title={provider}
      className="inline-flex items-center justify-center rounded font-mono font-bold leading-none"
      style={{
        width: size, height: size, fontSize: size * 0.5,
        background: `color-mix(in srgb, ${b.color} 22%, transparent)`,
        color: b.color,
      }}
    >
      {b.label}
    </span>
  );
}
