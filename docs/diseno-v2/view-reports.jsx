// View: Reportes catalog — visible para la gerencia del usuario.
// Todos los reportes se listan; solo los habilitados (según rol) son operables.
// Filtro: todos / habilitados / no habilitados.

const { useState: useStateR } = React;

const REPORTS_CATALOG = [
  {
    id: 'r1', name: 'Mortalidad diaria · serie 14d',
    desc: 'Mortalidad por centro y jaula, ventana móvil 14 días, con bandas de zona objetivo.',
    fmt: ['xlsx', 'pdf', 'pptx'],
    owner: 'Camila Soto',
    version: 'v2.1',
    tipo: 'operativo',
    enabled: true,
  },
  {
    id: 'r2', name: 'FCR comparativo Q1',
    desc: 'Factor de conversión por centro vs benchmark del cluster, agrupado por semana.',
    fmt: ['xlsx', 'pdf'],
    owner: 'Diego Fernández',
    version: 'v1.4',
    tipo: 'operativo',
    enabled: true,
  },
  {
    id: 'r3', name: 'Cosecha proyectada · escenarios',
    desc: 'Proyección de tonelaje a cosecha con escenarios pesimista/base/optimista.',
    fmt: ['xlsx', 'pptx', 'pbi'],
    owner: 'Pamela Riquelme',
    version: 'v1.0',
    tipo: 'operativo',
    enabled: true,
  },
  {
    id: 'r4', name: 'Resumen ejecutivo mensual',
    desc: 'Vista de una página con biomasa, FCR, mortalidad, costos y SLA por gerencia.',
    fmt: ['pdf', 'pptx', 'pbi'],
    owner: 'Juan Pérez',
    version: 'v3.2',
    tipo: 'gerencial',
    enabled: false,
    razonNoHabilitado: 'rol Gerencia',
  },
  {
    id: 'r5', name: 'Calidad de agua · O₂ + temperatura',
    desc: 'Series ambientales por centro con detección de cruces de umbral.',
    fmt: ['xlsx', 'pdf'],
    owner: 'Camila Soto',
    version: 'v1.7',
    tipo: 'operativo',
    enabled: true,
  },
  {
    id: 'r6', name: 'Incidentes y acciones tomadas',
    desc: 'Inventario de acciones del módulo Acciones, con aprobador y tiempo de respuesta.',
    fmt: ['xlsx', 'pdf'],
    owner: 'Juan Pérez',
    version: 'v2.0',
    tipo: 'gerencial',
    enabled: false,
    razonNoHabilitado: 'rol Gerencia',
  },
  {
    id: 'r7', name: 'Costos operacionales por centro',
    desc: 'Desglose de OPEX por línea de gasto, comparado contra presupuesto mensual.',
    fmt: ['xlsx', 'pdf', 'pbi'],
    owner: 'Sebastián Valle',
    version: 'v1.1',
    tipo: 'gerencial',
    enabled: false,
    razonNoHabilitado: 'rol Finanzas',
  },
];

const FMT_META = {
  xlsx: ['xls', 'text-[#0a6e3a]', 'bg-[#0a6e3a]/10'],
  pdf:  ['pdf', 'text-[#b8332a]', 'bg-[#b8332a]/10'],
  pptx: ['ppt', 'text-[#c45a1a]', 'bg-[#c45a1a]/10'],
  pbi:  ['pbi', 'text-[#5d4e8c]', 'bg-[#5d4e8c]/10'],
};

const TIPO_META = {
  operativo: ['operativo', 'text-navy bg-navy/[.08]'],
  gerencial: ['gerencial', 'text-[#5d4e8c] bg-[#5d4e8c]/10'],
};

