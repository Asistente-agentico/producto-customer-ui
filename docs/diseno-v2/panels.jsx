// Side panels — right-side overlays (Claude.ai-style)

function PanelShell({ title, subtitle, kind, onClose, children, width = 480 }) {
  return (
    <aside className="rise fixed top-0 right-0 h-full bg-white border-l border-rule shadow-[0_0_40px_-15px_rgba(10,37,64,.25)] flex flex-col z-30"
           style={{ width, animationDuration: '.4s' }}>
      <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-rule shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="mono-label text-ink3">{kind}</span>
          </div>
          <h3 className="font-display text-[18px] tracking-tight mt-0.5 truncate">{title}</h3>
          {subtitle ? (
            <p className="text-[12.5px] text-ink2 mt-0.5 truncate">{subtitle}</p>
          ) : null}
        </div>
        <button onClick={onClose}
                className="shrink-0 p-1.5 rounded-md text-ink3 hover:text-ink hover:bg-rule/60">
          <I.X size={16} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto scroll-paper">
        {children}
      </div>
    </aside>
  );
}

// ── Report preview ──────────────────────────────────────────────────────────
function ReportPreviewPanel() {
  const { closePanel } = useApp();

  return (
    <PanelShell
      kind="vista previa · reporte"
      title="mortalidad_CTR-007_14d.xlsx"
      subtitle="Generado por módulo Reportes · 42 KB · vigente 60 min"
      onClose={closePanel}
      width={540}
    >
      {/* meta */}
      <div className="px-5 py-3 border-b border-rule bg-paper grid grid-cols-2 gap-3">
        <div>
          <div className="mono-label text-ink3">formato</div>
          <div className="flex items-center gap-1.5 mt-1">
            <I.Excel size={14} className="text-[#0a6e3a]" />
            <span className="text-[12.5px] font-mono">Excel · xlsx</span>
          </div>
        </div>
        <div>
          <div className="mono-label text-ink3">fuente</div>
          <div className="text-[12.5px] mt-1 truncate">RAG · módulo central</div>
        </div>
        <div>
          <div className="mono-label text-ink3">filas</div>
          <div className="font-mono text-[12.5px] mt-1 tabular-nums">14 días · 56 mediciones</div>
        </div>
        <div>
          <div className="mono-label text-ink3">filtros aplicados</div>
          <div className="text-[12.5px] mt-1">jefe_centro · región X</div>
        </div>
      </div>

      {/* sheet preview */}
      <div className="px-5 py-4">
        <div className="rounded-md border border-rule overflow-hidden">
          <div className="grid grid-cols-[1fr] divide-y divide-rule font-mono text-[11.5px]">
            <Row hdr cells={['fecha', 'centro', 'jaula', 'mortalidad', 'O₂ mg/L', 'temp °C', 'zona']} />
            {[
              ['2026-05-08','CTR-007','J04','17','6.8','13.5','objetivo'],
              ['2026-05-09','CTR-007','J04','21','6.5','13.8','sobre'],
              ['2026-05-10','CTR-007','J04','26','6.3','14.1','sobre'],
              ['2026-05-11','CTR-007','J04','24','6.2','14.4','sobre'],
              ['2026-05-12','CTR-007','J04','19','6.2','14.7','sobre'],
              ['2026-05-13','CTR-007','J04','22','6.1','14.6','sobre'],
              ['2026-05-14','CTR-007','J04','27','6.2','14.7','sobre'],
            ].map((row, i) => <Row key={i} cells={row} />)}
            <div className="text-center py-2 text-ink3 text-[11px]">… 7 filas anteriores</div>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-md bg-paper border border-rule">
          <div className="mono-label text-ink3">resumen incluido</div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <Mini label="total" value="237" />
            <Mini label="prom." value="16.9/d" />
            <Mini label="pico" value="27" tone="warn" />
          </div>
        </div>
      </div>

      {/* downloads */}
      <div className="px-5 py-4 border-t border-rule">
        <div className="mono-label text-ink3 mb-2">descargar como</div>
        <div className="grid grid-cols-2 gap-2">
          <DlBtn fmt="xlsx" label="Excel"      icon={<I.Excel size={14} className="text-[#0a6e3a]" />} primary />
          <DlBtn fmt="pdf"  label="PDF"        icon={<I.Pdf size={14} className="text-[#b8332a]" />} />
          <DlBtn fmt="pptx" label="PowerPoint" icon={<I.Doc size={14} className="text-[#c45a1a]" />} />
          <DlBtn fmt="pbi"  label="Power BI"   icon={<I.Chart size={14} className="text-[#f2c811]" />} />
        </div>
      </div>
    </PanelShell>
  );
}

