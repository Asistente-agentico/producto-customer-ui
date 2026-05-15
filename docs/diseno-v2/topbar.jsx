// TopBar — nueva cabecera con fecha + accesos + módulos + bell + asistente.

const { useEffect, useState, useRef } = React;

function TopBar() {
  return (
    <header className="shrink-0 flex items-center gap-2 px-5 py-2 h-12
                       bg-paper border-b border-rule">
      <DateBlock />
      <UltimaConvBtn />
      <PendientesBtn />
      <KpisBtn />
      <div className="flex-1" />
      <ModulesNav />
      <span className="w-px h-5 bg-rule mx-1" />
      <NotificationsBell />
      <AsistenteBadge />
    </header>
  );
}

// ── Fecha (sin panel) ───────────────────────────────────────────────────────
function DateBlock() {
  const d = new Date(2026, 4, 14);
  const fecha = d.toLocaleDateString('es-CL', {
    weekday: 'short', day: '2-digit', month: 'short',
  });
  return (
    <div className="flex items-center gap-1.5 px-2 text-ink2 text-[12px]">
      <I.Calendar size={12} className="text-ink3" />
      <span className="tracking-tight">{fecha} 2026</span>
    </div>
  );
}

// ── Ver última conversación — toggle on/off puro, sin dropdown ──────────────
// El estado vive en AppContext (ultimaOpen). El chat lee ese flag y muestra
// la conversación de ejemplo solo cuando el botón está en ON.
function UltimaConvBtn() {
  const { ultimaOpen, setUltimaOpen } = useApp();
  return (
    <button
      onClick={() => setUltimaOpen(!ultimaOpen)}
      className={[
        'h-8 flex items-center gap-1.5 px-2.5 rounded-md text-[12px] transition-colors',
        ultimaOpen
          ? 'bg-navy text-cream border border-navy'
          : 'bg-white border border-rule text-ink2 hover:border-navy/40 hover:text-ink',
      ].join(' ')}>
      <I.Clock size={12} className={ultimaOpen ? 'text-cream/85' : 'text-ink3'} />
      <span className="tracking-tight">Última</span>
    </button>
  );
}

// ── Ver pendientes ──────────────────────────────────────────────────────────
const PENDIENTES_DATA = [
  { id: 'p1', tipo: 'borrador',  sev: 'warn', titulo: 'Correo pendiente de envío · Hugo Salinas', sub: 'Borrador listo · esperando confirmación tuya', ts: 'hace 2 min',  mod: 'acciones' },
  { id: 'p2', tipo: 'umbral',    sev: 'warn', titulo: 'O₂ disuelto bajo umbral · CTR-003',         sub: '6.0 mg/L · objetivo ≥ 6.5',                     ts: 'hace 14 min', mod: 'kpis' },
  { id: 'p3', tipo: 'umbral',    sev: 'warn', titulo: 'Mortalidad CTR-007 sobre umbral',           sub: '27 u/d · zona objetivo 8–14',                   ts: 'hace 32 min', mod: 'central' },
];

