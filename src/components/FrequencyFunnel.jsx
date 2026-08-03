import React, { useMemo, useState } from 'react';
import { Repeat } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

/**
 * FrequencyFunnel - Embudo de Frecuencia de Compra
 * Shows how many clients bought 1 time, 2 times, 3 times, etc.
 * with revenue breakdown and expandable client lists.
 *
 * CRITICAL FIX: This funnel now correctly:
 *   1. FILTERS clients by the active date range (only shows clients who
 *      purchased within the selected period — matching Stats Cards total).
 *   2. CLASSIFIES each client by their ALL-TIME purchase count
 *      (allTimePurchaseCount) so that Jairo Carrasco with 2 total purchases
 *      always appears in "2 compras", even if only 1 purchase is in the
 *      current date range.
 *   3. REVENUE uses the date-filtered totalSpent to match dashboard totals.
 */
export default function FrequencyFunnel({ clients, onSelectClient }) {
  const [expandedTier, setExpandedTier] = useState(null);

  const tiers = useMemo(() => {
    const arr = clients || [];
    const groups = {};

    arr.forEach(c => {
      // Step 1: Only include clients who have purchases in the active date range
      // purchaseCount is date-filtered by App.jsx, so if it's 0 the client
      // had no purchases in the selected period → skip them.
      const filteredCount = c.purchaseCount ?? 0;
      if (filteredCount === 0) return;

      // Step 2: Classify by ALL-TIME purchase count (the real total)
      // This fixes the Jairo Carrasco bug — he has 2 total purchases so he
      // goes into the "2 compras" tier even if only 1 is in "Este Mes".
      const allTimeCount = c.allTimePurchaseCount ?? c.purchaseCount ?? 0;
      const key = allTimeCount >= 5 ? '5+' : String(allTimeCount);

      if (!groups[key]) groups[key] = { clients: [], revenue: 0, totalOrders: 0 };
      groups[key].clients.push(c);

      // Step 3: Revenue uses date-filtered amount to match dashboard totals
      groups[key].revenue += c.totalSpent ?? 0;
      groups[key].totalOrders += filteredCount;
    });

    const tierOrder = ['1', '2', '3', '4', '5+'];
    const totalClients = arr.filter(c => (c.purchaseCount ?? 0) > 0).length;
    const totalRevenue = arr.filter(c => (c.purchaseCount ?? 0) > 0)
      .reduce((s, c) => s + (c.totalSpent ?? 0), 0);
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
        clients: g.clients.sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0)),
      };
    });
  }, [clients]);
  const TIER_COLORS = ['#6366f1', '#6366f1', '#06B6D4', '#06b6d4', '#f43f5e'];

  const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <div style={{
      padding: 32,
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--on-surface)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Repeat size={20} color="var(--primary)" /> ¿Cuántas veces compran tus clientes?
            <MetricTooltip text="Muestra cuántas veces ha comprado cada cliente en total." />
          </h3>
          <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', margin: '4px 0 0' }}>Clientes clasificados por número de compras</p>
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
            <span>Frecuencia</span>
            <span>Distribucion</span>
            <span style={{ textAlign: 'center' }}>Clientes</span>
            <span style={{ textAlign: 'right' }}>Revenue</span>
            <span style={{ textAlign: 'right' }}>% Revenue</span>
            <span style={{ textAlign: 'right' }}>Ticket Prom.</span>
          </div>

          {/* Tier Rows */}
          {tiers.map((tier, idx) => {
            const color = TIER_COLORS[idx % TIER_COLORS.length];
            const isExpanded = expandedTier === tier.key;

            return (
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
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--surface-container-high)'; }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Segment Label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: color, flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--on-surface)' }}>{tier.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--outline)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>

                  {/* Bar */}
                  <div style={{ padding: '0 12px' }}>
                    <div style={{ background: 'var(--surface-container)', borderRadius: 4, height: 20, overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        width: `${tier.barWidth}%`, height: '100%',
                        background: `linear-gradient(90deg, ${color}CC, ${color})`,
                        borderRadius: 4, transition: 'width 0.6s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
                      }}>
                        {tier.barWidth > 15 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--on-surface)' }}>{tier.pct}%</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Count */}
                  <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, color }}>{tier.count}</span>

                  {/* Revenue */}
                  <span style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, color: 'var(--on-surface)' }}>{formatCurrency(tier.revenue)}</span>

                  {/* Revenue % */}
                  <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--on-surface-variant)' }}>{tier.revPct}%</span>

                  {/* Avg Ticket */}
                  <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--on-surface-variant)' }}>{formatCurrency(tier.avgTicket)}</span>
                </div>

                {/* Expanded Client List */}
                {isExpanded && tier.clients.length > 0 && (
                  <div style={{
                    background: 'var(--surface-container)', borderBottom: '1px solid var(--border-subtle)',
                    padding: '12px 20px 16px',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Clientes con {tier.label} ({tier.clients.length})
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
                          onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--on-surface-variant)'; }}
                        >
<span style={{ fontWeight: 500 }}>{c.name || c.email}</span>
                           <span style={{ color: 'var(--on-surface-variant)', fontSize: 11 }}>{formatCurrency(c.totalSpent ?? 0)}</span>
                        </button>
                      ))}
                      {tier.clients.length > 20 && (
                        <span style={{ padding: '5px 10px', fontSize: 12, color: 'var(--outline)' }}>
                          +{tier.clients.length - 20} mas
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        
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
            <span style={{ textAlign: 'right' }}>{formatCurrency(tiers.reduce((s, t) => s + t.revenue, 0) / Math.max(tiers.reduce((s, t) => s + t.count, 0), 1))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
