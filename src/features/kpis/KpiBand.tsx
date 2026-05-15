import { useMemo, useState } from 'react';
import { IconChevronDown, IconChevronRight, IconX } from '@tabler/icons-react';
import { useCapabilities } from '@/stores/capabilities';
import { useKpis } from '@/stores/kpis';
import { useUiToggles } from '@/stores/uiToggles';
import type { KpiConfigurado } from '@/api/types';
import MiniLine from './charts/MiniLine';
import MiniBar from './charts/MiniBar';
import MiniGauge from './charts/MiniGauge';
import MiniProgress from './charts/MiniProgress';

/**
 * KpiBand inline (handoff §3.5). Banda colapsable sobre el chat con
 * los 5 KPIs configurados del usuario:
 *
 *  - Fondo cream-band para diferenciarse del paper del body.
 *  - Cada KPI: dot de severidad, label, número grande coloreado,
 *    chevron. Click expande inline con detalle + chart + 3 stats.
 *  - Múltiples KPIs expandidos simultáneamente.
 *  - Datos: capabilities.usuario.kpis_configurados (snapshot inicial)
 *    + overrides en vivo de useKpis (Q3 · comparten store con el
 *    dashboard /on-line, distinto layout).
 *  - Visibilidad controlada por useUiToggles.kpiBandOpen (toggle
 *    "KPI" de la TopBar). Inicia OFF (handoff §3.1 "pantalla limpia").
 *  - El botón ✕ a la derecha sincroniza con el toggle de TopBar.
 */
export default function KpiBand() {
  const open = useUiToggles((s) => s.kpiBandOpen);
  const setOpen = useUiToggles((s) => s.setKpiBand);
  const configurados = useCapabilities((s) => s.capabilities?.usuario.kpis_configurados ?? []);
  const liveValues = useKpis((s) => s.values);
  const kpisEnabled = useCapabilities((s) => s.capabilities?.modulos.kpis?.enabled === true);

  // Mergeamos snapshot con SSE: si hay valor live, override.
  const kpis = useMemo<KpiConfigurado[]>(() => {
    return configurados.map((k) => {
      const live = liveValues[k.id];
      return live ? { ...k, value: live.valor } : k;
    });
  }, [configurados, liveValues]);

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  function toggleExpanded(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!open || !kpisEnabled || kpis.length === 0) return null;

  return (
    <section aria-label="Banda de KPIs" className="bg-cream-band border-b border-rule">
      <ul className="flex flex-wrap items-stretch gap-x-4 px-4 py-2">
        {kpis.map((k) => (
          <KpiTile
            key={k.id}
            kpi={k}
            expanded={expandidos.has(k.id)}
            onToggle={() => toggleExpanded(k.id)}
          />
        ))}
        <li className="ml-auto self-start flex items-center">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar banda de KPIs"
            title="Cerrar"
            className="min-w-[28px] min-h-[28px] grid place-items-center rounded text-ink3 hover:text-ink hover:bg-paper/60"
          >
            <IconX size={14} aria-hidden="true" />
          </button>
        </li>
      </ul>
      {expandidos.size > 0 ? (
        <div className="border-t border-rule/60 bg-paper/40 px-4 py-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {kpis
            .filter((k) => expandidos.has(k.id))
            .map((k) => (
              <KpiExpandedDetail
                key={`detail-${k.id}`}
                kpi={k}
                onClose={() => toggleExpanded(k.id)}
              />
            ))}
        </div>
      ) : null}
    </section>
  );
}

const DOT_COLOR: Record<NonNullable<KpiConfigurado['severity']>, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  bad: 'bg-coral',
};

const VALUE_COLOR: Record<NonNullable<KpiConfigurado['severity']>, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-coral',
};

function KpiTile({
  kpi,
  expanded,
  onToggle,
}: {
  kpi: KpiConfigurado;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sev = kpi.severity ?? 'ok';
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={expanded}
        aria-label={`${kpi.label} ${String(kpi.value ?? '')}`}
        className="flex items-center gap-2 py-1 px-1 rounded hover:bg-paper/60 min-h-[40px]"
      >
        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[sev]}`} />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[10px] uppercase tracking-wider text-ink3">{kpi.label}</span>
          <span className={`font-display text-lg font-semibold ${VALUE_COLOR[sev]}`}>
            {kpi.value ?? '—'}
          </span>
        </span>
        {expanded ? (
          <IconChevronDown size={12} className="text-ink3" aria-hidden="true" />
        ) : (
          <IconChevronRight size={12} className="text-ink3" aria-hidden="true" />
        )}
      </button>
    </li>
  );
}

function KpiExpandedDetail({ kpi, onClose }: { kpi: KpiConfigurado; onClose: () => void }) {
  const sev = kpi.severity ?? 'ok';
  return (
    <article className="rounded-md border border-rule bg-paper p-3 flex flex-col gap-2">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-ink3">{kpi.label}</p>
          <p className={`font-display text-xl font-semibold ${VALUE_COLOR[sev]}`}>
            {kpi.value ?? '—'}
          </p>
          {kpi.subtitle ? <p className="text-[11px] text-ink2 mt-0.5">{kpi.subtitle}</p> : null}
          {kpi.delta ? <p className="text-[11px] text-ink3 mt-0.5">{kpi.delta}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Cerrar ${kpi.label}`}
          className="min-w-[24px] min-h-[24px] grid place-items-center rounded text-ink3 hover:text-ink"
        >
          <IconX size={12} aria-hidden="true" />
        </button>
      </header>

      <ChartFor kpi={kpi} />

      {kpi.stats && kpi.stats.length > 0 ? (
        <dl className="grid grid-cols-3 gap-2 mt-1 text-[11px]">
          {kpi.stats.map(([label, valor], i) => (
            <div key={`${label}-${i}`}>
              <dt className="text-ink3 truncate">{label}</dt>
              <dd className="text-ink font-mono truncate">{valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

function ChartFor({ kpi }: { kpi: KpiConfigurado }) {
  if (kpi.chart === 'line' && kpi.series && kpi.series.length > 0) {
    return <MiniLine series={kpi.series} target={kpi.target} />;
  }
  if (kpi.chart === 'bar' && kpi.bars && kpi.bars.length > 0) {
    return <MiniBar bars={kpi.bars} />;
  }
  if (
    kpi.chart === 'gauge' &&
    kpi.gaugeValue !== undefined &&
    kpi.gaugeMin !== undefined &&
    kpi.gaugeMax !== undefined &&
    kpi.gaugeTarget !== undefined
  ) {
    return (
      <MiniGauge
        valor={kpi.gaugeValue}
        min={kpi.gaugeMin}
        max={kpi.gaugeMax}
        target={kpi.gaugeTarget}
      />
    );
  }
  if (kpi.chart === 'progress' && kpi.progress) {
    return <MiniProgress valor={kpi.progress.value} target={kpi.progress.target} />;
  }
  return null;
}