function PendientesBtn() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { isVisible, setView } = useApp();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visibles = PENDIENTES_DATA.filter((p) => isVisible(p.mod));
  const count = visibles.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          'h-8 flex items-center gap-1.5 px-2.5 rounded-md text-[12px] transition-colors',
          open
            ? 'bg-navy text-cream border border-navy'
            : 'bg-white border border-rule text-ink2 hover:border-navy/40 hover:text-ink',
        ].join(' ')}>
        <I.Audit size={12} className={open ? 'text-cream/85' : 'text-ink3'} />
        <span className="tracking-tight">Pendientes</span>
        {count > 0 && (
          <span className={[
            'font-mono text-[10px] tabular-nums rounded-full px-1.5 min-w-[16px] text-center',
            open ? 'bg-cream/20 text-cream' : 'bg-coral text-cream',
          ].join(' ')}>{count}</span>
        )}
        <I.ChevronDown size={10}
          className={['transition-transform', open ? 'rotate-180' : ''].join(' ')} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] w-[400px] z-30 rise
                        rounded-lg bg-white border border-rule
                        shadow-[0_20px_50px_-20px_rgba(10,37,64,.35)]"
             style={{ animationDuration: '.22s' }}>
          <header className="px-4 py-3 border-b border-rule">
            <div className="font-display text-[15px] tracking-tight">Pendientes</div>
            <div className="mono-label text-ink3 mt-0.5">
              {count} ítems en módulos activos
            </div>
          </header>
          <div className="max-h-[440px] overflow-y-auto scroll-paper divide-y divide-rule/60">
            {visibles.length === 0 ? (
              <div className="px-4 py-8 text-center mono-label text-ink3">
                No hay pendientes
              </div>
            ) : visibles.map((p) => (
              <button key={p.id}
                onClick={() => {
                  if (p.mod === 'acciones') setView('actions');
                  else if (p.mod === 'kpis') setView('kpis');
                  setOpen(false);
                }}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-paper transition-colors">
                <span className={[
                  'shrink-0 w-2 h-2 rounded-full mt-2',
                  p.sev === 'warn' ? 'bg-warn' : 'bg-ok',
                ].join(' ')} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] text-ink tracking-tight truncate font-medium">{p.titulo}</span>
                  <span className="block text-[12px] text-ink2 mt-0.5 truncate">{p.sub}</span>
                  <span className="mono-label text-ink3 normal-case tracking-normal text-[10.5px] mt-1">
                    {p.ts} · {p.mod}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Módulos navegables ──────────────────────────────────────────────────────
// Módulos navegables visibles desde la cabecera del chat.
// Nota: "KPIs" no aparece aquí porque su información se carga en el bootstrap
// y se consume inline (botón KPI + banda). No hay página separada del módulo
// alcanzable desde el chat.
const MODULES_NAV = [
  { id: 'central',  modId: 'central',  nombre: 'Chat',     icon: <I.Sparkle size={12} />, view: 'chat' },
  { id: 'online',   modId: 'kpis',     nombre: 'on-line',  icon: <I.Stream  size={12} />, view: 'kpis' },
  { id: 'ml',       modId: 'ml',       nombre: 'ML',       icon: <I.Brain   size={12} />, view: null },
  { id: 'reportes', modId: 'reportes', nombre: 'Reportes', icon: <I.Doc     size={12} />, view: 'reports-catalog' },
  { id: 'acciones', modId: 'acciones', nombre: 'Acciones', icon: <I.Bolt    size={12} />, view: 'actions' },
];

function ModulesNav() {
  const { isEnabled, setView, view } = useApp();
  return (
    <div className="h-8 flex items-center gap-0.5 px-1 rounded-md
                    bg-white border border-rule">
      {MODULES_NAV.map((m) => {
        const enabled = m.modId === 'central' ? true : isEnabled(m.modId);
        const active  = (m.view === 'chat' && (view === 'chat' || view === 'empty')) ||
                        (m.view && m.view === view);
        return (
          <button
            key={m.id}
            onClick={() => enabled && m.view && setView(m.view)}
            disabled={!enabled || !m.view}
            title={enabled ? `Ir a ${m.nombre}` : `${m.nombre} no habilitado`}
            className={[
              'h-6 flex items-center gap-1.5 px-2 rounded text-[11.5px] transition-colors',
              !enabled
                ? 'text-ink3 cursor-not-allowed'
                : active
                  ? 'bg-ok/15 text-ok'
                  : 'text-ok hover:bg-ok/10',
            ].join(' ')}>
            <span className={enabled ? 'text-ok' : 'text-ink3'}>{m.icon}</span>
            <span className="tracking-tight font-medium">{m.nombre}</span>
            {!enabled && (
              <span className="font-mono text-[8.5px] text-ink3 ml-0.5 normal-case tracking-tight">
                (No habilitado)
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Asistente activo + version ──────────────────────────────────────────────
function AsistenteBadge() {
  const { caps } = useApp();
  return (
    <div className="h-8 flex items-center gap-2 px-2">
      <div className="w-5 h-5 rounded bg-navy/[.08] text-navy flex items-center justify-center shrink-0">
        <I.Fish size={11} stroke={1.8} />
      </div>
      <div className="leading-tight">
        <div className="text-[12px] font-medium tracking-tight text-ink">{caps.asistente_activo.nombre}</div>
        <div className="font-mono text-[9.5px] text-ink3">v2.4.1</div>
      </div>
    </div>
  );
}

// ── Tus KPIs — toggle on/off · solo botón ───────────────────────────────────
function KpisBtn() {
  const { kpiBandOpen, setKpiBandOpen, isEnabled, kpisUsuario } = useApp();
  if (!isEnabled('kpis')) return null;
  const counts = kpisUsuario.reduce((a, k) => { a[k.severity] = (a[k.severity] || 0) + 1; return a; }, {});
  const hasAlert = (counts.bad || 0) > 0;

  return (
    <button
      onClick={() => setKpiBandOpen(!kpiBandOpen)}
      className={[
        'h-8 flex items-center gap-1.5 px-2.5 rounded-md text-[12px] transition-colors',
        kpiBandOpen
          ? 'bg-navy text-cream border border-navy'
          : 'bg-white border border-rule text-ink2 hover:border-navy/40 hover:text-ink',
      ].join(' ')}>
      <I.Stream size={12} className={kpiBandOpen ? 'text-cream/85' : 'text-ink3'} />
      <span className="tracking-tight">KPI</span>
      {hasAlert && !kpiBandOpen && (
        <span className="w-1.5 h-1.5 rounded-full bg-coral pulse-dot" />
      )}
      <I.ChevronDown size={10}
        className={['transition-transform', kpiBandOpen ? 'rotate-180' : ''].join(' ')} />
    </button>
  );
}

// ── Notifications bell ──────────────────────────────────────────────────────
const NOTIFICATIONS = [
  { id: 'n1', mod: 'acciones', tipo: 'borrador', sev: 'warn', unread: true,
    title: 'Correo pendiente de envío · Hugo Salinas',
    sub:   'Borrador listo · revisa y envía desde tu correo institucional', ts: 'hace 2 min' },
  { id: 'n2', mod: 'kpis', tipo: 'umbral', sev: 'warn', unread: true,
    title: 'O₂ disuelto bajo umbral · CTR-003',
    sub:   '6.0 mg/L · objetivo ≥ 6.5 · revisar aireación', ts: 'hace 14 min' },
  { id: 'n3', mod: 'central', tipo: 'mortalidad', sev: 'warn', unread: true,
    title: 'CTR-007 sobre umbral hace 4 días',
    sub:   'Mortalidad 27/d · zona objetivo 8–14', ts: 'hace 32 min' },
  { id: 'n4', mod: 'acciones', tipo: 'ejecutada', sev: 'ok', unread: false,
    title: 'Correo enviado · Resumen semanal a Gerencia',
    sub:   'Confirmado por servidor SMTP corporativo', ts: 'hace 2 h' },
  { id: 'n5', mod: 'reportes', tipo: 'listo', sev: 'info', unread: false,
    title: 'Reporte generado · resumen semanal',
    sub:   'mortalidad_FCR_sem19.xlsx · listo para descarga', ts: 'hace 3 h' },
];

function NotificationsBell() {
  const initialOpen = typeof window !== 'undefined' && /(?:^|&)notif=open/.test((window.location.hash || '').replace(/^#/, ''));
  const [open, setOpen] = useState(initialOpen);
  const [items, setItems] = useState(NOTIFICATIONS);
  const ref = useRef(null);
  const { isVisible, setView } = useApp();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey  = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = items.filter((n) => isVisible(n.mod));
  const unread = visible.filter((n) => n.unread).length;

  const markAll = () => setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
  const markOne = (id) => setItems((prev) => prev.map((n) => n.id === id ? { ...n, unread: false } : n));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          'h-8 w-8 flex items-center justify-center rounded-md transition-colors relative',
          open ? 'text-ink bg-rule/60' : 'text-ink3 hover:text-ink hover:bg-rule/60',
        ].join(' ')}
        title="Notificaciones">
        <I.Bell size={13} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 rounded-full
                          bg-coral text-cream font-mono text-[9px] font-semibold tabular-nums
                          flex items-center justify-center pulse-dot">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] w-[400px] z-30 rise
                        rounded-lg bg-white border border-rule
                        shadow-[0_20px_50px_-20px_rgba(10,37,64,.35)]"
             style={{ animationDuration: '.22s' }}>
          <header className="flex items-center justify-between px-4 py-3 border-b border-rule">
            <div>
              <div className="font-display text-[15px] tracking-tight">Notificaciones</div>
              <div className="mono-label text-ink3 mt-0.5">
                {unread > 0 ? `${unread} sin leer` : 'al día'}
              </div>
            </div>
            <button onClick={markAll}
                    disabled={unread === 0}
                    className="text-[11.5px] text-navy hover:underline disabled:text-ink3 disabled:no-underline disabled:cursor-not-allowed">
              Marcar todas
            </button>
          </header>

          <div className="max-h-[440px] overflow-y-auto scroll-paper divide-y divide-rule/60">
            {visible.length === 0 ? (
              <div className="px-4 py-8 text-center mono-label text-ink3">
                No hay notificaciones de módulos activos
              </div>
            ) : visible.map((n) => (
              <NotifRow key={n.id} n={n} onMark={() => markOne(n.id)} onOpen={() => {
                setOpen(false);
                if (n.mod === 'acciones')      setView('actions');
                else if (n.mod === 'kpis')     setView('kpis');
                else if (n.mod === 'reportes') setView('reports-catalog');
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifRow({ n, onMark, onOpen }) {
  const sevMap = {
    warn: ['text-warn',  'bg-warn/10'],
    ok:   ['text-ok',    'bg-ok/10'],
    info: ['text-navy',  'bg-navy/[.08]'],
  };
  const tipoIcon = {
    borrador:   <I.Mail size={14} />,
    ejecutada:  <I.Check size={14} />,
    umbral:     <I.Warning size={14} />,
    mortalidad: <I.Warning size={14} />,
    listo:      <I.Doc size={14} />,
    sistema:    <I.Shield size={14} />,
  };
  const [c, b] = sevMap[n.sev] || sevMap.info;
  return (
    <button
      onClick={() => { onOpen(); onMark(); }}
      className={[
        'group w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
        n.unread ? 'bg-white hover:bg-paper' : 'bg-paper/40 hover:bg-paper',
      ].join(' ')}>
      <span className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${c} ${b}`}>
        {tipoIcon[n.tipo] || <I.Info size={14} />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className={['text-[13px] tracking-tight truncate',
            n.unread ? 'text-ink font-medium' : 'text-ink2'].join(' ')}>{n.title}</span>
          {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-coral shrink-0" />}
        </span>
        <span className="block text-[12px] text-ink2 mt-0.5 truncate">{n.sub}</span>
        <span className="mono-label text-ink3 normal-case tracking-normal text-[10.5px] mt-1">
          {n.ts} · {n.mod}
        </span>
      </span>
    </button>
  );
}

// ── Site footer ─────────────────────────────────────────────────────────────
function SiteFooter() {
  return (
    <footer className="flex items-center justify-between gap-4 px-6 py-2 border-t border-rule bg-paper">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-[.18em] text-ink3 uppercase">
          Powered by
        </span>
        <span className="font-display text-[12.5px] text-navy tracking-tight font-semibold">
          OPCiber
        </span>
      </div>
      <div className="text-[10.5px] text-ink3">
        © 2026 · Todos los derechos reservados
      </div>
    </footer>
  );
}

// ── Version badge (login / bootstrap only) ──────────────────────────────────
function VersionBadge() {
  const { caps } = useApp();
  return (
    <div className="fixed top-4 right-5 z-30 flex items-center gap-2
                    px-2.5 py-1.5 rounded-md bg-white/85 backdrop-blur-sm border border-rule
                    shadow-[0_4px_12px_-6px_rgba(10,37,64,.18)]">
      <div className="w-5 h-5 rounded bg-navy/[.08] text-navy flex items-center justify-center">
        <I.Fish size={11} stroke={1.8} />
      </div>
      <div className="leading-tight">
        <div className="text-[12px] tracking-tight text-ink">{caps.asistente_activo.nombre}</div>
        <div className="font-mono text-[9.5px] text-ink3">v2.4.1</div>
      </div>
    </div>
  );
}

window.TopBar = TopBar;
window.SiteFooter = SiteFooter;
window.VersionBadge = VersionBadge;
