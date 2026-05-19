import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { IconDownload, IconFile, IconLock, IconCheck, IconPlus } from '@tabler/icons-react';
import { descargarReporte, fetchCatalogo, type Reporte } from '@/api/reportes';
import { useCapabilities } from '@/stores/capabilities';
import { auditEvent } from '@/api/audit';

/**
 * Vista del módulo Reportes (handoff §3.6 + Q10 + Q11).
 *
 * - Título dinámico "Reportes Gerencia ${gerencia del usuario}".
 * - Filtro segmentado Todos / Habilitados / No habilitados con contadores.
 * - Tarjetas con id, tipo (operativo/gerencial), nombre, descripción,
 *   formatos (botones por cada uno), dueño, versión.
 * - No habilitados: opacidad reducida + candado + razón.
 * - **Q11**: este es el ÚNICO canal de descarga de datos. Los botones
 *   de formato solo aparecen acá; nunca inline en chat ni en preview.
 * - **Sin reportes ad-hoc** (handoff §3.6). El catálogo es preacordado.
 * - **Sin nombre de proveedor de nube**.
 */

type Filtro = 'todos' | 'habilitados' | 'no_habilitados';

const FORMATO_LABEL: Record<string, string> = {
  xlsx: 'Excel',
  pdf: 'PDF',
  pptx: 'PowerPoint',
  pbi: 'Power BI',
  csv: 'CSV',
};

