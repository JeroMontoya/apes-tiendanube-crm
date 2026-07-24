import React, { useMemo } from 'react';

const ACCENT = '#6366f1';
const ACCENT_LIGHT = 'rgba(99,102,241,0.5)';

export default function PerformanceScoreGauge({ clients, metaInsights, ga4Insights }) {
  const score = useMemo(() => {
    let s = 50;
    const c = clients || [];
    if (c.length > 0) {
      const revenue = c.reduce((sum, cl) => sum + (cl.totalSpent ?? 0), 0);
      const orders = c.reduce((sum, cl) => sum + (cl.purchaseCount ?? 0), 0);
      if (revenue > 100000) s += 10;
      if (revenue > 500000) s += 10;
      if (orders > 20) s += 5;
      if (orders > 100) s += 5;
      const repeat = c.filter(cl => (cl.purchaseCount ?? 0) > 1).length;
      if (repeat > c.length * 0.2) s += 5;
      if (repeat > c.length * 0.4) s += 5;
    }
    if (ga4Insights?.conversionRate > 0.03) s += 4;
    if (ga4Insights?.conversionRate > 0.05) s += 4;
    return Math.min(100, Math.max(0, s));
  }, [clients, metaInsights, ga4Insights]);

  const label = score >= 80 ? 'Rendimiento excelente' : score >= 60 ? 'Rendimiento bueno' : score >= 40 ? 'Rendimiento promedio' : 'Necesita mejoras';

  // SVG circle gauge
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card bento-span-2" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 320, textAlign: 'center', gap: 16,
    }}>
      <h3 style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--on-surface-variant)' }}>
        ¿Qué tan bien va tu tienda?
      </h3>

      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Background ring */}
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={`${ACCENT}14`} strokeWidth={strokeWidth} />
          <circle cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={ACCENT} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
              filter: `drop-shadow(0 0 8px ${ACCENT}66)`,
            }}
          />
        </svg>
        {/* Score text */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: ACCENT, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--on-surface-variant)' }}>/{'\u200B'}100</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>{label}</span>
      </div>
    </div>
  );
}
