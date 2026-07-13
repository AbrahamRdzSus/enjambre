import type { LucideIcon } from 'lucide-react';

// Estado vacio del cockpit: icono opcional + texto centrado. Fuente unica; antes
// estaba reimplementado en BottomRow (EmptyLine), Conversations y FilePanel (Empty),
// cada uno con su propio padding y variante con/sin icono.
export default function EmptyState({
  icon: Icon,
  text,
  className,
}: {
  icon?: LucideIcon;
  text: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-4 py-8 text-center ${className ?? ''}`}
    >
      {Icon && <Icon className="size-6 text-muted-foreground" />}
      <p className="text-[12px] text-muted-foreground">{text}</p>
    </div>
  );
}
