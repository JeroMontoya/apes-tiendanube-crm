import React, { useMemo } from 'react';
import { ShoppingCart, DollarSign, Eye, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

const ACCENT = '#06b6d4';
const ACCENT_LIGHT = 'rgba(6,182,212,0.4)';

function formatCurrency(v) {
  if (v >= 1000000) return `$${(v/1000000).toFixed(1)}M`;
  return `$${v.toLocaleString('es-CO')}`;
}

export default function QuickStatsPanel({ clients, ga4Insights }) {
  const stats = useMemo(() => {
    const c = clients || [];
    const totalOrders = c.reduce((s, cl) => s + (cl.purchaseCount ?? 0), 0);
    const revenue = c.reduce((s, cl) => s + (cl.totalSpent ?? 0), 0);
    const avgTicket = totalOrders > 0 ? revenue / totalOrders : 0;
    
    // Use real GA4 data if available
    const totalVisits = ga4Insights?.global?.sessions || 0;
    const bounceRate = ga4Insights?.global?.bounceRate ? (ga4Insights.global.bounceRate * 100).toFixed(1) : null;
    
    return [
      { 
        label: 'Pedidos totales', 
        value: totalOrders > 0 ? totalOrders.toLocaleString('es-CO') : '---', 
        icon: ShoppingCart,
        hasData: totalOrders > 0
      },
      { 
        label: 'Valor medio del pedido', 
        value: avgTicket > 0 ? formatCurrency(avgTicket) : '---', 
        icon: DollarSign,
        hasData: avgTicket > 0
      },
      { 
        label: 'Visitas totales', 
        value: totalVisits > 0 ? totalVisits.toLocaleString('es-CO') : '---', 
        icon: Eye,
        hasData: totalVisits > 0
      },
      { 
        label: 'Visitantes que se van sin comprar', 
        value: bounceRate ? `${bounceRate}%` : '---', 
        icon: TrendingUp,
        hasData: bounceRate !== null
      },
    ];
  }, [clients, ga4Insights]);

  return (
    <div className="glass-card bento-span-3" style={{ display: 'flex', flexDirection: 'column', minHeight: 280 }}>
      <h3 style={{ fontSize: 13, fontWeight: 500, margin: '0 0 20px', color: 'var(--on-surface-variant)' }}>
        Estadísticas rápidas
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 0',
              borderBottom: i < stats.length - 1 ? '1px solid rgba(99,102,241,0.06)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `${ACCENT}12`, border: `1px solid ${ACCENT}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={15} color={ACCENT} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.hasData ? 'var(--on-background)' : 'var(--on-surface-variant)', opacity: s.hasData ? 1 : 0.5 }}>{s.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
