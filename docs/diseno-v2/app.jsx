// App shell — orchestrates state, routes views, mounts tweaks.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "view": "login",
  "mod_ml": "ok",
  "mod_kpis": "ok",
  "mod_reportes": "ok",
  "mod_acciones": "ok",
  "mobile": false,
  "show_empty": false
}/*EDITMODE-END*/;

// When embedded in the design canvas (or any iframe with a hash), read the
// hash params (#view=login&mobile=true&...) and merge them on top of the
// in-file defaults so each artboard can pre-configure itself.
function readHashOverrides() {
  if (typeof window === 'undefined' || !window.location.hash) return {};
  const h = window.location.hash.replace(/^#/, '');
  if (!h) return {};
  const out = {};
  h.split('&').forEach((kv) => {
    const [k, v] = kv.split('=');
    if (!k) return;
    if (v === 'true')  out[k] = true;
    else if (v === 'false') out[k] = false;
    else out[k] = decodeURIComponent(v || '');
  });
  return out;
}
const INITIAL_TWEAKS = { ...TWEAK_DEFAULTS, ...readHashOverrides() };

const MOD_OPTIONS = ['ok', 'locked', 'hidden', 'error'];
const VIEW_OPTIONS = [
  ['login',           'Login (pre-auth)'],
  ['bootstrap',       'Bootstrap splash'],
  ['empty',           'Chat · empty state (home)'],
  ['chat',            'Chat · conversación activa'],
  ['kpis',            'KPIs en vivo'],
  ['reports-catalog', 'Reportes · catálogo'],
  ['actions',         'Acciones · cola + detalle'],
];

function MainArea() {
  const { view, mobile } = useApp();
  // Chat view: TopBar + KpiBand + scroll + composer + footer
  if (view === 'chat' || view === 'empty') {
    return (
      <main className="flex-1 flex flex-col min-w-0 bg-paper grain">
        <TopBar />
        <KpiBand />
        <div className="flex-1 overflow-y-auto scroll-paper">
          {view === 'empty' ? <EmptyState /> : (
            <div className="max-w-[1100px] mx-auto px-8 pt-8 pb-10">
              <ChatThread />
              <div className="h-12" />
            </div>
          )}
        </div>
        <Composer />
        <SiteFooter />
      </main>
    );
  }

  // Other views — full canvas with TopBar + KpiBand + footer, no composer
  return (
    <main className="flex-1 flex flex-col min-w-0 bg-paper grain">
      <TopBar />
      <KpiBand />
      <div className="flex-1 overflow-y-auto scroll-paper">
        {view === 'kpis'            && <KpisView />}
        {view === 'reports-catalog' && <ReportsCatalogView />}
        {view === 'actions'         && <ActionsView />}
      </div>
      <SiteFooter />
    </main>
  );
}

function Shell() {
  const { view, mobile } = useApp();

  // Pre-shell views (no sidebar, no panels)
  if (view === 'login')     return <div className="h-screen overflow-hidden"><LoginView /></div>;
  if (view === 'bootstrap') return <div className="h-screen overflow-hidden"><BootstrapView /></div>;

  // Mobile preview — single column, no sidebar
  if (mobile) {
    return (
      <div className="h-screen overflow-hidden bg-[#1f1d18] flex items-center justify-center p-6">
        <div className="w-[420px] h-[860px] rounded-[36px] bg-paper overflow-hidden
                        shadow-[0_30px_80px_-20px_rgba(0,0,0,.5)]
                        border-[12px] border-[#1f1d18] flex flex-col relative">
          <MobileHeader />
          <div className="flex-1 overflow-y-auto scroll-paper">
            {view === 'empty'           && <MobileEmptyState />}
            {view === 'chat'            && <div className="px-4 py-6"><ChatThread /></div>}
            {view === 'kpis'            && <KpisView />}
            {view === 'reports-catalog' && <ReportsCatalogView />}
            {view === 'actions'         && <ActionsView />}
          </div>
          {(view === 'chat' || view === 'empty') && <MobileComposer />}
          <SiteFooter />
        </div>
        <ActivePanel />
      </div>
    );
  }

  const showSidebar = view === 'chat' || view === 'empty';
  return (
    <div className="flex h-screen overflow-hidden">
      {showSidebar && <Sidebar />}
      <MainArea />
      <ActivePanel />
    </div>
  );
}

// ── Mobile chrome ───────────────────────────────────────────────────────────
function MobileHeader() {
  const { caps, setView, view, openPanel } = useApp();
  return (
    <header className="bg-navy text-cream">
      {/* status bar */}
      <div className="h-7 px-4 flex items-center justify-between text-[10.5px] font-mono text-cream/70">
        <span>14:32</span>
        <span>{caps.tenant.id}</span>
        <span>●●●</span>
      </div>
      {/* nav bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-black/30">
        <button className="p-1.5 -ml-1.5 rounded-md hover:bg-navy-2">
          <I.Menu size={18} />
        </button>
        <div className="text-center min-w-0">
          <div className="text-[13px] tracking-tight">{caps.asistente_activo.nombre}</div>
          <div className="mono-label text-cream/55 truncate">{caps.usuario.rol}</div>
        </div>
        <button onClick={() => openPanel('permisos')} className="p-1.5 -mr-1.5 rounded-md hover:bg-navy-2">
          <I.Shield size={16} />
        </button>
      </div>
    </header>
  );
}

function MobileEmptyState() {
  const { caps, setView, openPanel, isEnabled } = useApp();
  return (
    <div className="px-4 py-5">
      <div className="mono-label text-ink3">mar 14 may · 14:32</div>
      <h1 className="font-display text-[28px] leading-[1.1] tracking-tight mt-2">
        Hola, {caps.usuario.nombre.split(' ')[0]}.
      </h1>
      <p className="text-[14px] text-ink2 mt-2" style={{ textWrap: 'pretty' }}>
        Asistente <strong className="text-ink">{caps.asistente_activo.nombre}</strong> ·{' '}
        {caps.usuario.rol} de {caps.usuario.gerencia}.{' '}
        <button onClick={() => openPanel('permisos')}
                className="text-navy underline decoration-rule underline-offset-2">
          ¿Qué estoy viendo?
        </button>
      </p>

      <div className="mt-5 mono-label text-ink3 flex items-center gap-2">
        <I.Bell size={11} /> pendiente
        <span className="flex-1 h-px bg-rule" />
      </div>
      <div className="mt-2 space-y-2">
        <button className="w-full flex items-start gap-2.5 text-left p-3 rounded-md
                          border border-rule bg-white">
          <span className="w-2 h-2 rounded-full bg-warn mt-1.5 shrink-0" />
          <span className="text-[13.5px] text-ink tracking-tight">
            CTR-007 sobre umbral hace 4 días
          </span>
        </button>
      </div>

      <div className="mt-5 mono-label text-ink3 flex items-center gap-2">
        <I.Sparkle size={11} /> qué puedes preguntar
        <span className="flex-1 h-px bg-rule" />
      </div>
      <div className="mt-2 space-y-2">
        {['Mortalidad de la semana', 'Resumen FCR y biomasa', 'Generar reporte mensual'].map((s, i) => (
          <button key={i} className="w-full text-left p-3 rounded-md border border-rule bg-white text-[13.5px]">
            {s}
          </button>
        ))}
      </div>

      <div className="mt-5 mono-label text-ink3 flex items-center gap-2">
        <I.Clock size={11} /> conversaciones recientes
        <span className="flex-1 h-px bg-rule" />
      </div>
      <div className="mt-2 space-y-1">
        {['Mortalidad CTR-007 jaula 4', 'FCR semana 19', 'O₂ disuelto · CTR-003'].map((t, i) => (
          <button key={i}
            onClick={() => setView('chat')}
            className="w-full flex items-center gap-2 px-2 py-2.5 rounded-md hover:bg-rule/40 text-left">
            <span className="w-1 h-1 rounded-full bg-ink3 shrink-0" />
            <span className="text-[13.5px] text-ink tracking-tight truncate">{t}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileComposer() {
  return (
    <div className="border-t border-rule bg-paper px-3 py-2.5">
      <div className="flex items-center gap-2 bg-white border border-rule rounded-xl px-3 py-2.5">
        <I.Attach size={16} className="text-ink3" />
        <input placeholder="Pregunta algo…" className="flex-1 bg-transparent outline-none text-[14px]" />
        <button className="w-8 h-8 rounded-md bg-coral text-cream flex items-center justify-center">
          <I.Send size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(INITIAL_TWEAKS);

  return (
    <AppProvider tweaks={tweaks} setTweak={setTweak}>
      <ConversationProvider>
        <Shell />
        {/* Panel de Tweaks deshabilitado — funcionalidad futura.
            Las variaciones se controlan vía hash de URL (#mod_kpis=hidden, etc.). */}
      </ConversationProvider>
    </AppProvider>
  );
}

const root = document.getElementById('root');
ReactDOM.createRoot(root).render(<App />);
