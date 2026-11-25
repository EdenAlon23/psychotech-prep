/** Lightweight SVG charts – no chart library needed for these two shapes. */

export function accuracyColor(acc: number): string {
  if (acc >= 0.8) return 'var(--good)';
  if (acc >= 0.6) return 'var(--warn)';
  return 'var(--bad)';
}

export function BarList({ rows }: { rows: { label: string; value: number; hint?: string }[] }) {
  return (
    <div>
      {rows.map((r) => (
        <div className="bar-row" key={r.label} title={r.hint}>
          <span>{r.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(2, r.value * 100)}%`, background: accuracyColor(r.value) }} />
          </div>
          <strong className="small">{Math.round(r.value * 100)}%</strong>
        </div>
      ))}
    </div>
  );
}

export function LineChart({ points, height = 180 }: { points: { label: string; value: number }[]; height?: number }) {
  if (points.length === 0) return <div className="empty">אין עדיין נתונים</div>;
  const W = 600;
  const H = height;
  const pad = { t: 14, r: 16, b: 26, l: 34 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / 100) * ih;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="גרף ציונים לאורך זמן" style={{ direction: 'ltr' }}>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--border)" />
          <text x={pad.l - 6} y={y(g) + 4} textAnchor="end">{g}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="4.5" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5">
            <title>{`${p.label}: ${p.value}%`}</title>
          </circle>
          {(points.length <= 8 || i % Math.ceil(points.length / 8) === 0) && (
            <text x={x(i)} y={H - 8} textAnchor="middle">{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function Ring({ value, size = 96, label }: { value: number; size?: number; label?: string }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${Math.round(value * 100)}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={accuracyColor(value)} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`} transform="rotate(-90 50 50)"
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 20, fontWeight: 800, fill: 'var(--text)' }}>
        {Math.round(value * 100)}%
      </text>
      {label && <text x="50" y="68" textAnchor="middle" style={{ fontSize: 9, fill: 'var(--muted)' }}>{label}</text>}
    </svg>
  );
}
