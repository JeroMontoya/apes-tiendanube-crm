import React, { useMemo } from 'react';

const ACCENT = '#6366f1';
const ACCENT_LIGHT = 'rgba(99,102,241,0.5)';

// Scoring thresholds - e-commerce benchmarks (COP)
const THRESHOLDS = {
  baseScore: 50,
  revenue: [
    { min: 100000, points: 10 },
    { min: 500000, points: 10 },
  ],
  orders: [
    { min: 20, points: 5 },
    { min: 100, points: 5 },
  ],
  repeatRate: [
    { min: 0.2, points: 5 },
    { min: 0.4, points: 5 },
  ],
  conversionRate: [
    { min: 0.02, points: 4 },
    { min: 0.04, points: 4 },
  ],
};

export default function PerformanceScoreGauge({ clients, metaInsights, ga4Insights }) {
  const score = useMemo(() => {
    let s = THRESHOLDS.baseScore;
    const c = clients || [];
    if (c.length > 0) {
      const revenue = c.reduce((sum, cl) => sum + (cl.totalSpent ?? 0), 0);
      const orders = c.reduce((sum, cl) => sum + (cl.purchaseCount ?? 0), 0);
      const repeat = c.filter(cl => (cl.purchaseCount ?? 0) > 1).length;
      const repeatRate = repeat / c.length;
      
      THRESHOLDS.revenue.forEach(t => { if (revenue > t.min) s += t.points; });
      THRESHOLDS.orders.forEach(t => { if (orders > t.min) s += t.points; });
      THRESHOLDS.repeatRate.forEach(t => { if (repeatRate > t.min) s += t.points; });
    }
    if (ga4Insights?.ecommerce?.totalPurchases > 0 && ga4Insights?.global?.sessions > 0) {
      const conversionRate = ga4Insights.ecommerce.totalPurchases / ga4Insights.global.sessions;
      THRESHOLDS.conversionRate.forEach(t => { if (conversionRate > t.min) s += t.points; });
    }
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
