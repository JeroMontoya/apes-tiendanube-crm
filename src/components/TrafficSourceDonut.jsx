import React, { useMemo } from 'react';
import { Globe } from 'lucide-react';

const CHANNEL_LABELS = {
  'Organic Search': 'Búsqueda orgánica',
  'Direct': 'Directo',
  'Organic Social': 'Redes sociales',
  'Paid Social': 'Redes sociales (pago)',
  'Referral': 'Referidos',
  'Email': 'Email',
  'Paid Search': 'Búsqueda paga',
  'Unassigned': 'Sin clasificar',
};

const CHANNEL_COLORS = ['#d4a017', '#f59e0b', '#06B6D4', '#3b82f6', '#8b5cf6', '#f43f5e', '#06b6d4'];

export default function TrafficSourceDonut({ ga4Insights }) {
  const { channels, total } = useMemo(() => {
    const acquisition = ga4Insights?.acquisition || [];
    if (acquisition.length === 0) return { channels: [], total: 0 };

    const sorted = [...acquisition]
      .map(ch => ({ ...ch, sessions: Number(ch.sessions) || 0 }))
      .filter(ch => ch.sessions > 0)
      .sort((a, b) => b.sessions - a.sessions);

    const totalSessions = sorted.reduce((sum, ch) => sum + ch.sessions, 0) || 1;
    const top = sorted.slice(0, 5).map((ch, i) => ({
      name: CHANNEL_LABELS[ch.channel] || ch.channel,
      sessions: ch.sessions,
      pct: (ch.sessions / totalSessions) * 100,
      color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
    }));
    return { channels: top, total: totalSessions };
  }, [ga4Insights]);

  if (channels.length === 0) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
        <Globe size={22} style={{ opacity: 0.4 }} />
        <div style={{ fontSize: 12 }}>Conectá Google Analytics 4 para ver fuentes de tráfico</div>
      </div>
    );
  }

  let cumulative = 0;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const arcs = channels.map(ch => {
    const dash = (ch.pct / 100) * circumference;
    const arc = (
      <circle
        key={ch.name}
        cx="50" cy="50" r={radius} fill="none"
        stroke={ch.color} strokeWidth="14"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-((cumulative / 100) * circumference)}
      />
    );
    cumulative += ch.pct;
    return arc;
  });

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 600 }}>
        <Globe size={15} /> Fuentes de tráfico
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
        <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
          <svg width="110" height="110" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            {arcs}
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--on-surface)' }}>{total.toLocaleString('es-CO')}</div>
            <div style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>Usuarios</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          {channels.map(ch => (
            <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: ch.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--on-surface-variant)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.name}</span>
              <span style={{ color: 'var(--on-surface)', fontWeight: 700 }}>{ch.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
