interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

/**
 * A hand-rolled inline SVG trend line — no chart library (PROMPTS.md Phase
 * 10, #3). A ~14-point polyline doesn't need one; --muted, not --signal, since
 * a trend isn't time pressure.
 */
export default function Sparkline({ values, width = 120, height = 28 }: SparklineProps) {
  if (values.length === 0) return null;

  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke="var(--muted)" strokeWidth="1.5" />
    </svg>
  );
}
