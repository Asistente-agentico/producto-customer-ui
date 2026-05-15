// KPI Band — franja minimal: solo números coloreados según cota.
// Click expande inline con detalle + gráfico. Múltiples expandibles a la vez.

const { useState: useStateK } = React;

const SEV_COLOR = {
  ok:   { text: 'text-ok',    dot: 'bg-ok',    hover: 'hover:bg-ok/5'    },
  warn: { text: 'text-warn',  dot: 'bg-warn',  hover: 'hover:bg-warn/5'  },
  bad:  { text: 'text-coral', dot: 'bg-coral', hover: 'hover:bg-coral/5' },
};

function KpiBand() {
  const { kpisUsuario, isEnabled, kpiBandOpen, setKpiBandOpen } = useApp();
  const [openIds, setOpenIds] = useStateK(new Set());

  if (!isEnabled('kpis') || !kpiBandOpen) return null;

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="shrink-0 bg-[#FFFCF5] border-b border-rule">
      <div className="px-5 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-ok pulse-dot" />
            <span className="mono-label text-ink3">Tus KPIs · vivo</span>
            <span className="mono-label text-ink3 normal-case tracking-normal text-[10px]">
              configurados según rol + gerencia
            </span>
          </div>
          <button
            onClick={() => setKpiBandOpen(false)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded
                       text-ink3 hover:text-ink hover:bg-rule/60 transition-colors text-[11px]"
            title="Ocultar franja de KPIs">
            <span>ocultar</span>
            <I.X size={10} />
          </button>
        </div>
        <div className="flex items-stretch gap-1">
          {kpisUsuario.map((k, i) => (
            <React.Fragment key={k.id}>
              {i > 0 && <span className="w-px bg-rule/70 my-1" />}
              <KpiCell k={k} open={openIds.has(k.id)} onToggle={() => toggle(k.id)} />
            </React.Fragment>
          ))}
        </div>

        {Array.from(openIds).map((id) => {
          const k = kpisUsuario.find((x) => x.id === id);
          if (!k) return null;
          return <KpiDetail key={id} k={k} onClose={() => toggle(id)} />;
        })}
      </div>
    </div>
  );
}

