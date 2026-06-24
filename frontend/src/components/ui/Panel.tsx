import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

// Chrome de panel del lenguaje "cockpit": superficie glass con header mono-uppercase
// tracked y borde inferior, cuerpo y footer opcionales. Reutilizado en todas las
// pestañas para un look consistente con Overview.

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
  footer,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  footer?: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col glass', className)}>
      {title != null && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </p>
          {action}
        </div>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
      {footer != null && (
        <div className="border-t border-border px-4 py-3">{footer}</div>
      )}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      </div>
      {action}
    </header>
  );
}
