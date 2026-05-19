import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { IconPlus, IconBolt } from '@tabler/icons-react';
import { fetchCounts, fetchInbox, type Reporte } from '@/api/reportes';
import { useCapabilities } from '@/stores/capabilities';

/**
 * Bandeja contextual de Reportes (US-02 del handoff M3).
 *
 * - Una sola bandeja con 4 tabs por estado (handoff §4.US-02):
 *   Borradores · En validación · Esperando aprobación · Iterando.
 * - Cada item lleva indicador "Te toca" si la acción siguiente
 *   corresponde al usuario activo.
 * - Polling de 30s configurable vía
 *   `capabilities.modulos.reportes.inbox.refresh_interval_seconds`
 *   (tipado en `ModuloReportesConfigSchema`, PR 5 cleanup).
 * - Bridge "+ Crear reporte" idéntico al del catálogo, condicional
 *   por el permiso `crear_reporte`.
 */

type TabId = 'borradores' | 'validacion' | 'aprobacion' | 'iterando';

const TAB_STATES: Record<TabId, string[]> = {
  // Borradores agrupa los dos estados pre-validación dueño-del-creador
  // para que el item no desaparezca cuando el backend lo mueve a
  // `esperando_datos` (refresh pendiente).
  borradores: ['borrador', 'esperando_datos'],
  validacion: ['esperando_validacion'],
  aprobacion: ['esperando_aprobacion'],
  iterando: ['iterando'],
};

const TAB_LABELS: Record<TabId, string> = {
  borradores: 'Borradores',
  validacion: 'En validación',
  aprobacion: 'Esperando aprobación',
  iterando: 'Iterando',
};

const ORDER: TabId[] = ['borradores', 'validacion', 'aprobacion', 'iterando'];

const DEFAULT_REFRESH_SECONDS = 30;

function tabFromState(state: string | undefined): TabId | null {
  if (!state) return null;
  for (const tab of ORDER) {
    if (TAB_STATES[tab].includes(state)) return tab;
  }
  return null;
}

