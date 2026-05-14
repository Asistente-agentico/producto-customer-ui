import type { z } from 'zod';
import type { ProgresoSchema } from '@/api/types';

type Progreso = z.infer<typeof ProgresoSchema>;

export default function ProgresoCard({ artefacto }: { artefacto: Progreso }) {
  const pct = Math.max(0, Math.min(100, artefacto.porcentaje));
  return (
    <article
      className="rounded-md border border-white/10 bg-white/5 p-3"
      aria-busy={!artefacto.completado}
    >
      <header className="flex items-center justify-between text-sm mb-2">
        <span className="opacity-80">{artefacto.etapa ?? 'Procesando'}</span>
        <span className="font-mono opacity-70">{pct}%</span>
      </header>
      <div
        className="h-2 rounded bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={artefacto.etapa ?? 'Progreso'}
      >
        <div
          className="h-full transition-[width] duration-300"
          style={{ width: `${pct}%`, backgroundColor: 'var(--color-accent)' }}
        />
      </div>
    </article>
  );
}
