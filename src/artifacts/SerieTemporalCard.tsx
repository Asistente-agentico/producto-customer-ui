import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';
import type { z } from 'zod';
import type { SerieTemporalSchema } from '@/api/types';
import { useMutation } from '@tanstack/react-query';
import { refrescarGraficoVentana } from '@/api/conversaciones';

type SerieTemporal = z.infer<typeof SerieTemporalSchema>;

type Props = {
  artefacto: SerieTemporal;
  conversacionId?: string;
  mensajeId?: string;
};

export default function SerieTemporalCard({ artefacto, conversacionId, mensajeId }: Props) {
  const [current, setCurrent] = useState<SerieTemporal>(artefacto);

  const mutation = useMutation({
    mutationFn: (ventana: string) => {
      if (!conversacionId || !mensajeId) {
        throw new Error('missing_context_for_refresh');
      }
      return refrescarGraficoVentana({ conversacionId, mensajeId, ventana });
    },
    onSuccess: (resp) => {
      const fresh = resp.artefactos.find((a): a is SerieTemporal => a.tipo === 'serie_temporal');
      if (fresh) setCurrent(fresh);
    },
  });

  const datos = current.puntos.map((p) => ({ x: String(p.x), y: p.y }));

  return (
    <article className="rounded-md border border-white/10 bg-white/5 p-3">
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{current.titulo}</h3>
          {current.subtitulo ? (
            <p className="text-xs opacity-60 truncate">{current.subtitulo}</p>
          ) : null}
        </div>
        {current.ventanas_disponibles && current.ventanas_disponibles.length > 0 ? (
          <div
            className="flex items-center gap-1 shrink-0"
            role="group"
            aria-label="Ventana de tiempo"
          >
            {current.ventanas_disponibles.map((v) => {
              const active = v === current.ventana_actual;
              return (
                <button
                  key={v}
                  type="button"
                  disabled={mutation.isPending || !conversacionId || !mensajeId}
                  onClick={() => mutation.mutate(v)}
                  className={[
                    'px-2 py-1 rounded text-xs',
                    active ? 'bg-white/20 font-medium' : 'bg-white/5 hover:bg-white/10',
                    'disabled:opacity-50',
                  ].join(' ')}
                  aria-pressed={active}
                >
                  {v}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>

      <div className="h-56" aria-label={`Gráfico: ${current.titulo}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="x" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0,0,0,0.85)',
                border: 'none',
                fontSize: 12,
              }}
            />
            {current.rango_objetivo_y ? (
              <ReferenceArea
                y1={current.rango_objetivo_y.y_min}
                y2={current.rango_objetivo_y.y_max}
                fill="rgba(34,197,94,0.12)"
                stroke="none"
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="y"
              stroke="var(--color-accent)"
              dot={{ r: 3 }}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla accesible bajo el gráfico (sección 15.4) */}
      <details className="mt-2">
        <summary className="text-xs opacity-70 cursor-pointer">Ver datos</summary>
        <table className="mt-2 text-xs w-full">
          <thead>
            <tr className="opacity-60">
              <th scope="col" className="text-left font-normal">
                Fecha
              </th>
              <th scope="col" className="text-right font-normal">
                Valor{current.unidad_y ? ` (${current.unidad_y})` : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {datos.map((d, i) => (
              <tr key={`${d.x}-${i}`}>
                <td className="font-mono">{d.x}</td>
                <td className="text-right font-mono">{d.y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      {current.metricas_resumen ? (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
          {Object.entries(current.metricas_resumen).map(([key, m]) => (
            <div key={key} className="rounded bg-white/5 p-2">
              <dt className="opacity-60">{m.etiqueta}</dt>
              <dd className="font-mono">
                {m.valor}
                {m.unidad ? <span className="opacity-60 ml-1">{m.unidad}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}
