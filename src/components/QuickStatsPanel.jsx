import React, { useMemo } from 'react';
import { ShoppingCart, Wallet, Eye, TrendingDown, Zap } from 'lucide-react';

export default function QuickStatsPanel({ clients, ga4Insights }) {
  const stats = useMemo(() => {
    const arr = clients || [];
    const totalOrders = arr.reduce((sum, c) => sum + (c.purchaseCount ?? 0), 0);
    const revenue = arr.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0);
    const avgTicket = totalOrders > 0 ? revenue / totalOrders : 0;
    const sessions = Number(ga4Insights?.global?.sessions) || 0;
    const bounceRate = Number(ga4Insights?.global?.bounceRate) || 0;

    return [
      { icon: ShoppingCart, label: 'Pedidos totales', value: totalOrders.toLocaleString('es-CO'), color: '#d4a017' },
      { icon: Wallet, label: 'Valor medio del pedido', value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(avgTicket), color: '#06B6D4' },
      { icon: Eye, label: 'Visitas totales', value: sessions > 0 ? sessions.toLocaleString('es-CO') : '---', color: '#3b82f6' },
      { icon: TrendingDown, label: 'Tasa de rebote', value: sessions > 0 ? `${bounceRate.toFixed(1)}%` : '---', color: '#f43f5e' },
    ];
  }, [clients, ga4Insights]);

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 600 }}>
        <Zap size={15} /> Estadísticas rápidas
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${s.color}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} color={s.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{s.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
