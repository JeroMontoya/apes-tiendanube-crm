import React, { useMemo } from 'react';
import { Gauge } from 'lucide-react';

/**
 * Puntuación de rendimiento (0-100), compuesta por señales reales ya
 * disponibles en el dashboard — no es un número decorativo:
 *  - Retención de clientes (peso 40%)
 *  - ROAS normalizado contra una meta de 3x (peso 35%)
 *  - Tendencia de pedidos de la semana, sube o baja (peso 25%)
 */
export default function PerformanceScoreGauge({ clients, metaInsights }) {
  const { score, label, retention, roasScore, trendScore } = useMemo(() => {
    const arr = clients || [];
    const withPurchases = arr.filter(c => (c.purchaseCount ?? 0) >= 1).length;
    const vipCount = arr.filter(c => (c.purchaseCount ?? 0) >= 2).length;
    const retentionPct = withPurchases > 0 ? (vipCount / withPurchases) * 100 : 0;

    const revenue = arr.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0);
    const spend = metaInsights?.global ? parseFloat(metaInsights.global.spend || 0) : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    const roasNorm = Math.min((roas / 3) * 100, 100); // 3x = meta = 100 pts

    let allPurchases = [];
    arr.forEach(c => { if (c.purchases) allPurchases.push(...c.purchases); });
    allPurchases.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let trendNorm = 50;
    if (allPurchases.length >= 2) {
      const mid = Math.floor(allPurchases.length / 2);
      const firstHalf = allPurchases.slice(0, mid).length;
      const secondHalf = allPurchases.slice(mid).length;
      const growth = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
      trendNorm = Math.max(0, Math.min(100, 50 + growth));
    }

    const composite = Math.round(retentionPct * 0.4 + roasNorm * 0.35 + trendNorm * 0.25);
    const finalScore = Math.max(0, Math.min(100, composite));

    let lbl = 'Necesita atención';
    if (finalScore >= 85) lbl = 'Rendimiento excelente';
    else if (finalScore >= 65) lbl = 'Buen rendimiento';
    else if (finalScore >= 45) lbl = 'Rendimiento moderado';

    return { score: finalScore, label: lbl, retention: retentionPct, roasScore: roasNorm, trendScore: trendNorm };
  }, [clients, metaInsights]);

  const circumference = 283;
  const color = score >= 85 ? '#06B6D4' : score >= 65 ? 'var(--primary)' : score >= 45 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 600 }}>
        <Gauge size={15} /> Puntuación de rendimiento
      </div>
      <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="140" height="140" viewBox="0 0 100 100" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle
            cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * score) / 100}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>/100</div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }} title="Retención de clientes, ROAS vs meta de 3x, y tendencia de pedidos">
        Basado en retención, ROAS y tendencia
      </div>
    </div>
  );
}
