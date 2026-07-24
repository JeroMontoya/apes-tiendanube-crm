import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Info, ArrowUpRight, ArrowRight } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

export default function ConversionsChartWidget({ rawOrders }) {
  const data = useMemo(() => {
    return [
      { date: '12 may', value: 800 },
      { date: '13 may', value: 1200 },
      { date: '14 may', value: 950 },
      { date: '15 may', value: 1500 },
      { date: '16 may', value: 1300 },
      { date: '17 may', value: 1750 },
      { date: '18 may', value: 1550 },
    ];
  }, [rawOrders]);

  const color = '#10b981'; // Green (but will use a gradient or fill)

  return (
    <div className="glass-card bento-span-3" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 300 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Conversiones
            <MetricTooltip text="Número total de conversiones por día.">
              <Info size={12} color="var(--on-surface-variant)" style={{ opacity: 0.7 }} />
            </MetricTooltip>
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.5px' }}>2.156</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              <ArrowUpRight size={14} /> +12,4%
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

      <div style={{ flex: 1, width: '100%', marginLeft: -25 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} tickFormatter={(val) => `${val/1000}k`} />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}
              itemStyle={{ color: 'var(--on-surface)', fontWeight: 600 }}
            />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
          Ver embudo completo <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}
