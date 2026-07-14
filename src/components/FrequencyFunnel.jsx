import React, { useMemo, useState } from 'react';
import { Repeat } from 'lucide-react';

/**
 * FrequencyFunnel — Embudo de Frecuencia de Compra
 * Shows how many clients bought 1 time, 2 times, 3 times, etc.
 * with revenue breakdown and expandable client lists.
 */
export default function FrequencyFunnel({ clients, onSelectClient }) {
  const [expandedTier, setExpandedTier] = useState(null);

  const tiers = useMemo(() => {
    const arr = clients || [];
    const groups = {};

    arr.forEach(c => {
      const count = c.purchaseCount ?? 0;
      if (count === 0) return;
      const key = count >= 5 ? '5+' : String(count);
      if (!groups[key]) groups[key] = { clients: [], revenue: 0, totalOrders: 0 };
      groups[key].clients.push(c);
      groups[key].revenue += c.totalSpent ?? 0;
      groups[key].totalOrders += count;
    });

    const tierOrder = ['1', '2', '3', '4', '5+'];
    const totalClients = arr.filter(c => (c.purchaseCount ?? 0) > 0).length;
    const totalRevenue = arr.reduce((s, c) => s + (c.totalSpent ?? 0), 0);
    const maxClients = Math.max(...tierOrder.map(k => groups[k]?.clients.length || 0), 1);

    return tierOrder.map(key => {
      const g = groups[key] || { clients: [], revenue: 0, totalOrders: 0 };
      const count = g.clients.length;
      const pct = totalClients > 0 ? ((count / totalClients) * 100).toFixed(1) : '0.0';
      const revPct = totalRevenue > 0 ? ((g.revenue / totalRevenue) * 100).toFixed(1) : '0.0';
      const avgTicket = g.totalOrders > 0 ? g.revenue / g.totalOrders : 0;
      const barWidth = (count / maxClients) * 100;

      return {
        key,
        label: key === '5+' ? '5+ compras' : `${key} compra${key !== '1' ? 's' : ''}`,
        count,
        pct,
        revenue: g.revenue,
        revPct,
        avgTicket,
        barWidth,
        clients: g.clients.sort((a, b) => b.totalSpent - a.totalSpent),
      };
    });
  }, [clients]);

  const TIER_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];

  const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <div style={{
      padding: 32, 
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--on-surface)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Repeat size={20} color="#60a5fa" /> Embudo de Frecuencia de Compra
          </h3>
          <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>Distribución de clientes por número de compras realizadas</p>
        </div>
      </div>

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <div style={{ minWidth: 650 }}>
          {/* Header Row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '140px 1fr 80px 120px 100px 100px',
            padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)',
            textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--surface-container-low)', borderRadius: '8px 8px 0 0',
          }}>
        <span>Segmento</span>
        <span>Distribución</span>
        <span style={{ textAlign: 'center' }}>Clientes</span>
        <span style={{ textAlign: 'right' }}>Revenue</span>
        <span style={{ textAlign: 'right' }}>% Revenue</span>
        <span style={{ textAlign: 'right' }}>Ticket Prom.</span>
      </div>

      {/* Tier Rows */}
      {tiers.map((tier, idx) => (
        <div key={tier.key}>
          <div
            onClick={() => setExpandedTier(expandedTier === tier.key ? null : tier.key)}
            style={{
              display: 'grid', gridTemplateColumns: '140px 1fr 80px 120px 100px 100px',
              padding: '14px 12px', alignItems: 'center', cursor: 'pointer',
              borderBottom: '1px solid var(--surface-container)',
              background: expandedTier === tier.key ? 'var(--surface-container)' : 'transparent',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { if (expandedTier !== tier.key) e.currentTarget.style.background = 'var(--surface-container-high)'; }}
            onMouseLeave={e => { if (expandedTier !== tier.key) e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Segment Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: TIER_COLORS[idx], flexShrink: 0,
              }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--on-surface)' }}>{tier.label}</span>
              <span style={{ fontSize: 10, color: 'var(--outline)' }}>{expandedTier === tier.key ? '▲' : '▼'}</span>
            </div>

            {/* Bar */}
            <div style={{ padding: '0 12px' }}>
              <div style={{ background: 'var(--surface-container)', borderRadius: 4, height: 20, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${tier.barWidth}%`, height: '100%',
                  background: `linear-gradient(90deg, ${TIER_COLORS[idx]}CC, ${TIER_COLORS[idx]})`,
                  borderRadius: 4, transition: 'width 0.6s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                }}>
                  {tier.barWidth > 15 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#FFF' }}>{tier.pct}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Count */}
            <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, color: TIER_COLORS[idx] }}>{tier.count}</span>

            {/* Revenue */}
            <span style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--on-surface)' }}>{formatCurrency(tier.revenue)}</span>

            {/* Revenue % */}
            <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--on-surface-variant)' }}>{tier.revPct}%</span>

            {/* Avg Ticket */}
            <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--on-surface-variant)' }}>{formatCurrency(tier.avgTicket)}</span>
          </div>

          {/* Expanded Client List */}
          {expandedTier === tier.key && tier.clients.length > 0 && (
            <div style={{
              background: 'var(--surface-container)', borderBottom: '1px solid var(--border-subtle)',
              padding: '12px 20px 16px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 8 }}>
                Clientes con {tier.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tier.clients.slice(0, 20).map((c, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onSelectClient && onSelectClient(c); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 10px', borderRadius: 6,
                      background: 'var(--surface)', border: '1px solid var(--border-subtle)',
                      color: 'var(--on-surface-variant)', fontSize: 12, cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = TIER_COLORS[idx]; e.currentTarget.style.color = TIER_COLORS[idx]; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--on-surface-variant)'; }}
                  >
                    <span style={{ fontWeight: 500 }}>{c.name || c.email}</span>
                    <span style={{ color: 'var(--outline)', fontSize: 11 }}>{formatCurrency(c.totalSpent)}</span>
                  </button>
                ))}
                {tier.clients.length > 20 && (
                  <span style={{ padding: '5px 10px', fontSize: 12, color: 'var(--outline)' }}>
                    +{tier.clients.length - 20} más
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

          {/* Summary Footer */}
          <div style={{
            display: 'grid', gridTemplateColumns: '140px 1fr 80px 120px 100px 100px',
            padding: '12px', background: 'var(--surface-container-low)', borderRadius: '0 0 8px 8px',
            fontSize: 12, fontWeight: 700, color: 'var(--on-surface)', borderTop: '2px solid var(--border-subtle)',
          }}>
            <span>TOTAL</span>
            <span></span>
            <span style={{ textAlign: 'center' }}>{tiers.reduce((s, t) => s + t.count, 0)}</span>
            <span style={{ textAlign: 'right' }}>{formatCurrency(tiers.reduce((s, t) => s + t.revenue, 0))}</span>
            <span style={{ textAlign: 'right' }}>100%</span>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
