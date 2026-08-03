import React, { useMemo } from 'react';

const ACCENT = '#06b6d4';
const ACCENT_LIGHT = 'rgba(6, 182, 212,0.4)';

const CHANNEL_COLORS = {
  'Organic Search': '#06B6D4',
  'Direct': '#6366f1',
  'Social': '#8b5cf6',
  'Referral': '#06b6d4',
  'Email': '#E11D48',
  'Paid Search': '#06b6d4',
  'Display': '#8B5CF6',
  'Affiliaries': '#14b8a6',
  'Other': '#8B9BB4',
};

const CHANNEL_LABELS = {
  'Organic Search': 'Google / buscadores',
  'Direct': 'Visitas directas',
  'Social': 'Redes sociales',
  'Referral': 'Otros sitios',
  'Email': 'Email',
  'Paid Search': 'Publicidad',
  'Display': 'Display',
  'Affiliaries': 'Afiliados',
  'Other': 'Otros',
};

function DonutChart({ data, size = 140 }) {
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {data.map((seg, i) => {
        const segLength = (seg.pct / 100) * circumference;
        const rotation = (accumulated / 100) * 360;
        accumulated += seg.pct;
        return (
          <circle key={i}
            cx={size/2} cy={size/2} r={radius}
            fill="none" stroke={seg.color} strokeWidth={strokeWidth}
            strokeDasharray={`${segLength} ${circumference - segLength}`}
            strokeDashoffset={0}
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: '50% 50%',
              transition: 'all 0.8s ease',
            }}
          />
        );
      })}
    </svg>
  );
}

export default function TrafficSourcesDonut({ ga4Insights }) {
  const { sources, totalUsers } = useMemo(() => {
    if (!ga4Insights?.acquisition || ga4Insights.acquisition.length === 0) {
      return { sources: [], totalUsers: 0 };
    }

    const acquisition = ga4Insights.acquisition || [];
    const totalSessions = acquisition.reduce((sum, ch) => sum + (Number(ch.sessions) || 0), 0);
    
    if (totalSessions === 0) {
      return { sources: [], totalUsers: 0 };
    }

    const sources = acquisition
      .map((ch, i) => {
        const sessions = Number(ch.sessions) || 0;
        const pct = (sessions / totalSessions) * 100;
        const channelKey = ch.channel || 'Other';
        return {
          name: CHANNEL_LABELS[channelKey] || channelKey,
          pct: Math.round(pct * 10) / 10,
          color: CHANNEL_COLORS[channelKey] || CHANNEL_COLORS['Other'],
          sessions,
        };
      })
      .filter(s => s.pct > 0)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);

    const totalUsers = ga4Insights?.global?.activeUsers || totalSessions;

    return { sources, totalUsers };
  }, [ga4Insights]);

  if (sources.length === 0) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 280, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <h3 style={{ fontSize: 13, fontWeight: 500, margin: '0 0 12px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6 }}>
          ¿De dónde vienen tus visitas?
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, display: 'inline-block' }} />
        </h3>
        <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.6, textAlign: 'center', padding: '0 20px' }}>
          Conectá Google Analytics para ver las fuentes de tráfico
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: 280, height: '100%' }}>
      <h3 style={{ fontSize: 13, fontWeight: 500, margin: '0 0 20px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6 }}>
        ¿De dónde vienen tus visitas?
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, display: 'inline-block' }} />
      </h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
        {/* Donut */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <DonutChart data={sources} size={130} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--on-surface)' }}>{totalUsers.toLocaleString('es-CO')}</div>
            <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>Usuarios</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {sources.map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--on-background)', whiteSpace: 'nowrap' }}>{s.name}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)' }}>{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div 
        style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'ga4' }))}
      >
        <span style={{ fontSize: 12, color: ACCENT, fontWeight: 500 }}>Ver informe completo →</span>
      </div>
    </div>
  );
}
