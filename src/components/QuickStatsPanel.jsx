import React from 'react';
import { ShoppingCart, DollarSign, Eye, Activity, ArrowUp, ArrowDown } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

export default function QuickStatsPanel({ clients, ga4Insights }) {
  // Aggregate stats
  const totalOrders = (clients || []).reduce((acc, c) => acc + (c.purchaseCount || 0), 0);
  const totalRevenue = (clients || []).reduce((acc, c) => acc + (c.totalSpent || 0), 0);
  const avgTicket = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
  
  const visits = ga4Insights?.totalUsers || 78932;
  const bounceRate = ga4Insights?.bounceRate ? (ga4Insights.bounceRate * 100) : 32.6;

  const stats = [
    {
      id: 'orders',
      icon: ShoppingCart,
      color: '#3b82f6',
      label: 'Pedidos totales',
      value: totalOrders.toLocaleString('es-CO'),
      trend: '+12.4%',
      trendUp: true
    },
    {
      id: 'ticket',
      icon: DollarSign,
      color: '#10b981',
      label: 'Valor medio del pedido',
      value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(avgTicket),
      trend: '+7.1%',
      trendUp: true
    },
    {
      id: 'visits',
      icon: Eye,
      color: '#f59e0b',
      label: 'Visitas totales',
      value: visits.toLocaleString('es-CO'),
      trend: '+11.8%',
      trendUp: true
    },
    {
      id: 'bounce',
      icon: Activity,
      color: '#f43f5e',
      label: 'Tasa de rebote',
      value: `${bounceRate.toFixed(1)}%`,
      trend: '-3.4%',
      trendUp: true // Lower is better for bounce rate, so we show it as "good"
    }
  ];

  return (
    <div className="glass-card bento-span-2" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 280, background: 'linear-gradient(180deg, var(--glass-bg) 0%, rgba(13, 17, 23, 0.4) 100%)' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 20px 0', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity size={18} color="var(--primary)" />
        Estadísticas rápidas
        <MetricTooltip text="Métricas clave de alto nivel de un vistazo.">
          <Info size={14} color="var(--on-surface-variant)" style={{ opacity: 0.7 }} />
        </MetricTooltip>
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        {stats.map((stat, i) => (
          <div key={stat.id} style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingBottom: i !== stats.length - 1 ? 16 : 0,
            borderBottom: i !== stats.length - 1 ? '1px solid var(--border-subtle)' : 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                width: 32, height: 32, borderRadius: 8, 
                background: `${stat.color}15`, color: stat.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <stat.icon size={16} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 500 }}>{stat.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>{stat.value}</div>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 4, 
              fontSize: 12, fontWeight: 600, 
              color: stat.trendUp ? '#10b981' : '#f43f5e' 
            }}>
              {stat.trendUp ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {stat.trend}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Needed because I forgot to import it at the top
import { Info } from 'lucide-react';