export default function ReportesPage() {
  const { t } = useTranslation();
  const caps = useCapabilities((s) => s.capabilities);
  const reportesEnabled = caps?.modulos.reportes?.enabled === true;
  const gerencia = caps?.usuario.gerencia ?? '';
  const puedeCrear = caps?.usuario.permisos?.includes('crear_reporte') ?? false;
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const query = useQuery({
    queryKey: ['reportes', 'catalogo'],
    queryFn: () => fetchCatalogo(),
    enabled: reportesEnabled,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  const contadores = useMemo(
    () => ({
      todos: items.length,
      habilitados: items.filter((r) => r.habilitado_para_usuario).length,
      no_habilitados: items.filter((r) => !r.habilitado_para_usuario).length,
    }),
    [items],
  );

  const visibles = useMemo(() => {
    if (filtro === 'habilitados') return items.filter((r) => r.habilitado_para_usuario);
    if (filtro === 'no_habilitados') return items.filter((r) => !r.habilitado_para_usuario);
    return items;
  }, [items, filtro]);

  if (!reportesEnabled) {
    return (
      <section className="p-6">
        <h2 className="font-display text-lg font-semibold">{t('nav.reportes')}</h2>
        <p className="text-sm text-ink2 mt-2">
          El módulo de Reportes no está habilitado en este deployment.
        </p>
      </section>
    );
  }

  return (
    <section className="p-6 max-w-5xl">
      <header className="mb-4">
        <h2 className="font-display text-xl font-semibold">
          {gerencia ? `${t('nav.reportes')} Gerencia ${gerencia}` : t('nav.reportes')}
        </h2>
        <p className="text-sm text-ink2 mt-1">Catálogo de reportes pre acordados.</p>
      </header>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FiltroSegmentado filtro={filtro} setFiltro={setFiltro} contadores={contadores} />
        {puedeCrear ? (
          <Link
            to="/reportes/crear"
            className="h-9 inline-flex items-center gap-2 px-3 rounded-md bg-coral text-paper text-[12.5px] font-medium tracking-tight hover:opacity-90 transition-opacity"
          >
            <IconPlus size={13} stroke={2} aria-hidden="true" />
            Crear reporte
          </Link>
        ) : null}
      </div>

      {query.isLoading ? (
        <p className="opacity-60 text-sm">{t('comun.cargando')}</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-coral">
          {String(query.error)}
        </p>
      ) : visibles.length === 0 ? (
        <p className="opacity-60 text-sm">No hay reportes en esta categoría.</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {visibles.map((item) => (
            <ReporteCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FiltroSegmentado({
  filtro,
  setFiltro,
  contadores,
}: {
  filtro: Filtro;
  setFiltro: (f: Filtro) => void;
  contadores: { todos: number; habilitados: number; no_habilitados: number };
}) {
  const opciones: Array<{ id: Filtro; label: string; count: number }> = [
    { id: 'todos', label: 'Todos', count: contadores.todos },
    { id: 'habilitados', label: 'Habilitados', count: contadores.habilitados },
    { id: 'no_habilitados', label: 'No habilitados', count: contadores.no_habilitados },
  ];
  return (
    <div role="tablist" aria-label="Filtro de reportes" className="inline-flex gap-1 mt-3">
      {opciones.map((o) => {
        const active = filtro === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setFiltro(o.id)}
            className={[
              'h-8 px-3 rounded-md text-[12px] tracking-tight inline-flex items-center gap-2',
              active
                ? 'bg-navy text-cream'
                : 'bg-paper border border-rule text-ink2 hover:border-navy/40 hover:text-ink',
            ].join(' ')}
          >
            <span>{o.label}</span>
            <span
              className={[
                'font-mono text-[10px] tabular-nums rounded-full px-1.5 min-w-[16px] text-center',
                active ? 'bg-cream/20 text-cream' : 'bg-cream text-ink2',
              ].join(' ')}
            >
              {o.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ReporteCard({ item }: { item: Reporte }) {
  const { t } = useTranslation();
  const habilitado = item.habilitado_para_usuario;

  const descargar = useMutation({
    mutationFn: async (formato: string) => {
      const { blob, filename } = await descargarReporte(item.id, formato);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      void auditEvent({
        evento: 'reporte_descargado',
        recurso: item.id,
        metadata: { formato },
      });
    },
  });

  return (
    <li
      className={[
        'rounded-md border bg-paper p-3 flex flex-col gap-2',
        habilitado ? 'border-rule' : 'border-rule opacity-70',
      ].join(' ')}
    >
      <header className="flex items-start gap-3">
        <IconFile size={20} className="text-ink3 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-mono text-ink3 uppercase tracking-wider">{item.id}</p>
            {item.tipo ? (
              <span
                className={[
                  'text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5',
                  item.tipo === 'gerencial' ? 'bg-coral/10 text-coral' : 'bg-ok/10 text-ok',
                ].join(' ')}
              >
                {item.tipo}
              </span>
            ) : null}
          </div>
          <h3 className="text-sm font-medium text-ink tracking-tight mt-0.5 truncate">
            {item.nombre}
          </h3>
          {item.descripcion ? (
            <p className="text-[12px] text-ink2 mt-1">{item.descripcion}</p>
          ) : null}
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-2 text-[11px] mt-1">
        {item.duenio ? (
          <div>
            <dt className="text-ink3">Dueño</dt>
            <dd className="text-ink truncate">{item.duenio}</dd>
          </div>
        ) : null}
        {item.version_actual ? (
          <div>
            <dt className="text-ink3">Versión</dt>
            <dd className="text-ink font-mono">{item.version_actual}</dd>
          </div>
        ) : null}
        {item.gerencia ? (
          <div>
            <dt className="text-ink3">Gerencia</dt>
            <dd className="text-ink truncate">{item.gerencia}</dd>
          </div>
        ) : null}
      </dl>

      {habilitado ? (
        <footer className="flex flex-wrap items-center gap-1.5 mt-1 pt-2 border-t border-rule/60">
          <span className="text-[10px] uppercase tracking-wider text-ink3 mr-1">
            {t('comun.descargar')}:
          </span>
          {item.formatos.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => descargar.mutate(f)}
              disabled={descargar.isPending}
              className="h-7 px-2 rounded-md bg-coral text-paper text-[11px] font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
            >
              <IconDownload size={12} aria-hidden="true" />
              {FORMATO_LABEL[f] ?? f}
            </button>
          ))}
        </footer>
      ) : (
        <footer className="mt-1 pt-2 border-t border-rule/60 flex items-center gap-1.5">
          <IconLock size={12} className="text-ink3" aria-hidden="true" />
          <span className="text-[11px] text-ink3">
            {item.razon_bloqueo ?? 'No habilitado para tu rol.'}
          </span>
        </footer>
      )}

      {descargar.isSuccess ? (
        <p role="status" className="text-[11px] text-ok inline-flex items-center gap-1">
          <IconCheck size={12} aria-hidden="true" />
          Descargado · registrado en audit log.
        </p>
      ) : null}
      {descargar.isError ? (
        <p role="alert" className="text-[11px] text-coral">
          {descargar.error instanceof Error ? descargar.error.message : 'Error al descargar'}
        </p>
      ) : null}
    </li>
  );
}