function Row({ cells, hdr }) {
  return (
    <div className={[
      'grid',
      hdr ? 'bg-paper text-ink2 font-medium' : 'bg-white',
    ].join(' ')}
         style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
      {cells.map((c, i) => (
        <div key={i} className={[
          'px-2 py-1.5 border-r border-rule last:border-r-0 truncate',
          c === 'sobre' ? 'text-coral' : c === 'objetivo' ? 'text-ok' : '',
        ].join(' ')}>{c}</div>
      ))}
    </div>
  );
}

function Mini({ label, value, tone }) {
  return (
    <div>
      <div className="mono-label text-ink3">{label}</div>
      <div className={`font-mono text-[14px] tabular-nums mt-0.5 ${tone === 'warn' ? 'text-warn' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

function DlBtn({ icon, label, primary }) {
  return (
    <button className={[
      'flex items-center gap-2 px-3 py-2 rounded-md text-[12.5px] transition-colors',
      primary
        ? 'bg-navy text-cream hover:bg-navy-3 shadow-[inset_0_1px_0_rgba(255,255,255,.08)]'
        : 'bg-white border border-rule hover:border-navy/40 text-ink',
    ].join(' ')}>
      {icon}
      <span className="tracking-tight">{label}</span>
    </button>
  );
}

// ── ¿Qué estoy viendo? — Permisos / filtros JWT ─────────────────────────────
function PermisosPanel() {
  const { caps, closePanel } = useApp();
  const u = caps.usuario;
  return (
    <PanelShell
      kind="auditoría · transparencia"
      title="¿Qué estoy viendo?"
      subtitle="Filtros derivados de tu JWT que aplican a esta sesión"
      onClose={closePanel}
      width={460}
    >
      <div className="px-5 py-4 space-y-5">
        {/* identidad */}
        <Block label="identidad activa">
          <Kv k="usuario"  v={u.nombre} mono={false} />
          <Kv k="id pseudo" v={u.id_pseudo} />
          <Kv k="rol"      v={u.rol} mono={false} />
          <Kv k="gerencia" v={u.gerencia} mono={false} />
          <Kv k="tenant"   v={caps.tenant.id} />
        </Block>

        {/* filtros */}
        <Block label="filtros aplicados a tus consultas" badge={u.filtros_jwt.length}>
          <div className="space-y-2">
            {u.filtros_jwt.map((f, i) => (
              <div key={i} className="rounded-md border border-rule bg-paper px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11.5px] text-ink">{f.campo}</span>
                  <span className="font-mono text-[11px] text-navy bg-navy/[.07] rounded px-1.5 py-0.5">
                    = {f.valor}
                  </span>
                </div>
                <div className="mono-label text-ink3 mt-1">aplica a · {f.aplica_a}</div>
              </div>
            ))}
          </div>
        </Block>

        {/* bloqueado */}
        <Block label={`bloqueados en esta sesión`} badge={u.bloqueados.length}>
          <div className="space-y-2">
            {u.bloqueados.map((b, i) => (
              <div key={i} className="rounded-md border border-rule px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] tracking-tight">{b.nombre}</span>
                  <span className={`mono-label rounded-sm px-1.5 py-0.5 normal-case tracking-wide ${
                    b.tipo === 'kpi' ? 'text-ok bg-ok/10' : 'text-coral bg-coral/10'
                  }`}>{b.tipo}</span>
                </div>
                <div className="mono-label text-ink3 mt-1 flex items-center gap-1.5">
                  <I.Lock size={10} /> {b.razon}
                </div>
              </div>
            ))}
          </div>
        </Block>

        {/* PII */}
        <Block label="datos personales (PII)">
          <div className="flex items-start gap-2.5 p-3 rounded-md bg-ok/5 border border-ok/20">
            <I.Shield size={16} className="text-ok mt-0.5" />
            <div className="text-[12.5px] text-ink leading-snug">
              <strong className="font-semibold">PII oculta</strong> en todas las respuestas del LLM.
              Nombres, RUTs, emails y teléfonos son enmascarados antes de llegar al chat.
            </div>
          </div>
        </Block>

        <div className="mono-label text-ink3 flex items-center gap-1.5 pt-2 border-t border-rule">
          <I.Clock size={10} /> última verificación de permisos · 14:31:54 CLT
        </div>
      </div>
    </PanelShell>
  );
}

function Block({ label, badge, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="mono-label text-ink3">{label}</div>
        {badge != null && (
          <span className="font-mono text-[10.5px] text-ink3 bg-rule/60 rounded-sm px-1.5 py-0.5">{badge}</span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Kv({ k, v, mono = true }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-rule/60 last:border-b-0">
      <span className="mono-label text-ink3">{k}</span>
      <span className={`text-[12.5px] ${mono ? 'font-mono' : ''} text-ink`}>{v}</span>
    </div>
  );
}

// ── Panel dispatcher ────────────────────────────────────────────────────────
function ActivePanel() {
  const { panel } = useApp();
  if (panel === 'none') return null;
  if (panel === 'report-preview') return <ReportPreviewPanel />;
  if (panel === 'permisos')       return <PermisosPanel />;
  return null;
}

window.ActivePanel = ActivePanel;
