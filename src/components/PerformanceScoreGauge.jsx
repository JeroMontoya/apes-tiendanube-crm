import React, { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

export default function PerformanceScoreGauge({ clients, metaInsights, ga4Insights }) {
  const { score, trend, label, color } = useMemo(() => {
    // Basic calculation for the score
    let calculatedScore = 50; // Base score
    
    // Retention contribution (up to +20)
    const arr = clients || [];
    const withPurchases = arr.filter(c => (c.purchaseCount ?? 0) >= 1).length;
    const vipCount = arr.filter(c => (c.purchaseCount ?? 0) >= 2).length;
    const retention = withPurchases > 0 ? (vipCount / withPurchases) : 0;
    calculatedScore += Math.min(20, retention * 100);

    // ROAS contribution (up to +20)
    const revenue = arr.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0);
    const metaSpend = metaInsights?.global ? parseFloat(metaInsights.global.spend || 0) : 0;
    const roas = metaSpend > 0 ? (revenue / metaSpend) : 0;
    calculatedScore += Math.min(20, (roas / 4) * 20); // Assume 4x is perfect

    // Engagement contribution from GA4 (up to +10)
    const bounceRate = ga4Insights?.bounceRate || 0.5;
    calculatedScore += Math.min(10, (1 - bounceRate) * 10);

    const finalScore = Math.min(100, Math.max(0, Math.round(calculatedScore)));
    
    // Determine color and label
    let color = '#3b82f6'; // Blue
    let label = 'Rendimiento Bueno';
    if (finalScore >= 80) {
      color = '#10b981'; // Green
      label = 'Rendimiento Excelente';
    } else if (finalScore < 50) {
      color = '#f43f5e'; // Red
      label = 'Requiere Atención';
    }

    // Mock trend based on score
    const trend = finalScore > 60 ? '+5 pts' : '-2 pts';

    return { score: finalScore, trend, label, color };
  }, [clients, metaInsights, ga4Insights]);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="glass-card bento-span-4" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          Puntuación de rendimiento
          <MetricTooltip text="Puntaje general de salud de tu tienda basado en retención, ROAS e interacción.">
            <Target size={14} color="var(--on-surface-variant)" style={{ opacity: 0.7 }} />
          </MetricTooltip>
        </h3>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="80" cy="80" r={radius}
              fill="transparent"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="12"
            />
            <circle
              cx="80" cy="80" r={radius}
              fill="transparent"
              stroke={color}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)' }}>/100</span>
          </div>
        </div>
        
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            {trend.startsWith('+') ? <TrendingUp size={14} color="#10b981" /> : <TrendingDown size={14} color="#f43f5e" />}
            <span style={{ color: trend.startsWith('+') ? '#10b981' : '#f43f5e', fontWeight: 500 }}>{trend}</span>
            <span>vs período anterior</span>
          </div>
        </div>
      </div>
    </div>
  );
}
