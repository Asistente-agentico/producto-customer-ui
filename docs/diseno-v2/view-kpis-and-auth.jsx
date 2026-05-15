// Views — full-canvas screens (alternative to chat)

const { useState: useStateV, useEffect: useEffectV } = React;

// ════════════════════════════════════════════════════════════════════════════
// LOGIN — pre-auth screen
// ════════════════════════════════════════════════════════════════════════════
function LoginView() {
  const { setView, modules, isEnabled } = useApp();
  const initMode = typeof window !== 'undefined' && /(?:^|&)idp=true/.test((window.location.hash || '').replace(/^#/, '')) ? 'idp_externo' : 'iam_interno';
  const [mode] = useStateV(initMode);

  // Solo módulos opcionales habilitados (sin Central, que siempre está activo).
  const OPCIONALES = [
    { id: 'kpis',     nombre: 'KPIs' },
    { id: 'ml',       nombre: 'Machine Learning' },
    { id: 'reportes', nombre: 'Reportes' },
    { id: 'acciones', nombre: 'Acciones' },
  ].filter((m) => isEnabled(m.id));

  return (
    <div className="h-full flex flex-col bg-paper">
      <VersionBadge />

      <div className="flex-1 flex">
        {/* left — brand panel */}
        <div className="hidden md:flex w-[44%] bg-navy text-cream flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-cream text-navy flex items-center justify-center">
              <I.Logo size={20} stroke={1.8} />
            </div>
            <div>
              <div className="font-display text-[15px] tracking-tight">Tu Asistente Asistente Virtual</div>
              <div className="mono-label text-cream/55 normal-case tracking-normal text-[10.5px] mt-0.5">
                tu apoyo operativo
              </div>
            </div>
          </div>

          <div>
            <h1 className="font-display text-[42px] leading-[1.05] tracking-tight">
              Una sola interfaz, todos tus módulos.
            </h1>
            <p className="text-[15px] text-cream/70 leading-relaxed mt-4 max-w-[420px]"
               style={{ textWrap: 'pretty' }}>
              Conversa con tus datos productivos, anclá indicadores en vivo, genera
              reportes y ejecuta acciones — todo dentro de los permisos que tu
              organización te asigna.
            </p>
          </div>

          {OPCIONALES.length > 0 ? (
            <div>
              <div className="mono-label text-cream/55 mb-3">módulos contratados</div>
              <div className="grid grid-cols-2 gap-2.5 max-w-[420px]">
                {OPCIONALES.map((m) => (
                  <div key={m.id}
                       className="rounded-md bg-cream/[.10] px-3.5 py-2.5
                                  border border-cream/20
                                  shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
                    <div className="font-display text-[14px] text-cream tracking-tight">{m.nombre}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : <div />}
        </div>

        {/* right — form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[380px]">
            <div className="mono-label text-ink3 mb-2">salmones-antartica.cl</div>
            <h2 className="font-display text-[28px] tracking-tight">Iniciar sesión</h2>
            <p className="text-[13.5px] text-ink2 mt-1">Bienvenido. Tus permisos se cargan tras autenticarte.</p>

            {mode === 'idp_externo' ? (
              <button
                onClick={() => setView('bootstrap')}
                className="mt-7 w-full flex items-center justify-center gap-2 py-3
                           rounded-md bg-navy text-cream hover:bg-navy-3 transition-colors
                           text-[14px] tracking-tight">
                Continuar con Microsoft Entra
                <I.External size={14} />
              </button>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setView('bootstrap'); }} className="mt-7 space-y-3">
                <Field label="Correo corporativo">
                  <input type="email" defaultValue="matias.vergara@salmones-antartica.cl"
                         className="w-full bg-white border border-rule rounded-md px-3 py-2.5
                                    text-[14px] outline-none focus:border-navy" />
                </Field>
                <Field label="Contraseña">
                  <input type="password" defaultValue="••••••••••"
                         className="w-full bg-white border border-rule rounded-md px-3 py-2.5
                                    text-[14px] outline-none focus:border-navy" />
                </Field>
                <div className="flex items-center justify-between text-[12.5px] pt-1">
                  <label className="flex items-center gap-2 text-ink2">
                    <input type="checkbox" className="accent-navy" defaultChecked /> Recordarme 30 días
                  </label>
                  <a href="#" className="text-navy hover:underline">Olvidé mi clave</a>
                </div>
                <button type="submit"
                        className="mt-2 w-full py-3 rounded-md bg-coral text-cream hover:bg-coral-2
                                   transition-colors text-[14px] tracking-tight
                                   shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
                  Continuar
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mono-label text-ink3 block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BOOTSTRAP — splash transitorio, más funcional
// ════════════════════════════════════════════════════════════════════════════
function BootstrapView() {
  const { caps, modules, setView } = useApp();

  const moduleSummary = Object.values(modules)
    .map((m) => ({ ...m, ok: m.estado === 'ok' }));
  const enabledCount  = moduleSummary.filter((m) => m.ok).length;
  const totalCount    = moduleSummary.length;

  const STEPS = [
    {
      key: 'auth', label: 'Sesión autenticada',
      detail: `pseudo-id ${caps.usuario.id_pseudo} · cookie HttpOnly · refresh activo`,
      icon:   <I.Lock size={13} />,
    },
    {
      key: 'caps', label: 'Configuración recibida',
      detail: `capabilities v${caps.version} · hash ${caps.hash} · 8 secciones`,
      icon:   <I.Shield size={13} />,
    },
    {
      key: 'brand', label: 'Marca del cliente aplicada',
      detail: `${caps.tenant.nombre} · ${caps.tenant.region} · paleta + tipografías`,
      icon:   <I.Sparkle size={13} />,
    },
    {
      key: 'perms', label: 'Permisos del usuario cargados',
      detail: `rol ${caps.usuario.rol} · gerencia ${caps.usuario.gerencia} · ${caps.usuario.filtros_jwt.length} filtros JWT activos · PII oculta`,
      icon:   <I.Eye size={13} />,
    },
    {
      key: 'modules', label: 'Módulos opcionales detectados',
      detail: `${enabledCount}/${totalCount} módulos activos · resto degradado a hidden/locked/error según contrato`,
      icon:   <I.Power size={13} />,
    },
    {
      key: 'convos', label: 'Conversaciones recuperadas',
      detail: '12 hilos · retención según rol (5 años · auditor)',
      icon:   <I.Clock size={13} />,
    },
    {
      key: 'assist', label: `Asistente ${caps.asistente_activo.nombre} listo`,
      detail: `modelo ${caps.llm.model} · LLM provisto por el cliente`,
      icon:   <I.Fish size={13} />,
    },
  ];

  const [step, setStep] = useStateV(0);
  useEffectV(() => {
    if (step >= STEPS.length) return;
    const id = setTimeout(() => setStep((s) => s + 1), step === 0 ? 600 : 900);
    return () => clearTimeout(id);
  }, [step]);

  const total = STEPS.length;
  const done  = Math.min(step, total);
  const pct   = (done / total) * 100;
  const isComplete = step >= total;

  // Auto-advance to chat after a beat — unless ?hold=true en el hash (comparaciones)
  const holdMode = typeof window !== 'undefined' &&
                   /(?:^|&)hold=true/.test((window.location.hash || '').replace(/^#/, ''));
  useEffectV(() => {
    if (!isComplete || holdMode) return;
    const id = setTimeout(() => setView('chat'), 1400);
    return () => clearTimeout(id);
  }, [isComplete, setView, holdMode]);

  return (
    <div className="h-full flex flex-col bg-paper">
      <VersionBadge />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[520px]">
          {/* logo */}
          <div className="flex items-center gap-3 mb-7">
            <div className="w-11 h-11 rounded-lg bg-navy text-cream flex items-center justify-center">
              <I.Logo size={22} stroke={1.8} />
            </div>
            <div>
              <div className="font-display text-[20px] tracking-tight">Tu Asistente Asistente Virtual</div>
              <div className="mono-label text-ink3 normal-case tracking-normal text-[11px]">
                tu apoyo operativo
              </div>
            </div>
          </div>

          {/* progress bar */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="text-[13px] text-ink2 tracking-tight">
                {isComplete ? 'Listo — abriendo tu espacio…' : 'Inicializando…'}
              </div>
              <div className="font-mono text-[11px] text-ink3 tabular-nums">
                {done} / {total}
              </div>
            </div>
            <div className="h-1 rounded-full bg-rule overflow-hidden">
              <div className="h-full bg-coral transition-all duration-500 ease-out"
                   style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* steps */}
          <div className="mt-6 space-y-2">
            {STEPS.map((s, i) => {
              const isDone   = i < step;
              const isActive = i === step && !isComplete;
              const isFuture = i > step;
              return (
                <div key={s.key}
                  className={[
                    'rise flex items-start gap-3 p-3 rounded-md transition-opacity',
                    isFuture ? 'opacity-40' : 'opacity-100',
                  ].join(' ')}
                  style={{ animationDelay: `${i * .06}s`, animationDuration: '.4s' }}>
                  <span className={[
                    'shrink-0 w-7 h-7 rounded-md flex items-center justify-center',
                    isDone   ? 'bg-ok/15 text-ok' :
                    isActive ? 'bg-navy/10 text-navy' :
                               'bg-rule/60 text-ink3',
                  ].join(' ')}>
                    {isDone ? <I.Check size={14} /> : isActive ? (
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-navy border-t-transparent animate-spin" />
                    ) : s.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={[
                      'text-[13.5px] tracking-tight',
                      isDone || isActive ? 'text-ink font-medium' : 'text-ink2',
                    ].join(' ')}>{s.label}</div>
                    <div className="font-mono text-[10.5px] text-ink3 mt-0.5 truncate">
                      {s.detail}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* meta */}
          <div className="mt-7 flex items-center justify-between pt-4 border-t border-rule">
            <div className="mono-label text-ink3">
              build 8a3f · client {caps.version}
            </div>
            <div className="mono-label text-ink3 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-ok' : 'bg-coral pulse-dot'}`} />
              {isComplete ? 'todos los servicios respondieron' : 'consultando módulos'}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KPIS — streaming dashboard view
// ════════════════════════════════════════════════════════════════════════════
const KPI_LIST = [
  { id: 'biomasa', label: 'Biomasa total · activa',  value: '2.450 t', delta: '+6.5%', ok: true,  sub: '4 centros · 32 jaulas' },
  { id: 'mort',    label: 'Mortalidad semanal',       value: '0.18 %', delta: '+12%',  ok: false, sub: 'umbral 0.15%' },
  { id: 'fcr',     label: 'FCR consolidado',          value: '1.34',   delta: '−0.03', ok: true,  sub: 'meta 1.35' },
  { id: 'o2',      label: 'O₂ disuelto · promedio',   value: '6.4 mg/L',delta: '−0.4', ok: false, sub: 'umbral 6.5' },
  { id: 'temp',    label: 'Temperatura promedio',     value: '14.6 °C',delta: '+0.8',  ok: false, sub: 'rango 12.5–14.0' },
  { id: 'peso',    label: 'Peso medio',               value: '4.21 kg',delta: '+50 g', ok: true,  sub: 'objetivo 4.5 kg' },
];

function KpisView() {
  return (
    <div className="max-w-[1080px] mx-auto px-8 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="mono-label text-ok flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ok pulse-dot" /> stream activo · SSE
            </span>
          </div>
          <h1 className="font-display text-[32px] tracking-tight mt-1">KPIs en vivo</h1>
          <p className="text-[13.5px] text-ink2 mt-1">
            Salmones Antártica · Región X · 4 centros · actualización promedio cada 8 s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-md border border-rule bg-white text-[12.5px] text-ink2 hover:border-navy/40">
            <I.Filter size={12} className="inline mr-1.5" />
            Filtros
          </button>
          <button className="px-3 py-1.5 rounded-md border border-rule bg-white text-[12.5px] text-ink2 hover:border-navy/40">
            <I.Refresh size={12} className="inline mr-1.5" />
            Reanclar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {KPI_LIST.map((k, i) => (
          <KpiCard key={k.id} k={k} delay={i * .06} />
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-rule bg-white">
        <ArtifactHeaderV
          kind="tabla · centros activos"
          title="Detalle por centro"
          subtitle="vista filtrada por permisos: Operaciones · Región X"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-paper text-ink2 mono-label">
              <tr>
                <Th>Centro</Th><Th>Nombre</Th><Th right>Biomasa</Th><Th right>FCR</Th>
                <Th right>Mort. sem</Th><Th right>O₂</Th><Th right>Estado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {[
                ['CTR-001','Punta Cona',       '820 t','1.31','0.12%','6.7','ok'],
                ['CTR-003','Quemchi Norte',    '610 t','1.36','0.14%','6.5','ok'],
                ['CTR-007','Estero Reñihué',   '412 t','1.42','0.27%','6.2','warn'],
                ['CTR-012','Isla Caicura',     '608 t','1.29','0.10%','6.8','ok'],
              ].map((row, i) => (
                <tr key={i} className="hover:bg-paper">
                  <Td mono>{row[0]}</Td>
                  <Td>{row[1]}</Td>
                  <Td right mono>{row[2]}</Td>
                  <Td right mono>{row[3]}</Td>
                  <Td right mono tone={row[6]}>{row[4]}</Td>
                  <Td right mono tone={row[6]}>{row[5]}</Td>
                  <Td right>
                    <span className={`mono-label rounded-sm px-1.5 py-0.5 ${
                      row[6] === 'warn' ? 'text-warn bg-warn/10' : 'text-ok bg-ok/10'
                    }`}>{row[6]}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ k, delay }) {
  return (
    <div className="rise rounded-lg border border-rule bg-white p-4 relative overflow-hidden"
         style={{ animationDelay: `${delay}s` }}>
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-ok pulse-dot" />
        <span className="mono-label text-ink3">live</span>
      </div>
      <div className="mono-label text-ink3">{k.label}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-[28px] tabular-nums tracking-tight">{k.value}</span>
        <span className={`font-mono text-[12.5px] tabular-nums ${k.ok ? 'text-ok' : 'text-coral'}`}>{k.delta}</span>
      </div>
      <div className="mono-label text-ink3 mt-2">{k.sub}</div>
      <div className="mt-3 h-8 rounded bg-paper border border-rule overflow-hidden relative">
        <Sparkline ok={k.ok} />
      </div>
    </div>
  );
}

function Sparkline({ ok }) {
  // Random-ish but seeded look
  const pts = ok
    ? [10,12,11,13,14,12,15,17,16,18,17,19]
    : [18,17,19,16,15,17,14,13,15,11,9,8];
  const max = Math.max(...pts), min = Math.min(...pts);
  const path = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * 100;
    const y = 100 - ((v - min) / (max - min || 1)) * 80 - 10;
    return `${i ? 'L' : 'M'} ${x} ${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <path d={path} fill="none" stroke={ok ? '#2D7D6F' : '#E85C3C'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ArtifactHeaderV({ kind, title, subtitle }) {
  return (
    <header className="flex items-start justify-between px-5 py-3 border-b border-rule">
      <div>
        <div className="mono-label text-ink3">{kind}</div>
        <h4 className="font-display text-[16px] mt-1 tracking-tight">{title}</h4>
        {subtitle && <div className="mono-label text-ink3 mt-1">{subtitle}</div>}
      </div>
    </header>
  );
}

function Th({ children, right }) {
  return <th className={`px-3 py-2 text-[10.5px] font-medium ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}
function Td({ children, right, mono, tone }) {
  const t = tone === 'warn' ? 'text-warn' : '';
  return <td className={`px-3 py-2 ${right ? 'text-right' : ''} ${mono ? 'font-mono tabular-nums' : ''} ${t}`}>{children}</td>;
}

window.LoginView = LoginView;
window.BootstrapView = BootstrapView;
window.KpisView = KpisView;