function KpiCell({ k, open, onToggle }) {
  const sev = SEV_COLOR[k.severity] || SEV_COLOR.ok;
  return (
    <button
      onClick={onToggle}
      className={[
        'flex-1 flex items-center gap-2.5 px-3 py-1.5 rounded-md transition-colors text-left',
        open ? 'bg-white shadow-[inset_0_0_0_1px_rgba(10,37,64,.12)]' : sev.hover,
      ].join(' ')}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sev.dot}`} />
      <span className="min-w-0 flex-1">
        <span className="mono-label text-ink3 normal-case tracking-normal text-[10px] truncate block">
          {k.label}
        </span>
        <span className={`font-mono text-[15px] tabular-nums font-medium leading-none ${sev.text}`}>
          {k.value}
        </span>
      </span>
      <I.ChevronDown size={10}
        className={['text-ink3 transition-transform shrink-0', open ? 'rotate-180' : ''].join(' ')} />
    </button>
  );
}

function KpiDetail({ k, onClose }) {
  const sev = SEV_COLOR[k.severity] || SEV_COLOR.ok;
  return (
    <div className="rise mt-2 rounded-md bg-white border border-rule overflow-hidden"
         style={{ animationDuration: '.25s' }}>
      <header className="flex items-baseline justify-between gap-3 px-4 py-2.5 border-b border-rule">
        <div className="flex items-baseline gap-3 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 self-center ${sev.dot}`} />
          <span className="font-display text-[14px] tracking-tight">{k.label}</span>
          <span className="mono-label text-ink3 normal-case tracking-normal text-[10.5px] truncate">
            {k.subtitle}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`font-mono text-[15px] tabular-nums ${sev.text}`}>{k.value}</span>
          <span className={[
            'font-mono text-[11px] tabular-nums',
            k.severity === 'ok' ? 'text-ok' :
            k.severity === 'warn' ? 'text-warn' : 'text-coral',
          ].join(' ')}>{k.delta}</span>
          <button onClick={onClose}
                  className="p-1 -m-1 rounded text-ink3 hover:text-ink hover:bg-rule/60"
                  title="Cerrar">
            <I.X size={12} />
          </button>
        </div>
      </header>

      <div className="px-4 py-3">
        <KpiChart k={k} />
        {k.stats && (
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-rule">
            {k.stats.map(([label, val], i) => (
              <div key={i}>
                <div className="mono-label text-ink3 truncate">{label}</div>
                <div className="font-mono text-[12px] tabular-nums mt-0.5 truncate">{val}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiChart({ k }) {
  if (k.chart === 'line')     return <LineMini series={k.series} target={k.target} severity={k.severity} />;
  if (k.chart === 'bar')      return <BarMini  bars={k.bars} />;
  if (k.chart === 'gauge')    return <GaugeMini value={k.gaugeValue} min={k.gaugeMin} max={k.gaugeMax} target={k.gaugeTarget} severity={k.severity} />;
  if (k.chart === 'progress') return <ProgressMini progress={k.progress} severity={k.severity} />;
  return null;
}

const SEV_HEX = { ok: '#2D7D6F', warn: '#B8860B', bad: '#E85C3C' };

function LineMini({ series, target, severity }) {
  const W = 600, H = 100, padL = 36, padR = 14, padT = 8, padB = 18;
  const xs = series.length;
  const max = Math.max(...series, target ? target.hi : -Infinity);
  const min = Math.min(...series, target ? target.lo : Infinity, 0);
  const range = max - min || 1;
  const xAt = (i) => padL + (i * (W - padL - padR)) / (xs - 1);
  const yAt = (v) => padT + (1 - (v - min) / range) * (H - padT - padB);
  const path = series.map((v, i) => `${i ? 'L' : 'M'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(' ');
  const lineColor = SEV_HEX[severity] || '#0A2540';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      {target && (
        <rect x={padL} y={yAt(target.hi)} width={W - padL - padR}
              height={yAt(target.lo) - yAt(target.hi)}
              fill="#2D7D6F" fillOpacity=".10" />
      )}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#EDEAE0" />
      <path d={path} fill="none" stroke={lineColor} strokeWidth="1.6"
            strokeLinejoin="round" strokeLinecap="round" />
      {series.map((v, i) => (
        <circle key={i} cx={xAt(i)} cy={yAt(v)} r={i === series.length - 1 ? 3 : 1.5}
                fill={i === series.length - 1 ? lineColor : '#0A2540'} />
      ))}
      <text x={padL - 4} y={yAt(max) + 3} textAnchor="end" fill="#9A958B"
            style={{ font: '400 9px "JetBrains Mono"' }}>{max}</text>
      <text x={padL - 4} y={yAt(min) - 0} textAnchor="end" fill="#9A958B"
            style={{ font: '400 9px "JetBrains Mono"' }}>{min}</text>
    </svg>
  );
}

function BarMini({ bars }) {
  const W = 600, H = 100, padL = 60, padR = 50, padT = 8, padB = 8;
  const max = Math.max(...bars.map(([, v, t]) => Math.max(v, t)));
  const bandH = (H - padT - padB) / bars.length;
  const xAt = (v) => padL + (v / max) * (W - padL - padR);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      {bars.map(([label, val, target], i) => {
        const y = padT + i * bandH + bandH / 2;
        const ok = val >= target;
        const barH = bandH * 0.55;
        return (
          <g key={label}>
            <text x={padL - 6} y={y + 3} textAnchor="end" fill="#5C5C5C"
                  style={{ font: '500 10px "JetBrains Mono"' }}>{label}</text>
            <line x1={xAt(target)} y1={y - barH / 2 - 1} x2={xAt(target)} y2={y + barH / 2 + 1}
                  stroke="#9A958B" strokeDasharray="2 2" />
            <rect x={padL} y={y - barH / 2} width={Math.max(2, xAt(val) - padL)} height={barH}
                  fill={ok ? '#2D7D6F' : '#E85C3C'} fillOpacity=".75" rx="1" />
            <text x={xAt(val) + 4} y={y + 3} textAnchor="start" fill="#0A0A0A"
                  style={{ font: '600 10px "JetBrains Mono"' }}>{val} t</text>
          </g>
        );
      })}
    </svg>
  );
}

function GaugeMini({ value, min, max, target, severity }) {
  const cx = 100, cy = 90, r = 70;
  const arcAngle = (val) => {
    const norm = (val - min) / (max - min);
    return -180 + norm * 180;
  };
  const polarToCart = (angle, radius) => {
    const rad = (angle * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const arcPath = (startAngle, endAngle, radius) => {
    const [x1, y1] = polarToCart(startAngle, radius);
    const [x2, y2] = polarToCart(endAngle, radius);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const valueColor = SEV_HEX[severity] || '#0A2540';

  return (
    <svg viewBox="0 0 200 110" className="w-full max-h-[110px]" preserveAspectRatio="xMidYMid meet">
      <path d={arcPath(-180, 0, r)} fill="none" stroke="#EDEAE0" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(-180, arcAngle(value), r)} fill="none" stroke={valueColor} strokeWidth="10" strokeLinecap="round" />
      <line x1={polarToCart(arcAngle(target), r - 14)[0]} y1={polarToCart(arcAngle(target), r - 14)[1]}
            x2={polarToCart(arcAngle(target), r + 6)[0]} y2={polarToCart(arcAngle(target), r + 6)[1]}
            stroke="#0A2540" strokeWidth="1.5" />
      <text x={cx} y={cy - 10} textAnchor="middle" fill="#0A0A0A"
            style={{ font: '600 22px "JetBrains Mono"' }}>{value.toFixed(2)}</text>
      <text x={cx} y={cy + 5} textAnchor="middle" fill="#9A958B"
            style={{ font: '500 9px "JetBrains Mono"', letterSpacing: '.06em' }}>
        OBJETIVO ≤ {target}
      </text>
    </svg>
  );
}

function ProgressMini({ progress, severity }) {
  const pct = Math.min(100, (progress.value / progress.target) * 100);
  const color = severity === 'ok' ? 'bg-ok' : severity === 'warn' ? 'bg-warn' : 'bg-coral';
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-mono text-[22px] tabular-nums tracking-tight">
          {progress.value.toFixed(2)} kg
        </span>
        <span className="mono-label text-ink3">objetivo · {progress.target} kg</span>
      </div>
      <div className="h-3 rounded-full bg-rule overflow-hidden relative">
        <div className={['h-full transition-all rounded-full', color].join(' ')}
             style={{ width: `${pct}%` }} />
        <div className="absolute top-0 right-0 h-full w-px bg-navy/40" />
      </div>
      <div className="mt-1 flex items-center justify-between mono-label text-ink3 normal-case tracking-normal text-[10px]">
        <span>0 kg</span>
        <span className="font-medium">{pct.toFixed(0)}% del objetivo</span>
        <span>{progress.target} kg</span>
      </div>
    </div>
  );
}

window.KpiBand = KpiBand;
