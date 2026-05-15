type Bar = readonly [label: string, valor: number, target: number];

type Props = {
  bars: readonly Bar[];
  height?: number;
};

/**
 * Mini bar chart. Cada bar trae `[label, valor, target]`; pintamos
 * barra del valor con marca del target como línea horizontal.
 */
export default function MiniBar({ bars, height = 80 }: Props) {
  if (bars.length === 0) return null;
  const max = Math.max(...bars.flatMap((b) => [b[1], b[2]]));
  const barWidth = 100 / (bars.length * 1.5);
  const gap = barWidth * 0.5;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-label="Barras por entidad"
      style={{ height, width: '100%' }}
    >
      {bars.map((b, i) => {
        const x = i * (barWidth + gap) + gap / 2;
        const valor = b[1];
        const target = b[2];
        const bh = (valor / max) * 100;
        const th = (target / max) * 100;
        const alcanzaTarget = valor >= target;
        return (
          <g key={`${b[0]}-${i}`}>
            <rect
              x={x}
              y={100 - bh}
              width={barWidth}
              height={bh}
              fill={alcanzaTarget ? 'var(--color-ok, #2d7d6f)' : 'var(--color-coral, #e85c3c)'}
              opacity={0.85}
            />
            <line
              x1={x - 1}
              x2={x + barWidth + 1}
              y1={100 - th}
              y2={100 - th}
              stroke="var(--color-ink2, #5c5c5c)"
              strokeWidth={0.5}
              strokeDasharray="2 1"
            />
          </g>
        );
      })}
    </svg>
  );
}
