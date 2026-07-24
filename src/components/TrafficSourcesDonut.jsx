import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart as PieChartIcon, Info } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

export default function TrafficSourcesDonut({ ga4Insights }) {
  const data = useMemo(() => {
    // If we have GA4 data, use it. Otherwise, mock it based on typical e-commerce distributions for the UI.
    if (ga4Insights?.trafficSources) {
      return ga4Insights.trafficSources;
    }
    
    return [
      { name: 'Búsqueda orgánica', value: 45.2, color: '#3b82f6' },
      { name: 'Directo', value: 27.1, color: '#8b5cf6' },
      { name: 'Redes sociales', value: 15.3, color: '#ec4899' },
      { name: 'Referidos', value: 8.7, color: '#10b981' },
      { name: 'Email', value: 3.7, color: '#f59e0b' }
    ];
  }, [ga4Insights]);

  const totalUsers = useMemo(() => {
    if (ga4Insights?.totalUsers) return ga4Insights.totalUsers;
    return 28456; // Mock total if no real data
  }, [ga4Insights]);

  return (
    <div className="glass-card bento-span-3" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PieChartIcon size={16} color="var(--primary)" /> Fuentes de tráfico
          <MetricTooltip text="Distribución de los canales por los que los usuarios llegan a tu tienda.">
            <Info size={14} color="var(--on-surface-variant)" style={{ opacity: 0.7 }} />
          </MetricTooltip>
        </h3>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ flex: 1, position: 'relative', minHeight: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: 'var(--surface-bright)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: 'var(--on-surface)' }}
                formatter={(value) => [`${value}%`, 'Tráfico']}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Text */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none'
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>{totalUsers.toLocaleString('es-CO')}</span>
            <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Usuarios</span>
          </div>
        </div>
        
        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {data.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                <span style={{ color: 'var(--on-surface-variant)' }}>{item.name}</span>
              </div>
              <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
