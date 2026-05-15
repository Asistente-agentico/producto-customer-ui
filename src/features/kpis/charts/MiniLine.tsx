type Props = {
  series: number[];
  target?: { lo?: number; hi?: number };
  color?: string;
  height?: number;
};

/**
 * Mini line chart SVG sin dependencias (Recharts queda solo para el
 * artefacto `serie_temporal` del chat, que es interactivo).
 *
 * Renderiza la serie como path simple con dot al final. Si `target`
 * trae `lo`/`hi`, dibuja una banda horizontal de objetivo.
 */
export default function MiniLine({
  series,
  target,
  color = 'var(--color-coral, #e85c3c)',
  height = 60,
}: Props) {
  if (series.length === 0) return null;
  const min = Math.min(...series, target?.lo ?? Infinity);
  const max = Math.max(...series, target?.hi ?? -Infinity);
  const range = Math.max(max - min, 1e-6);
  const w = 100;
  const h = 100;
  const stepX = w / Math.max(series.length - 1, 1);

  const y = (v: number) => h - ((v - min) / range) * h;

  const points = series.map((v, i) => `${i * stepX},${y(v)}`).join(' ');
  const lastX = (series.length - 1) * stepX;
  const lastY = y(series[series.length - 1] ?? 0);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Serie temporal"
      style={{ height, width: '100%' }}
    >
      {target?.lo !== undefined && target?.hi !== undefined ? (
        <rect
          x={0}
          y={y(target.hi)}
          width={w}
          height={Math.max(y(target.lo) - y(target.hi), 0)}
          fill="var(--color-ok, #2d7d6f)"
          opacity={0.1}
        />
      ) : null}
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}
