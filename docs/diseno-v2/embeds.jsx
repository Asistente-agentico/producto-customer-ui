// Embeds — artefactos que el dispatcher renderiza inline en el chat.

const { useState: useStateE } = React;

// ── Helpers ─────────────────────────────────────────────────────────────────
function Stat({ label, value, tone, mono = true }) {
  const color = tone === 'warn' ? 'text-warn' : tone === 'ok' ? 'text-ok' : 'text-ink';
  return (
    <div>
      <div className="mono-label text-ink3">{label}</div>
      <div className={`text-[14px] tabular-nums mt-0.5 ${color} ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}
const Divider = () => <div className="w-px self-stretch bg-rule" />;

function ArtifactHeader({ kind, kindClass = 'bg-navy/[.07] text-navy', title, subtitle, right }) {
  return (
    <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-rule">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`mono-label rounded-sm px-1.5 py-0.5 normal-case tracking-wide ${kindClass}`}>
            {kind}
          </span>
          {subtitle ? <span className="mono-label text-ink3">{subtitle}</span> : null}
        </div>
        <h4 className="font-display text-[17px] mt-1 tracking-tight">{title}</h4>
      </div>
      {right}
    </header>
  );
}

// ── 1. LineChart — serie_temporal artifact ──────────────────────────────────
const MORTALITY = [
  { d:'01 may', v:11 }, { d:'02', v:12 }, { d:'03', v:10 }, { d:'04', v:9 },
  { d:'05', v:13 }, { d:'06', v:12 }, { d:'07', v:14 }, { d:'08', v:17 },
  { d:'09', v:21 }, { d:'10', v:26 }, { d:'11', v:24 }, { d:'12', v:19 },
  { d:'13', v:22 }, { d:'14 may', v:27 },
];
const TARGET = { lo: 8, hi: 14 };

function LineChart() {
  const W = 640, H = 220, padL = 44, padR = 18, padT = 18, padB = 30;
  const xs = MORTALITY.length, maxV = 30, minV = 0;
  const xAt = (i) => padL + (i * (W - padL - padR)) / (xs - 1);
  const yAt = (v) => padT + (1 - (v - minV) / (maxV - minV)) * (H - padT - padB);
  const path = MORTALITY.map((p, i) => `${i ? 'L' : 'M'} ${xAt(i).toFixed(1)} ${yAt(p.v).toFixed(1)}`).join(' ');
  const areaTop = yAt(TARGET.hi), areaBot = yAt(TARGET.lo);

  return (
    <figure className="rise rounded-lg border border-rule bg-white">
      <ArtifactHeader
        kind="serie_temporal"
        subtitle="mortalidad diaria · 14d · vía módulo central"
        title="CTR-007 · jaula 4"
        right={
          <div className="text-right">
            <div className="font-mono text-[20px] tabular-nums tracking-tight">
              <span className="text-coral">+38%</span>
              <span className="text-ink3 ml-2 text-[12px]">vs sem-1</span>
            </div>
            <div className="mono-label text-ink3 mt-1">unidades · peces</div>
          </div>
        }
      />
      <div className="px-3 pt-3 pb-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
          <rect x={padL} y={areaTop} width={W - padL - padR} height={areaBot - areaTop}
                fill="#2D7D6F" fillOpacity="0.08" />
          <line x1={padL} y1={areaTop} x2={W - padR} y2={areaTop} stroke="#2D7D6F" strokeOpacity=".35" strokeDasharray="3 3" />
          <line x1={padL} y1={areaBot} x2={W - padR} y2={areaBot} stroke="#2D7D6F" strokeOpacity=".35" strokeDasharray="3 3" />
          <text x={W - padR} y={areaTop - 4} textAnchor="end" fill="#2D7D6F"
                style={{ font: '500 10.5px "JetBrains Mono"', letterSpacing: '.06em' }}>
            ZONA OBJETIVO 8–14
          </text>
          {[0, 10, 20, 30].map((t) => (
            <g key={t}>
              <line x1={padL} y1={yAt(t)} x2={W - padR} y2={yAt(t)} stroke="#EDEAE0" />
              <text x={padL - 8} y={yAt(t) + 3} textAnchor="end" fill="#9A958B"
                    style={{ font: '400 10.5px "JetBrains Mono"' }}>{t}</text>
            </g>
          ))}
          {[0, 4, 8, 13].map((i) => (
            <text key={i} x={xAt(i)} y={H - 10} textAnchor="middle" fill="#9A958B"
                  style={{ font: '400 10.5px "JetBrains Mono"' }}>{MORTALITY[i].d}</text>
          ))}
          <path d={path} fill="none" stroke="#0A2540" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
          {MORTALITY.map((p, i) => {
            const out = p.v > TARGET.hi || p.v < TARGET.lo;
            if (!out) return null;
            const isLast = i === MORTALITY.length - 1;
            return (
              <g key={i}>
                <circle cx={xAt(i)} cy={yAt(p.v)} r={isLast ? 4.5 : 2.5} fill={isLast ? '#E85C3C' : '#0A2540'} />
                {isLast && (
                  <>
                    <circle cx={xAt(i)} cy={yAt(p.v)} r="9" fill="none" stroke="#E85C3C" strokeOpacity=".25" />
                    <text x={xAt(i) - 8} y={yAt(p.v) - 10} textAnchor="end" fill="#0A0A0A"
                          style={{ font: '600 11px "JetBrains Mono"' }}>27</text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <footer className="flex items-center gap-5 px-5 py-3 border-t border-rule overflow-x-auto">
        <Stat label="acumulado 14d" value="237" />
        <Divider />
        <Stat label="tasa diaria"    value="1.8‰" tone="warn" />
        <Divider />
        <Stat label="biomasa actual" value="412 t" />
        <Divider />
        <Stat label="O₂ disuelto"    value="6.2 mg/L" tone="warn" />
      </footer>
    </figure>
  );
}

// ── 2. CausalAlert — banner artifact ────────────────────────────────────────
function CausalAlert() {
  return (
    <aside className="rise rounded-lg border border-warn/30 bg-[#FBF6E8]" style={{ animationDelay: '.12s' }}>
      <div className="flex gap-4 p-4">
        <div className="shrink-0 w-9 h-9 rounded-md bg-warn/15 text-warn flex items-center justify-center mt-0.5">
          <I.Warning size={18} stroke={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono-label text-warn">banner · variante causal · severidad media</span>
            <span className="mono-label text-ink3">·</span>
            <span className="mono-label text-ink3">confianza 84%</span>
          </div>
          <p className="font-display text-[16.5px] leading-snug tracking-tight mt-1 text-ink">
            La caída sostenida de O₂ disuelto bajo 6.5 mg/L correlaciona con el pico de
            mortalidad de los últimos 4 días.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 text-[12.5px]">
            <CauseStat label="O₂ medio · 72h"     value="6.2 mg/L" delta="−18%" bad />
            <CauseStat label="Temperatura · 72h"  value="14.7 °C"  delta="+1.2 °C" bad />
            <CauseStat label="Corriente · 72h"    value="0.08 m/s" delta="−42%" bad />
          </div>
          <div className="mt-3 flex items-center gap-4">
            <button className="text-[12.5px] text-navy underline decoration-rule underline-offset-4 hover:decoration-navy">
              Ver evidencia (3 series)
            </button>
            <button className="text-[12.5px] text-ink3 hover:text-ink">
              Descartar hipótesis
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
function CauseStat({ label, value, delta, bad }) {
  return (
    <div className="rounded-md bg-white/70 border border-warn/15 px-3 py-2">
      <div className="mono-label text-ink3">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-mono text-[13.5px] tabular-nums">{value}</span>
        <span className={`font-mono text-[11px] tabular-nums ${bad ? 'text-coral-2' : 'text-ok'}`}>{delta}</span>
      </div>
    </div>
  );
}

// ── 3. Prediction — artifact emitted by ML module via Central ───────────────
const PRED_HIST  = [{x:0,y:18},{x:1,y:21},{x:2,y:26},{x:3,y:24},{x:4,y:27}];
const PRED_FUTR  = [
  { x:4, y:27, lo:27, hi:27 },
  { x:5, y:29, lo:24, hi:33 },
  { x:6, y:30, lo:23, hi:37 },
  { x:7, y:28, lo:20, hi:36 },
  { x:8, y:25, lo:16, hi:34 },
  { x:9, y:22, lo:12, hi:32 },
  { x:10,y:19, lo:8,  hi:30 },
];

function PredictionChart() {
  const W = 640, H = 200, padL = 44, padR = 18, padT = 18, padB = 30;
  const minX = 0, maxX = 10, minV = 0, maxV = 40;
  const xAt = (x) => padL + ((x - minX) * (W - padL - padR)) / (maxX - minX);
  const yAt = (v) => padT + (1 - (v - minV) / (maxV - minV)) * (H - padT - padB);

  const histPath = PRED_HIST.map((p, i) => `${i ? 'L' : 'M'} ${xAt(p.x)} ${yAt(p.y)}`).join(' ');
  const predPath = PRED_FUTR.map((p, i) => `${i ? 'L' : 'M'} ${xAt(p.x)} ${yAt(p.y)}`).join(' ');
  const ciPath = (() => {
    const top = PRED_FUTR.map((p, i) => `${i ? 'L' : 'M'} ${xAt(p.x)} ${yAt(p.hi)}`).join(' ');
    const bot = [...PRED_FUTR].reverse().map((p) => `L ${xAt(p.x)} ${yAt(p.lo)}`).join(' ');
    return `${top} ${bot} Z`;
  })();

  return (
    <figure className="rise rounded-lg border border-rule bg-white" style={{ animationDelay: '.18s' }}>
      <ArtifactHeader
        kind="prediccion"
        kindClass="bg-[#5d4e8c]/10 text-[#5d4e8c]"
        subtitle="vía módulo ML · modelo mort-ar-v3 · 7d adelante"
        title="Mortalidad proyectada CTR-007 · próximos 7 días"
        right={
          <div className="text-right">
            <div className="font-mono text-[18px] tabular-nums tracking-tight text-warn">~ 165</div>
            <div className="mono-label text-ink3 mt-1">acumulado · IC 80%</div>
          </div>
        }
      />
      <div className="px-3 pt-3 pb-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
          {/* y grid */}
          {[0, 10, 20, 30, 40].map((t) => (
            <g key={t}>
              <line x1={padL} y1={yAt(t)} x2={W - padR} y2={yAt(t)} stroke="#EDEAE0" />
              <text x={padL - 8} y={yAt(t) + 3} textAnchor="end" fill="#9A958B"
                    style={{ font: '400 10.5px "JetBrains Mono"' }}>{t}</text>
            </g>
          ))}
          {/* forecast band */}
          <path d={ciPath} fill="#5d4e8c" fillOpacity=".12" stroke="none" />
          {/* divider hoy */}
          <line x1={xAt(4)} y1={padT} x2={xAt(4)} y2={H - padB} stroke="#9A958B" strokeDasharray="3 3" />
          <text x={xAt(4) + 4} y={padT + 10} fill="#9A958B"
                style={{ font: '500 9.5px "JetBrains Mono"', letterSpacing: '.06em' }}>HOY</text>
          {/* lines */}
          <path d={histPath} stroke="#0A2540" strokeWidth="1.75" fill="none" />
          <path d={predPath} stroke="#5d4e8c" strokeWidth="1.75" fill="none" strokeDasharray="0" />
          {/* dots */}
          {PRED_HIST.map((p, i) => <circle key={'h'+i} cx={xAt(p.x)} cy={yAt(p.y)} r="2.5" fill="#0A2540" />)}
          {PRED_FUTR.slice(1).map((p, i) => <circle key={'f'+i} cx={xAt(p.x)} cy={yAt(p.y)} r="2.5" fill="#5d4e8c" />)}
          {/* x labels */}
          {[0, 2, 4, 6, 8, 10].map((x) => (
            <text key={x} x={xAt(x)} y={H - 10} textAnchor="middle" fill="#9A958B"
                  style={{ font: '400 10.5px "JetBrains Mono"' }}>{`D${x - 4 >= 0 ? '+' : ''}${x - 4}`}</text>
          ))}
        </svg>
      </div>
      <footer className="flex items-center gap-5 px-5 py-3 border-t border-rule">
        <Stat label="modelo"        value="mort-ar-v3" mono />
        <Divider />
        <Stat label="confianza"     value="80%"        tone="warn" />
        <Divider />
        <Stat label="MAE entren."   value="3.4 u/día"  />
        <Divider />
        <Stat label="recomendación" value="aireación + muestreo" tone="warn" mono={false} />
      </footer>
    </figure>
  );
}

// ── 4. ActionStub — atajo que abre el panel Acciones ────────────────────────
function ActionStub() {
  const { openPanel, setView } = useApp();
  const { isEnabled, isLocked } = useApp();
  const locked = isLocked('acciones');
  const enabled = isEnabled('acciones');

  if (!enabled && !locked) return null; // hidden

  return (
    <aside
      className={[
        'rise rounded-lg border bg-white',
        locked ? 'border-rule opacity-70' : 'border-navy/15',
      ].join(' ')}
      style={{ animationDelay: '.24s' }}>
      <div className="flex items-center gap-3 p-3.5">
        <div className={[
          'shrink-0 w-9 h-9 rounded-md flex items-center justify-center',
          locked ? 'bg-rule text-ink3' : 'bg-navy/[.08] text-navy',
        ].join(' ')}>
          <I.Bolt size={17} stroke={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono-label text-ink3">acción propuesta · ENVIAR_CORREO</span>
            <RiskBadge level="medio" />
            <span className="mono-label text-ink3">· requiere aprobación</span>
          </div>
          <div className="font-display text-[15px] mt-0.5 tracking-tight text-ink">
            Notificar a <span className="font-mono text-[13px]">Hugo Salinas</span> ·
            Jefe Centro CTR-007
          </div>
        </div>
        {locked ? (
          <span className="flex items-center gap-1.5 text-[12px] text-ink3 px-3 py-1.5">
            <I.Lock size={12} /> módulo no incluido
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setView('actions'); }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-navy text-cream
                         hover:bg-navy-3 text-[12.5px] tracking-tight transition-colors
                         shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
              Revisar en panel
              <I.Chevron size={12} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function RiskBadge({ level }) {
  const map = {
    bajo:  ['bajo',  'text-ok bg-ok/10'],
    medio: ['medio', 'text-warn bg-warn/10'],
    alto:  ['alto',  'text-coral bg-coral/10'],
  };
  const [t, c] = map[level] || map.medio;
  return <span className={`mono-label rounded-sm px-1.5 py-0.5 normal-case tracking-wide ${c}`}>riesgo {t}</span>;
}

// ── 5. ReportStub — atajo que abre el preview del reporte ───────────────────
function ReportStub() {
  const { openPanel, isEnabled, isLocked } = useApp();
  const locked = isLocked('reportes');
  const enabled = isEnabled('reportes');
  if (!enabled && !locked) return null;

  return (
    <aside
      className={[
        'rise rounded-lg border bg-white',
        locked ? 'border-rule opacity-70' : 'border-rule',
      ].join(' ')}
      style={{ animationDelay: '.20s' }}>
      <div className="flex items-center gap-3 p-3.5">
        <div className="shrink-0 w-9 h-9 rounded-md bg-paper border border-rule
                        flex items-center justify-center text-[#0a6e3a]">
          <I.Excel size={18} stroke={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="mono-label text-ink3">archivo_descargable · xlsx · 42 KB</span>
          </div>
          <div className="font-display text-[15px] mt-0.5 tracking-tight text-ink">
            mortalidad_CTR-007_14d.xlsx
          </div>
        </div>
        {locked ? (
          <span className="flex items-center gap-1.5 text-[12px] text-ink3 px-3 py-1.5">
            <I.Lock size={12} /> Reportes no incluido
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openPanel('report-preview')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md
                         border border-rule bg-white hover:border-navy/40
                         text-[12.5px] text-ink2 hover:text-ink transition-colors">
              <I.Eye size={13} /> Vista previa
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-paper
                              hover:bg-rule/60 text-[12.5px] text-ink transition-colors">
              <I.Download size={13} /> Descargar
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

window.LineChart       = LineChart;
window.CausalAlert     = CausalAlert;
window.PredictionChart = PredictionChart;
window.ActionStub      = ActionStub;
window.ReportStub      = ReportStub;
