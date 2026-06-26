import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

// Revelado al entrar en viewport. Respeta prefers-reduced-motion (aparece sin
// movimiento). `index` escalona la entrada (stagger ~50ms) para listas/grids.
export default function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
    >
      {children}
    </motion.div>
  );
}
