import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight } from 'lucide-react';

const ACCENT = '#8b5cf6';
const ACCENT_LIGHT = 'rgba(139,92,246,0.4)';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${ACCENT}44`,
      borderRadius: 8, padding: '8px 14px', boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
    }}>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 4 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ACCENT }}>
        {payload[0].value?.toLocaleString('es-CO')}
      </p>
    </div>
  );
};

export default function ConversionsChartWidget({ rawOrders }) {
  const data = useMemo(() => {
    const orders = rawOrders || [];
    const byDay = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      byDay[key] = 0;
    }
    orders.forEach(o => {
      const d = new Date(o.created_at || o.date || new Date());
      const key = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      if (byDay[key] !== undefined) byDay[key] += 1;
    });
    return Object.entries(byDay).map(([date, value]) => ({ date, value }));
  }, [rawOrders]);
  
  const totalConversions = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="glass-card bento-span-3" style={{ display: 'flex', flexDirection: 'column', minHeight: 280 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Ventas realizadas
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, display: 'inline-block' }} />
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-background)', letterSpacing: '-0.5px' }}>{totalConversions.toLocaleString('es-CO')}</span>
          </div>
        </div>
        <select style={{
          background: `${ACCENT}12`, border: `1px solid ${ACCENT}33`,
          color: ACCENT, padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', outline: 'none'
        }}>
          <option value="7d">7 días</option>
          <option value="30d">30 días</option>
        </select>
      </div>

      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }} barCategoryGap="20%">
            <defs>
              <linearGradient id="convGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT_LIGHT} stopOpacity={0.9}/>
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0.5}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--on-surface-variant)' }} dy={6} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fontSize: 10, fill: 'var(--on-surface-variant)' }}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}K` : v} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: `${ACCENT}08` }} />
            <Bar dataKey="value" fill="url(#convGold)" radius={[3, 3, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div 
        style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'rendimiento' }))}
      >
        <span style={{ fontSize: 12, color: ACCENT, fontWeight: 500 }}>Ver embudo completo →</span>
      </div>
    </div>
  );
}