export default function ReporteInboxPage() {
  const caps = useCapabilities((s) => s.capabilities);
  const reportesEnabled = caps?.modulos.reportes?.enabled === true;
  const gerencia = caps?.usuario.gerencia ?? '';
  const userId = caps?.usuario.id_pseudo;
  const userPerms = useMemo(() => caps?.usuario.permisos ?? [], [caps]);
  const puedeCrear = userPerms.includes('crear_reporte');
  const refetchInterval =
    (caps?.modulos.reportes?.inbox?.refresh_interval_seconds ?? DEFAULT_REFRESH_SECONDS) *
    1000;

  const [activeTab, setActiveTab] = useState<TabId>('borradores');

  const inbox = useQuery({
    queryKey: ['reportes', 'inbox'],
    queryFn: () => fetchInbox(),
    enabled: reportesEnabled,
    refetchInterval,
  });

  const counts = useQuery({
    queryKey: ['reportes', 'inbox', 'counts'],
    queryFn: () => fetchCounts(),
    enabled: reportesEnabled,
    refetchInterval,
  });

  const items = useMemo(() => inbox.data?.items ?? [], [inbox.data]);

  // Filtrado client-side por tab activa. El backend devuelve la lista
  // completa del usuario; agrupar dos estados en una tab requiere
  // filtrar acá.
  const visibles = useMemo(
    () => items.filter((r) => tabFromState(r.state) === activeTab),
    [items, activeTab],
  );

  const countsByTab = useMemo((): Record<TabId, number> => {
    const by = counts.data?.by_state ?? {};
    return {
      borradores: (by.borrador ?? 0) + (by.esperando_datos ?? 0),
      validacion: by.esperando_validacion ?? 0,
      aprobacion: by.esperando_aprobacion ?? 0,
      iterando: by.iterando ?? 0,
    };
  }, [counts.data]);

  if (!reportesEnabled) {
    return (
      <section className="p-6">
        <h2 className="font-display text-lg font-semibold">Bandeja de reportes</h2>
        <p className="text-sm text-ink2 mt-2">
          El módulo de Reportes no está habilitado en este deployment.
        </p>
      </section>
    );
  }

  return (
    <section className="p-6 max-w-5xl">
      <header className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-semibold">
            {gerencia ? `Bandeja Gerencia ${gerencia}` : 'Bandeja de reportes'}
          </h2>
          <p className="text-sm text-ink2 mt-1">Seguimiento de reportes por estado.</p>
        </div>
        {puedeCrear ? (
          <Link
            to="/reportes/crear"
            className="h-9 inline-flex items-center gap-2 px-3 rounded-md bg-coral text-paper text-[12.5px] font-medium tracking-tight hover:opacity-90 transition-opacity"
          >
            <IconPlus size={13} stroke={2} aria-hidden="true" />
            Crear reporte
          </Link>
        ) : null}
      </header>

      <CountersStrip
        actionRequired={counts.data?.action_required ?? 0}
        countsByTab={countsByTab}
      />

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} countsByTab={countsByTab} />

      {inbox.isLoading ? (
        <p className="opacity-60 text-sm mt-4">Cargando bandeja…</p>
      ) : inbox.isError ? (
        <p role="alert" className="text-sm text-coral mt-4">
          {String(inbox.error)}
        </p>
      ) : visibles.length === 0 ? (
        <p className="opacity-60 text-sm mt-4">Sin reportes en esta categoría.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 mt-4">
          {visibles.map((item) => (
            <InboxItem
              key={item.id}
              item={item}
              userId={userId}
              userPerms={userPerms}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CountersStrip({
  actionRequired,
  countsByTab,
}: {
  actionRequired: number;
  countsByTab: Record<TabId, number>;
}) {
  const cells: Array<{ label: string; value: number; urgent?: boolean }> = [
    { label: 'Te tocan', value: actionRequired, urgent: actionRequired > 0 },
    { label: 'Borradores', value: countsByTab.borradores },
    { label: 'En validación', value: countsByTab.validacion },
    { label: 'Esperando aprob.', value: countsByTab.aprobacion },
    { label: 'Iterando', value: countsByTab.iterando },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3" aria-label="Resumen de bandeja">
      {cells.map((c) => (
        <div
          key={c.label}
          className={[
            'rounded-md border p-3 bg-paper',
            c.urgent ? 'border-coral/50' : 'border-rule',
          ].join(' ')}
        >
          <p className="text-[10px] uppercase tracking-wider text-ink3">{c.label}</p>
          <p
            className={[
              'font-mono tabular-nums text-lg font-medium mt-0.5',
              c.urgent ? 'text-coral' : 'text-ink',
            ].join(' ')}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function Tabs({
  activeTab,
  setActiveTab,
  countsByTab,
}: {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
  countsByTab: Record<TabId, number>;
}) {
  return (
    <div role="tablist" aria-label="Filtro por estado" className="inline-flex gap-1 mt-4 flex-wrap">
      {ORDER.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActiveTab(tab)}
            className={[
              'h-8 px-3 rounded-md text-[12px] tracking-tight inline-flex items-center gap-2',
              active
                ? 'bg-navy text-cream'
                : 'bg-paper border border-rule text-ink2 hover:border-navy/40 hover:text-ink',
            ].join(' ')}
          >
            <span>{TAB_LABELS[tab]}</span>
            <span
              className={[
                'font-mono text-[10px] tabular-nums rounded-full px-1.5 min-w-[16px] text-center',
                active ? 'bg-cream/20 text-cream' : 'bg-cream text-ink2',
              ].join(' ')}
            >
              {countsByTab[tab]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Decide si "Te toca" aplica al usuario activo para un item dado.
 * - Prioridad: `next_action_for === id_pseudo` (truth del backend).
 * - Fallback: derivación por estado + permisos cuando no hay
 *   `next_action_for` (compatible con responses anteriores del central).
 */
function teTocaParaUsuario(
  item: Reporte,
  userId: string | undefined,
  userPerms: string[],
): boolean {
  if (item.next_action_for && userId) {
    return item.next_action_for === userId;
  }
  // Fallback por estado + permisos:
  const state = item.state;
  if (!state) return false;
  if (state === 'esperando_validacion') return userPerms.includes('validar_reporte');
  if (state === 'esperando_aprobacion') return userPerms.includes('aprobar_reporte');
  if (state === 'borrador' || state === 'esperando_datos' || state === 'iterando') {
    if (!userPerms.includes('crear_reporte')) return false;
    if (item.creator_id && userId) return item.creator_id === userId;
    return true;
  }
  return false;
}

function InboxItem({
  item,
  userId,
  userPerms,
}: {
  item: Reporte;
  userId: string | undefined;
  userPerms: string[];
}) {
  const teToca = teTocaParaUsuario(item, userId, userPerms);
  return (
    <li>
      <Link
        to={`/reportes/${encodeURIComponent(item.id)}`}
        className={[
          'block rounded-md border bg-paper p-3 hover:border-navy/40 transition-colors',
          teToca ? 'border-coral/50' : 'border-rule',
        ].join(' ')}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-ink3 uppercase tracking-wider">
            {item.id}
          </span>
          {item.state ? <StateBadge state={item.state} /> : null}
          {item.urgent ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 bg-coral/10 text-coral">
              <IconBolt size={10} aria-hidden="true" />
              urgente
            </span>
          ) : null}
          {teToca ? (
            <span className="text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 bg-coral text-paper">
              Te toca
            </span>
          ) : null}
        </div>
        <p className="text-sm font-medium text-ink tracking-tight mt-1 truncate">
          {item.titulo ?? item.nombre}
        </p>
        {item.descripcion ? (
          <p className="text-[12px] text-ink2 mt-0.5 line-clamp-1">{item.descripcion}</p>
        ) : item.next_action_label ? (
          <p className="text-[12px] text-ink2 mt-0.5">{item.next_action_label}</p>
        ) : null}
      </Link>
    </li>
  );
}

const STATE_LABELS: Record<string, string> = {
  borrador: 'borrador',
  esperando_datos: 'esperando datos',
  esperando_validacion: 'en validación',
  iterando: 'iterando',
  esperando_aprobacion: 'esperando aprob.',
  aprobado: 'aprobado',
  publicado: 'publicado',
  cerrado: 'cerrado',
};

function StateBadge({ state }: { state: string }) {
  const label = STATE_LABELS[state] ?? state;
  return (
    <span className="text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 bg-cream text-ink2">
      {label}
    </span>
  );
}
