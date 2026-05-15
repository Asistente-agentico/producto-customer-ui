type Props = {
  valor: number;
  target: number;
  height?: number;
};

/**
 * Barra de progreso lineal contra un target. Útil para "peso medio"
 * y similares donde el valor se mide vs un objetivo único.
 */
export default function MiniProgress({ valor, target, height = 36 }: Props) {
  const max = Math.max(valor, target) * 1.1;
  const pctValor = Math.min(Math.max(valor / max, 0), 1);
  const pctTarget = Math.min(Math.max(target / max, 0), 1);
  const alcanzaTarget = valor >= target;

  return (
    <svg
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Progreso: ${valor} hacia ${target}`}
      style={{ height, width: '100%' }}
    >
      <rect x={0} y={4} width={100} height={12} rx={2} fill="var(--color-rule, #edeae0)" />
      <rect
        x={0}
        y={4}
        width={pctValor * 100}
        height={12}
        rx={2}
        fill={alcanzaTarget ? 'var(--color-ok, #2d7d6f)' : 'var(--color-coral, #e85c3c)'}
      />
      <line
        x1={pctTarget * 100}
        x2={pctTarget * 100}
        y1={2}
        y2={18}
        stroke="var(--color-ink2, #5c5c5c)"
        strokeWidth={1}
        strokeDasharray="2 1.5"
      />
    </svg>
  );
}
