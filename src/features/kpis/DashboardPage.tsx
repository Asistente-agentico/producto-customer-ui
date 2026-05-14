import { useTranslation } from 'react-i18next';
import { lazy, Suspense, useMemo } from 'react';
import { useKpiStream } from './useKpiStream';
import { useKpis } from '@/stores/kpis';
import { useCapabilities } from '@/stores/capabilities';
import type { Artefacto } from '@/api/types';

const TableroKpiCard = lazy(() => import('@/artifacts/TableroKpiCard'));

const COLORES: Record<string, 'verde' | 'amarillo' | 'rojo' | 'azul' | 'gris'> = {
  biomasa_total: 'verde',
  mortalidad: 'amarillo',
  fcr_promedio: 'verde',
};

const ETIQUETAS: Record<string, string> = {
  biomasa_total: 'Biomasa total',
  mortalidad: 'Mortalidad',
  fcr_promedio: 'FCR promedio',
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const caps = useCapabilities((s) => s.capabilities);
  const values = useKpis((s) => s.values);
  const connected = useKpis((s) => s.connected);
  const { announce } = useKpiStream();

  const kpisEnabled = caps?.modulos.kpis?.enabled === true;

  const tablero = useMemo<Artefacto>(() => {
    const kpis = Object.entries(values).map(([id, snap]) => ({
      id,
      etiqueta: ETIQUETAS[id] ?? id,
      valor: snap.valor,
      color: COLORES[id],
    }));
    return {
      tipo: 'tablero_kpi',
      version: 1,
      titulo: 'KPIs en vivo',
      subtitulo: connected ? 'Stream activo' : 'Conectando...',
      kpis,
    };
  }, [values, connected]);

  if (!kpisEnabled) {
    return (
      <section className="p-6">
        <h2 className="text-lg font-semibold">{t('nav.dashboard')}</h2>
        <p className="opacity-70 text-sm mt-2">
          El módulo de KPIs no está habilitado en este deployment.
        </p>
      </section>
    );
  }

  return (
    <section className="p-6 max-w-5xl">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">{t('nav.dashboard')}</h2>
        <p className="text-xs opacity-60">
          <span
            className={`inline-block w-2 h-2 rounded-full mr-1 ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`}
            aria-hidden="true"
          />
          {connected ? 'Conectado al stream SSE' : 'Conectando o desconectado'}
        </p>
      </header>

      <Suspense
        fallback={<div className="h-32 bg-white/5 rounded animate-pulse" aria-hidden="true" />}
      >
        {Object.keys(values).length === 0 ? (
          <p className="text-sm opacity-60">Esperando primeros valores...</p>
        ) : (
          <TableroKpiCard
            artefacto={
              tablero.tipo === 'tablero_kpi'
                ? tablero
                : { tipo: 'tablero_kpi', version: 1, kpis: [] }
            }
          />
        )}
      </Suspense>

      {/* Región aria-live throttleada (≤1 anuncio cada 30s) */}
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </section>
  );
}
