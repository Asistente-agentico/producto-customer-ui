// Chat view — stateful thread driven by useConversation().

// Inline text formatter:
//   {xxx}        → mono pill
//   **xxx**      → bold
//   %coral{xxx}  → coral color
//   %navy{xxx}   → navy color
//   %warn{xxx}   → warn color
function FmtText({ text }) {
  if (!text) return null;
  const parts = [];
  let rest = text;
  let key = 0;
  const re = /(\{[^}]+\})|(\*\*[^*]+\*\*)|(%(?:coral|navy|warn|ok)\{[^}]+\})/g;
  let m, last = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const tok = m[0];
    if (tok.startsWith('{')) {
      parts.push(
        <span key={key++} className="font-mono text-[13.5px] bg-rule/60 px-1.5 py-0.5 rounded">
          {tok.slice(1, -1)}
        </span>
      );
    } else if (tok.startsWith('**')) {
      parts.push(<strong key={key++} className="font-semibold">{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('%')) {
      const colorEnd = tok.indexOf('{');
      const color = tok.slice(1, colorEnd);
      const body = tok.slice(colorEnd + 1, -1);
      const cls = { coral: 'text-coral', navy: 'text-navy', warn: 'text-warn', ok: 'text-ok' }[color] || '';
      parts.push(<span key={key++} className={`${cls} font-medium`}>{body}</span>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(<span key={key++}>{text.slice(last)}</span>);
  return <>{parts}</>;
}

function UserTurn({ time, text, demo }) {
  const [collapsed, setCollapsed] = React.useState(false);
  // truncate threshold — show preview when long
  const TRUNCATE_AT = 90;
  const longText = text && text.length > TRUNCATE_AT;
  const preview = longText ? text.slice(0, TRUNCATE_AT).trim() + '…' : text;

  return (
    <div className="rise flex justify-end">
      <div className="max-w-[640px] text-right">
        <div className="mono-label text-ink3 mb-1.5 flex items-center justify-end gap-2">
          {longText && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded
                         text-ink3 hover:text-ink hover:bg-rule/60 transition-colors"
              title={collapsed ? 'Expandir' : 'Colapsar'}>
              <I.ChevronDown size={11}
                className={['transition-transform', collapsed ? '-rotate-90' : ''].join(' ')} />
              <span className="normal-case tracking-normal text-[10px]">
                {collapsed ? 'expandir' : 'colapsar'}
              </span>
            </button>
          )}
          <span>tú · {time}</span>
        </div>
        <p className="font-display text-[19px] leading-[1.45] tracking-tight text-ink">
          {collapsed ? preview : text}
        </p>
      </div>
    </div>
  );
}

function P({ children, className = '' }) {
  return (
    <p className={`text-[15px] leading-[1.65] text-ink/90 ${className}`}
       style={{ textWrap: 'pretty' }}>
      {children}
    </p>
  );
}

const ARTIFACT_MAP = {
  line_chart:    () => <LineChart />,
  causal_alert:  () => <CausalAlert />,
  prediction:    () => <PredictionChart />,
  report_stub:   () => <ReportStub />,
  action_stub:   () => <ActionStub />,
};

const ARTIFACT_INTRO_KEY = {
  causal_alert: 'causal_alert_pre',
  prediction:   'prediction_pre',
  report_stub:  'report_stub_pre',
};

function AssistantTurn({ msg }) {
  const { isEnabled, isLocked } = useApp();
  const [collapsed, setCollapsed] = React.useState(false);

  // filter artifacts that need a specific module that's hidden
  const visibleArtifacts = (msg.artifacts || []).filter((a) => {
    if (a === 'prediction')  return isEnabled('ml');
    if (a === 'report_stub') return isEnabled('reportes') || isLocked('reportes');
    if (a === 'action_stub') return isEnabled('acciones') || isLocked('acciones');
    return true;
  });

  // Build a short preview from the intro for the collapsed state
  const firstIntro = (msg.intro && msg.intro[0] && msg.intro[0].text) || '';
  const preview = firstIntro.replace(/[{}*%]/g, '').replace(/coral|navy|warn|ok/g, '');
  const previewShort = preview.length > 110 ? preview.slice(0, 110).trim() + '…' : preview;
  const artifactCount = visibleArtifacts.length;

  return (
    <div className="rise flex" style={{ animationDelay: '.05s' }}>
      <div className="max-w-[720px] w-full">
        <div className="mono-label text-ink3 mb-2 flex items-center gap-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded
                       text-ink3 hover:text-ink hover:bg-rule/60 transition-colors"
            title={collapsed ? 'Expandir respuesta' : 'Colapsar respuesta'}>
            <I.ChevronDown size={11}
              className={['transition-transform', collapsed ? '-rotate-90' : ''].join(' ')} />
            <span className="normal-case tracking-normal text-[10px]">
              {collapsed ? 'expandir' : 'colapsar'}
            </span>
          </button>
          <span>{msg.time}</span>
          {collapsed && artifactCount > 0 && (
            <span className="normal-case tracking-normal text-ink3">
              · {artifactCount} artefacto{artifactCount > 1 ? 's' : ''} oculto{artifactCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="text-left w-full p-3 rounded-md
                       bg-rule/30 border border-rule hover:border-ink3/40 hover:bg-rule/50
                       transition-colors">
            <p className="text-[13.5px] text-ink2 leading-snug line-clamp-2">{previewShort}</p>
          </button>
        ) : (
          <div className="space-y-4 text-[15px] leading-[1.65] text-ink">
            {/* intro paragraphs */}
            {(msg.intro || []).map((p, i) => (
              <P key={`intro-${i}`}><FmtText text={p.text} /></P>
            ))}

            {/* artifacts interleaved with mid text */}
            {visibleArtifacts.map((a, i) => {
              const Comp = ARTIFACT_MAP[a];
              const introKey = ARTIFACT_INTRO_KEY[a];
              const pre = introKey && msg.midText && msg.midText[introKey];
              return (
                <React.Fragment key={`art-${a}-${i}`}>
                  {pre ? <P><FmtText text={pre} /></P> : null}
                  {Comp ? <Comp /> : null}
                </React.Fragment>
              );
            })}

            {/* outro */}
            {msg.outro ? (
              <P className="text-ink2"><FmtText text={msg.outro} /></P>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex" style={{ animation: 'rise .3s ease both' }}>
      <div className="max-w-[720px] w-full">
        <div className="mono-label text-ink3 mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-coral pulse-dot" />
          generando respuesta…
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <Dot delay={0} />
          <Dot delay={.15} />
          <Dot delay={.30} />
        </div>
        <style>{`
          @keyframes typingDot {
            0%, 60%, 100% { transform: translateY(0); opacity: .4; }
            30%           { transform: translateY(-4px); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}

function Dot({ delay }) {
  return (
    <span className="w-2 h-2 rounded-full bg-ink2"
          style={{ animation: `typingDot 1.2s ease-in-out ${delay}s infinite` }} />
  );
}

// ── Thread ──────────────────────────────────────────────────────────────────
function ChatThread() {
  const { messages, streaming, demoMessages } = useConversation();
  const { ultimaOpen } = useApp();
  const scrollRef = React.useRef(null);

  // Cuando "Última" está en ON, antepone la conversación de ejemplo al thread real.
  const allMessages = ultimaOpen ? [...demoMessages, ...messages] : messages;

  // auto-scroll to bottom on new messages
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let p = el.parentElement;
    while (p && !p.classList.contains('scroll-paper')) p = p.parentElement;
    if (p) p.scrollTop = p.scrollHeight;
  }, [allMessages.length, streaming]);

  if (allMessages.length === 0 && !streaming) {
    return <ChatEmptyHint />;
  }

  return (
    <div ref={scrollRef} className="space-y-9">
      {allMessages.map((m) => (
        m.role === 'user'
          ? <UserTurn key={m.id} time={m.time} text={m.text} demo={m.demo} />
          : <AssistantTurn key={m.id} msg={m} />
      ))}
      {streaming && <TypingIndicator />}
    </div>
  );
}

function ChatEmptyHint() {
  return (
    <div className="rise flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-lg bg-rule/50 text-ink3 flex items-center justify-center mb-4">
        <I.Sparkle size={22} />
      </div>
      <h2 className="font-display text-[22px] tracking-tight text-ink">
        Empieza una conversación
      </h2>
      <p className="text-[13.5px] text-ink2 mt-2 max-w-[420px]" style={{ textWrap: 'pretty' }}>
        Escribe abajo o usa el botón <span className="font-mono text-[12px] bg-rule/60 px-1.5 py-0.5 rounded">Última</span>{' '}
        de la cabecera para ver un ejemplo de cómo responde el asistente.
      </p>
    </div>
  );
}

function DemoBanner({ onDismiss }) {
  const [collapsed, setCollapsed] = React.useState(true);

  if (collapsed) {
    return (
      <div className="rise flex items-center gap-2">
        <button
          onClick={() => setCollapsed(false)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                     bg-warn/10 border border-warn/30 text-warn
                     hover:bg-warn/15 transition-colors"
          title="Ver detalle">
          <I.Sparkle size={11} />
          <span className="mono-label">conversación de ejemplo · solo demo</span>
          <I.ChevronDown size={11} />
        </button>
        <button
          onClick={onDismiss}
          className="p-1 rounded-md text-ink3 hover:text-ink hover:bg-rule/60"
          title="Ocultar aviso">
          <I.X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="rise flex items-start gap-3 p-3.5 rounded-md
                    bg-[#FBF6E8] border border-warn/25
                    border-l-[3px] border-l-warn">
      <span className="shrink-0 w-7 h-7 rounded-md bg-warn/15 text-warn
                       flex items-center justify-center mt-px">
        <I.Sparkle size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="mono-label text-warn">conversación de ejemplo · solo demo</div>
        <p className="text-[13px] text-ink2 mt-1 leading-relaxed" style={{ textWrap: 'pretty' }}>
          La conversación de abajo viene precargada para mostrarte cómo se ven los
          distintos artefactos (gráfico, banner causal, predicción ML, reporte, acción).{' '}
          <strong className="text-ink font-medium">
            Cuando envíes tu primera consulta, verás tu propio thread real
          </strong>
          {' '}filtrado por tus permisos JWT.
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 -m-1 rounded-md text-ink3 hover:text-ink hover:bg-warn/10"
          title="Achicar">
          <I.ChevronDown size={13} className="rotate-180" />
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 -m-1 rounded-md text-ink3 hover:text-ink hover:bg-warn/10"
          title="Ocultar">
          <I.X size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Empty state (when on the empty view) ────────────────────────────────────
function EmptyState() {
  const { caps, isEnabled, openPanel, setView } = useApp();
  const conv = useConversation();
  const fecha = 'martes, 14 de mayo';

  const trigger = (q) => {
    setView('chat');
    setTimeout(() => conv && conv.sendMessage(q), 30);
  };

  const sugerencias = [
    { txt: 'Mortalidad de la semana en mis centros',                            mod: 'central' },
    { txt: 'Resumen FCR y biomasa al cierre del día',                           mod: 'central' },
    { txt: 'Generar reporte mensual de cosecha (Excel · PowerBI)',              mod: 'reportes' },
    { txt: 'Predicción de mortalidad próximos 14 días',                          mod: 'ml' },
    { txt: 'KPIs en vivo · O₂ disuelto y temperatura',                          mod: 'kpis' },
    { txt: 'Notificar a jefes de centro sobre umbrales sobrepasados',           mod: 'acciones' },
  ].filter((s) => isEnabled(s.mod));

  return (
    <div className="max-w-[1000px] mx-auto px-8 pt-16 pb-10">
      <div className="rise mb-9">
        <h1 className="font-display text-[40px] leading-[1.05] tracking-tight text-ink">
          Hola, {caps.usuario.nombre.split(' ')[0]}.
        </h1>
        <p className="text-[16px] text-ink2 mt-3 max-w-[680px]" style={{ textWrap: 'pretty' }}>
          Estás operando con el asistente <strong className="text-ink font-semibold">{caps.asistente_activo.nombre}</strong>,
          como <strong className="text-ink font-semibold">{caps.usuario.rol}</strong> de
          gerencia <strong className="text-ink font-semibold">{caps.usuario.gerencia}</strong>.
          Tienes acceso a 3 centros y 12 jaulas activas.{' '}
          <button onClick={() => openPanel('permisos')}
                  className="text-navy underline decoration-rule underline-offset-4 hover:decoration-navy">
            ¿Qué estoy viendo y qué no?
          </button>
        </p>
      </div>

      <Divider2 />

      <Section icon={<I.Bell size={14} />} label="pendiente de tu atención">
        <div className="space-y-2 rise" style={{ animationDelay: '.08s' }}>
          {[
            { txt: 'CTR-007 sobre umbral hace 4 días',                    ts: 'hace 32 min', sev: 'warn' },
            { txt: 'Acción aprobada por Hugo Salinas',                     ts: 'hace 2 h',    sev: 'ok' },
            { txt: 'O₂ disuelto CTR-003 bajo 6.0 mg/L',                    ts: 'hace 5 h',    sev: 'warn' },
          ].map((a, i) => (
            <button key={i}
              onClick={() => setView('chat')}
              className="w-full flex items-start gap-3 text-left p-3 rounded-md
                         border border-rule bg-white hover:border-ink3/40 transition-colors">
              <span className={[
                'shrink-0 w-2 h-2 rounded-full mt-2',
                a.sev === 'warn' ? 'bg-warn' : 'bg-ok',
              ].join(' ')} />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] text-ink tracking-tight">{a.txt}</span>
                <span className="block mono-label text-ink3 mt-0.5">{a.ts}</span>
              </span>
              <I.Chevron size={13} className="text-ink3 mt-1.5" />
            </button>
          ))}
        </div>
      </Section>

      <Section icon={<I.Sparkle size={14} />} label="qué puedes preguntar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 rise" style={{ animationDelay: '.12s' }}>
          {sugerencias.map((s, i) => (
            <button key={i}
              onClick={() => trigger(s.txt)}
              className="flex items-center justify-between gap-2 text-left p-3 rounded-md
                         border border-rule bg-white hover:border-navy/30 transition-colors group">
              <span className="text-[13.5px] text-ink tracking-tight">{s.txt}</span>
              <ModuleTag mod={s.mod} />
            </button>
          ))}
        </div>
      </Section>

      <Section icon={<I.Clock size={14} />} label="tus últimas conversaciones">
        <div className="space-y-1 rise" style={{ animationDelay: '.16s' }}>
          {[
            { t: 'Mortalidad CTR-007 jaula 4', ts: 'hace 32 min', ret: '5 años · auditor' },
            { t: 'Revisión FCR semana 19',     ts: 'hace 3 horas', ret: '5 años · auditor' },
            { t: 'O₂ disuelto · CTR-003',      ts: 'ayer 09:21',   ret: '5 años · auditor' },
          ].map((c, i) => (
            <button key={i}
              onClick={() => setView('chat')}
              className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md
                         hover:bg-rule/40 text-left transition-colors">
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-1 h-1 rounded-full bg-ink3 shrink-0" />
                <span className="text-[14px] text-ink tracking-tight truncate">{c.t}</span>
              </span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="mono-label text-ink3 hidden md:inline">retención · {c.ret}</span>
                <span className="mono-label text-ink3 normal-case tracking-normal">{c.ts}</span>
              </span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, label, children }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-ink3">{icon}</span>
        <span className="mono-label text-ink3">{label}</span>
        <span className="flex-1 h-px bg-rule" />
      </div>
      {children}
    </section>
  );
}

function ModuleTag({ mod }) {
  const map = {
    central:  ['central',  'text-navy bg-navy/[.08]'],
    reportes: ['reportes', 'text-[#0a6e3a] bg-[#0a6e3a]/10'],
    kpis:     ['kpis',     'text-ok bg-ok/10'],
    ml:       ['ml',       'text-[#5d4e8c] bg-[#5d4e8c]/10'],
    acciones: ['acciones', 'text-coral bg-coral/10'],
  };
  const [t, c] = map[mod] || ['', ''];
  return <span className={`mono-label rounded-sm px-1.5 py-0.5 normal-case tracking-wide ${c}`}>{t}</span>;
}

function Divider2() {
  return <div className="h-px bg-rule mb-7" />;
}

window.ChatThread = ChatThread;
window.EmptyState = EmptyState;
