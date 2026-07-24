import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Info, ArrowUpRight } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

const ACCENT = '#3b82f6';
const ACCENT_LIGHT = 'rgba(59,130,246,0.4)';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${ACCENT}44`,
      borderRadius: 8, padding: '8px 14px', boxShadow: `0 8px 32px rgba(0,0,0,0.5)`,
    }}>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 4 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ACCENT }}>
        value : {payload[0].value?.toLocaleString('es-CO')}
      </p>
    </div>
  );
};

export default function UsersChartWidget({ rawOrders }) {
  const data = useMemo(() => {
    const orders = rawOrders || [];
    const byDay = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      byDay[key] = new Set();
    }
    orders.forEach(o => {
      const d = new Date(o.created_at || o.date || new Date());
      const key = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
      if (byDay[key] !== undefined) {
        const customerId = o.customer?.email || o.customer?.id || o.id;
        byDay[key].add(customerId);
      }
    });
    return Object.entries(byDay).map(([date, usersSet]) => ({ date, value: usersSet.size }));
  }, [rawOrders]);

  const total = data[data.length - 1]?.value || 0;

  return (
    <div className="glass-card bento-span-5" style={{ display: 'flex', flexDirection: 'column', minHeight: 320 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 500, margin: 0, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Usuarios a lo largo del tiempo
            <MetricTooltip text="Evolución de usuarios únicos en los últimos 7 días.">
              <Info size={12} color="var(--on-surface-variant)" style={{ opacity: 0.6 }} />
            </MetricTooltip>
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--on-background)', letterSpacing: '-0.5px' }}>
              {total.toLocaleString('es-CO')}
            </span>
          </div>
        </div>
        <select style={{
          background: `${ACCENT}12`, border: `1px solid ${ACCENT}33`,
          color: ACCENT, padding: '5px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', outline: 'none'
        }}>
          <option value="7d">7 días</option>
          <option value="30d">30 días</option>
        </select>
      </div>

      <div style={{ flex: 1, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.4}/>
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" axisLine={false} tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} dy={8} />
            <YAxis axisLine={false} tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }}
              tickFormatter={(val) => val >= 1000 ? `${val/1000}K` : val} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={3}
              fillOpacity={1} fill="url(#goldArea)"
              dot={false} activeDot={{ r: 6, fill: ACCENT, stroke: 'var(--background)', strokeWidth: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
