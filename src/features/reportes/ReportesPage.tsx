import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { IconDownload, IconFile } from '@tabler/icons-react';
import { descargarReporte, fetchCatalogo, type Reporte } from '@/api/reportes';
import { useCapabilities } from '@/stores/capabilities';
import { auditEvent } from '@/api/audit';

export default function ReportesPage() {
  const { t } = useTranslation();
  const caps = useCapabilities((s) => s.capabilities);
  const reportesEnabled = caps?.modulos.reportes?.enabled === true;

  const query = useQuery({
    queryKey: ['reportes', 'catalogo'],
    queryFn: () => fetchCatalogo(),
    enabled: reportesEnabled,
  });

  const descargar = useMutation({
    mutationFn: async (item: Reporte) => {
      const { blob, filename } = await descargarReporte(item.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      void auditEvent({
        evento: 'reporte_descargado',
        recurso: item.id,
        metadata: { formato: item.formato },
      });
    },
  });

  if (!reportesEnabled) {
    return (
      <section className="p-6">
        <h2 className="text-lg font-semibold">{t('nav.reportes')}</h2>
        <p className="opacity-70 text-sm mt-2">
          El módulo de reportes no está habilitado en este deployment.
        </p>
      </section>
    );
  }

  const items = query.data?.items ?? [];

  return (
    <section className="p-6 max-w-3xl">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">{t('nav.reportes')}</h2>
        <p className="text-sm opacity-70">Catálogo filtrado por tus permisos.</p>
      </header>

      {query.isLoading ? (
        <p className="opacity-60 text-sm">{t('comun.cargando')}</p>
      ) : query.isError ? (
        <p role="alert" className="text-sm text-red-400">
          {String(query.error)}
        </p>
      ) : items.length === 0 ? (
        <p className="opacity-60 text-sm">Sin reportes disponibles.</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-white/10 bg-white/5 p-3 flex items-center gap-3"
            >
              <IconFile size={20} className="opacity-60 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.nombre}</p>
                {item.descripcion ? <p className="text-xs opacity-60">{item.descripcion}</p> : null}
                <p className="text-[10px] opacity-50 uppercase mt-1">
                  {item.formato}
                  {item.actualizado_en ? ` · ${item.actualizado_en.slice(0, 10)}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => descargar.mutate(item)}
                disabled={descargar.isPending}
                className="text-xs px-3 py-1.5 rounded bg-[var(--color-accent)] text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
              >
                <IconDownload size={14} aria-hidden="true" />
                {descargar.isPending ? t('comun.cargando') : t('comun.descargar')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
