import { IconLock } from '@tabler/icons-react';
import type { z } from 'zod';
import type { TableroKpiSchema } from '@/api/types';

type Tablero = z.infer<typeof TableroKpiSchema>;

const COLOR_BG: Record<string, string> = {
  rojo: 'border-red-500/40 bg-red-500/10',
  verde: 'border-emerald-500/40 bg-emerald-500/10',
  amarillo: 'border-amber-500/40 bg-amber-500/10',
  azul: 'border-blue-500/40 bg-blue-500/10',
  gris: 'border-zinc-500/40 bg-zinc-500/10',
};

export default function TableroKpiCard({ artefacto }: { artefacto: Tablero }) {
  return (
    <article className="rounded-md border border-white/10 bg-white/5 p-3">
      <header className="mb-3">
        {artefacto.titulo ? <h3 className="text-sm font-semibold">{artefacto.titulo}</h3> : null}
        {artefacto.subtitulo ? <p className="text-xs opacity-60">{artefacto.subtitulo}</p> : null}
      </header>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {artefacto.kpis.map((kpi) => {
          if (kpi.bloqueado) {
            return (
              <li
                key={kpi.id}
                className="rounded-md border border-white/10 bg-white/5 p-3 text-xs opacity-60"
                aria-label={`${kpi.etiqueta}: bloqueado`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <IconLock size={12} aria-hidden="true" />
                  <span>{kpi.etiqueta}</span>
                </div>
                <p className="text-[10px] opacity-80">{kpi.mensaje}</p>
              </li>
            );
          }
          const colorClass = kpi.color ? (COLOR_BG[kpi.color] ?? '') : '';
          const deltaColor =
            kpi.delta_tipo === 'positivo'
              ? 'text-emerald-400'
              : kpi.delta_tipo === 'negativo'
                ? 'text-red-400'
                : 'opacity-70';
          return (
            <li
              key={kpi.id}
              className={`rounded-md border ${colorClass || 'border-white/10 bg-white/5'} p-3`}
            >
              <p className="text-xs opacity-70">{kpi.etiqueta}</p>
              <p className="text-lg font-semibold mt-1">{kpi.valor ?? '—'}</p>
              <div className="flex items-center gap-2 mt-1 text-xs">
                {kpi.delta ? <span className={deltaColor}>{kpi.delta}</span> : null}
                {kpi.target ? <span className="opacity-50">vs {kpi.target}</span> : null}
              </div>
              {kpi.descripcion ? (
                <p className="text-[10px] opacity-60 mt-1">{kpi.descripcion}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
