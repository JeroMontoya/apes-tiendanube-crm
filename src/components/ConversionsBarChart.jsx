import React, { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';

export default function ConversionsBarChart({ rawOrders }) {
  const { days, maxCount, total, deltaPct } = useMemo(() => {
    const orders = rawOrders || [];
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { date: d, label: d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }), count: 0 };
    });

    orders.forEach(o => {
      if (!o.created_at) return;
      const orderDate = new Date(o.created_at);
      buckets.forEach(b => {
        if (orderDate.toDateString() === b.date.toDateString()) b.count += 1;
      });
    });

    const max = Math.max(...buckets.map(b => b.count), 1);
    const totalOrders = buckets.reduce((sum, b) => sum + b.count, 0);
    const first = buckets[0].count;
    const last = buckets[buckets.length - 1].count;
    const pct = first > 0 ? ((last - first) / first) * 100 : (last > 0 ? 100 : 0);

    return { days: buckets, maxCount: max, total: totalOrders, deltaPct: pct };
  }, [rawOrders]);

  const isPositive = deltaPct >= 0;

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 600 }}>
          <BarChart2 size={15} /> Conversiones
        </div>
        <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 10 }}>7 días</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'baseline', gap: 8 }}>
        {total.toLocaleString('es-CO')}
        <span style={{ fontSize: 11, fontWeight: 700, color: isPositive ? '#06B6D4' : '#f43f5e' }}>
          {isPositive ? '↑' : '↓'} {Math.abs(deltaPct).toFixed(1)}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flex: 1, minHeight: 90 }}>
        {days.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
            <div
              title={`${d.label}: ${d.count} pedidos`}
              style={{
                width: '100%', maxWidth: 22,
                height: `${Math.max((d.count / maxCount) * 80, d.count > 0 ? 6 : 2)}px`,
                background: i === days.length - 1 ? 'var(--primary)' : 'linear-gradient(180deg, var(--primary) 0%, rgba(212,160,23,0.4) 100%)',
                borderRadius: 4,
                transition: 'height 0.6s ease-out',
              }}
            />
            <span style={{ fontSize: 8, color: 'var(--on-surface-variant)' }}>{d.label.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
