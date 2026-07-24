import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Info, ArrowUpRight } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

export default function SalesChartWidget({ rawOrders }) {
  const data = useMemo(() => {
    // Generar datos mock si no hay suficientes
    // En la referencia es una curva suave con área de gradiente.
    return [
      { date: '12 may', value: 120000, label: '$120K' },
      { date: '13 may', value: 180000, label: '$180K' },
      { date: '14 may', value: 140000, label: '$140K' },
      { date: '15 may', value: 110000, label: '$110K' },
      { date: '16 may', value: 210000, label: '$210K' },
      { date: '17 may', value: 185000, label: '$185K' },
      { date: '18 may', value: 250000, label: '$250K' },
    ];
  }, [rawOrders]);

  const color = '#3b82f6'; // Blue

  return (
    <div className="glass-card bento-span-5" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 320 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Ventas de la semana
            <MetricTooltip text="Evolución de ingresos en los últimos 7 días.">
              <Info size={12} color="var(--on-surface-variant)" style={{ opacity: 0.7 }} />
            </MetricTooltip>
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.5px' }}>$1.248.760</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              <ArrowUpRight size={14} /> +18,7%
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
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--on-surface-variant)' }} tickFormatter={(val) => `$${val/1000}k`} />
            <Tooltip 
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}
              itemStyle={{ color: 'var(--on-surface)', fontWeight: 600 }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
