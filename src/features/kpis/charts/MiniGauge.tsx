type Props = {
  valor: number;
  min: number;
  max: number;
  target: number;
  height?: number;
};

/**
 * Mini gauge semi-circular. Marca el valor actual sobre un arco con
 * target marcado por una línea radial.
 */
export default function MiniGauge({ valor, min, max, target, height = 80 }: Props) {
  const range = Math.max(max - min, 1e-6);
  const pctValor = Math.min(Math.max((valor - min) / range, 0), 1);
  const pctTarget = Math.min(Math.max((target - min) / range, 0), 1);

  const cx = 50;
  const cy = 50;
  const r = 40;

  // Arc va de 180° (izq) a 0° (der). Convertimos % a ángulo.
  function angle(pct: number) {
    return Math.PI - pct * Math.PI;
  }
  function point(pct: number, radius: number) {
    const a = angle(pct);
    return [cx + radius * Math.cos(a), cy - radius * Math.sin(a)];
  }

  const bgArc = describeArc(cx, cy, r, 180, 0);
  const valArc = describeArc(cx, cy, r, 180, 180 - pctValor * 180);
  const [tx, ty] = point(pctTarget, r + 4);
  const [tix, tiy] = point(pctTarget, r - 4);
  const alcanzaTarget = valor >= target;

  return (
    <svg
      viewBox="0 0 100 60"
      role="img"
      aria-label={`Gauge: ${valor} (target ${target})`}
      style={{ height, width: '100%' }}
    >
      <path d={bgArc} stroke="var(--color-rule, #edeae0)" strokeWidth={6} fill="none" />
      <path
        d={valArc}
        stroke={alcanzaTarget ? 'var(--color-ok, #2d7d6f)' : 'var(--color-coral, #e85c3c)'}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
      <line x1={tx} y1={ty} x2={tix} y2={tiy} stroke="var(--color-ink2, #5c5c5c)" strokeWidth={1} />
    </svg>
  );
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const startRad = ((startDeg - 90) * Math.PI) / 180;
  const endRad = ((endDeg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endDeg - startDeg <= 180 ? '0' : '1';
  // Going clockwise from start to end (sweep = 0 because endRad < startRad).
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`;
}
