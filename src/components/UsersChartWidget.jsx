import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Info, ArrowUpRight } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

export default function UsersChartWidget({ ga4Insights }) {
  const data = useMemo(() => {
    return [
      { date: '12 may', value: 21000 },
      { date: '13 may', value: 23500 },
      { date: '14 may', value: 22000 },
      { date: '15 may', value: 28000 },
      { date: '16 may', value: 27500 },
      { date: '17 may', value: 32000 },
      { date: '18 may', value: 28456 },
    ];
  }, [ga4Insights]);

  const color = '#8b5cf6'; // Purple

  return (
    <div className="glass-card bento-span-5" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Usuarios a lo largo del tiempo
            <MetricTooltip text="Tráfico web en los últimos 7 días.">
              <Info size={12} color="var(--on-surface-variant)" style={{ opacity: 0.7 }} />
            </MetricTooltip>
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.5px' }}>28.456</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              <ArrowUpRight size={14} /> +11,2%
            </span>
          </div>
        </div>
        <select style={{ 
          background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--on-surface)',
          padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer', outline: 'none'
        }}>
          <option value="7d">7 días</option>
          <option value="30d">30 días</option>
        </select>
      </div>

      <div style={{ flex: 1, width: '100%', marginLeft: -10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} tickFormatter={(val) => `${val/1000}k`} />
            <Tooltip 
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}
              itemStyle={{ color: 'var(--on-surface)', fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