function ReportsCatalogView() {
  const { caps, openPanel } = useApp();
  const [filtro, setFiltro] = useStateR('todos'); // todos | habilitados | no_habilitados

  const filtered = REPORTS_CATALOG.filter((r) => {
    if (filtro === 'todos') return true;
    if (filtro === 'habilitados') return r.enabled;
    if (filtro === 'no_habilitados') return !r.enabled;
    return true;
  });

  const counts = {
    todos: REPORTS_CATALOG.length,
    habilitados: REPORTS_CATALOG.filter((r) => r.enabled).length,
    no_habilitados: REPORTS_CATALOG.filter((r) => !r.enabled).length,
  };

  return (
    <div className="max-w-[1080px] mx-auto px-8 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="font-display text-[32px] tracking-tight">
            Reportes Gerencia {caps.usuario.gerencia}
          </h1>
          <p className="text-[13.5px] text-ink2 mt-1">
            Catálogo de reportes pre acordados.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-md bg-white border border-rule">
          <FilterTab active={filtro === 'todos'} onClick={() => setFiltro('todos')}>
            Todos <Count>{counts.todos}</Count>
          </FilterTab>
          <FilterTab active={filtro === 'habilitados'} onClick={() => setFiltro('habilitados')}>
            Habilitados <Count tone="ok">{counts.habilitados}</Count>
          </FilterTab>
          <FilterTab active={filtro === 'no_habilitados'} onClick={() => setFiltro('no_habilitados')}>
            No habilitados <Count tone="muted">{counts.no_habilitados}</Count>
          </FilterTab>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((r, i) => (
          <ReportCard key={r.id} r={r} delay={i * .04} onPreview={() => openPanel('report-preview')} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 mono-label text-ink3">
          No hay reportes en esta categoría
        </div>
      )}
    </div>
  );
}

function FilterTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 px-3 py-1 rounded text-[12px] tracking-tight transition-colors',
        active ? 'bg-navy text-cream' : 'text-ink2 hover:bg-rule/60',
      ].join(' ')}>
      {children}
    </button>
  );
}

function Count({ children, tone }) {
  const c = tone === 'ok'     ? 'text-ok bg-ok/15'
          : tone === 'muted'  ? 'text-ink3 bg-rule/60'
          : 'text-cream/70 bg-cream/15';
  return (
    <span className={`font-mono text-[10px] tabular-nums rounded-sm px-1 ${c}`}>{children}</span>
  );
}

function ReportCard({ r, delay, onPreview }) {
  const [tipoLabel, tipoCls] = TIPO_META[r.tipo] || TIPO_META.operativo;
  const enabled = r.enabled;

  return (
    <article
      className={[
        'rise rounded-lg border bg-white p-4 flex flex-col transition-opacity',
        enabled ? 'border-rule' : 'border-rule opacity-65',
      ].join(' ')}
      style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono-label text-ink3">{r.id}</span>
            <span className={`mono-label rounded-sm px-1.5 py-0.5 normal-case tracking-wide ${tipoCls}`}>
              {tipoLabel}
            </span>
            {!enabled && (
              <span className="mono-label text-coral bg-coral/10 rounded-sm px-1.5 py-0.5 flex items-center gap-1">
                <I.Lock size={9} /> {r.razonNoHabilitado || 'no habilitado'}
              </span>
            )}
          </div>
          <h3 className="font-display text-[16px] tracking-tight mt-1">{r.name}</h3>
          <p className="text-[12.5px] text-ink2 mt-1 leading-relaxed" style={{ textWrap: 'pretty' }}>
            {r.desc}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {r.fmt.map((f) => {
          const [t, c, b] = FMT_META[f] || ['', '', ''];
          return (
            <span key={f} className={`font-mono text-[9.5px] tracking-wider px-1.5 py-0.5 rounded-sm ${c} ${b}`}>
              {t.toUpperCase()}
            </span>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-rule flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[11px] text-ink2">
            <span><span className="text-ink3">Dueño:</span> {r.owner}</span>
            <span><span className="text-ink3">Versión:</span> <span className="font-mono">{r.version}</span></span>
            <span><span className="text-ink3">Tipo:</span> {r.tipo}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onPreview}
            disabled={!enabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rule bg-white
                       hover:border-navy/40 text-[12px] text-ink2 hover:text-ink transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed">
            <I.Eye size={12} /> Previsualizar
          </button>
          <button
            disabled={!enabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy text-cream
                       hover:bg-navy-3 text-[12px] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed">
            Generar <I.Chevron size={11} />
          </button>
        </div>
      </div>
    </article>
  );
}

window.ReportsCatalogView = ReportsCatalogView;
