import React, { useMemo, useState, useEffect } from 'react';

const LIFECYCLE_CONFIG = [
  {
    key: 'sin_compra',
    icon: '🛒',
    label: 'Leads / Abandonos',
    filter: (c) => c.segmentTags?.includes('sin_compra'),
    accentColor: '#E11D48',
    accentBg: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    glowColor: 'rgba(239, 68, 68, 0.15)',
  },
  {
    key: 'nuevo',
    icon: '🌱',
    label: 'Clientes Nuevos (1)',
    filter: (c) => c.segmentTags?.includes('nuevo'),
    accentColor: '#06B6D4',
    accentBg: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    glowColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    key: 'repetidor',
    icon: '🔄',
    label: 'Repetidores (2-3)',
    filter: (c) => c.segmentTags?.includes('repetidor'),
    accentColor: '#6366f1',
    accentBg: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    glowColor: 'rgba(99, 102, 241, 0.15)',
  },
  {
    key: 'fiel',
    icon: '👑',
    label: 'Clientes Fieles (4+)',
    filter: (c) => c.segmentTags?.includes('fiel'),
    accentColor: '#8B5CF6',
    accentBg: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    glowColor: 'rgba(139, 92, 246, 0.15)',
  },
];

const BEHAVIORAL_CONFIG = [
  { key: 'alto_valor', label: 'Alto Valor', icon: '💎', color: 'var(--primary-container)', filter: c => c.segmentTags?.includes('alto_valor') },
  { key: 'riesgo_churn', label: 'Riesgo Fuga', icon: '⚠️', color: '#F97316', filter: c => c.segmentTags?.includes('riesgo_churn') },
  { key: 'dormido', label: 'Dormidos', icon: '💤', color: '#6B7280', filter: c => c.segmentTags?.includes('dormido') },
  { key: 'sensible_precio', label: 'Caza Descuentos', icon: '🎟️', color: '#8B5CF6', filter: c => c.segmentTags?.includes('sensible_precio') },
  { key: 'vip_coleccion', label: 'Ed. Limitadas', icon: '🎨', color: '#06B6D4', filter: c => c.segmentTags?.includes('vip_coleccion') },
];

function formatARS(val) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
}

const s = {
  container: {
    fontFamily: "'Montserrat', sans-serif",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--on-surface)',
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  treeWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    position: 'relative',
  },
  connector: {
    display: 'flex',
    justifyContent: 'center',
    height: 40,
    position: 'relative',
  },
  connectorLine: {
    width: 2,
    height: '100%',
    background: 'linear-gradient(180deg, var(--border-subtle), transparent)',
  },
  connectorArrow: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    transform: 'translateX(-50%)',
    color: '#D1D5DB',
    fontSize: 14,
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 16,
    padding: '24px',
    border: '1px solid var(--border-subtle)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 0,
    transform: 'translateY(20px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardVisible: {
    opacity: 1,
    transform: 'translateY(0)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  segmentTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--on-surface)',
  },
  segmentIcon: {
    fontSize: 24,
  },
  statsRow: {
    display: 'flex',
    gap: 24,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 800,
    color: 'var(--on-surface)',
  },
  percentBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
  },
  topClients: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid var(--border-subtle)',
  },
  topTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  clientChip: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 6,
    background: 'var(--surface-container)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--on-surface-variant)',
    fontSize: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  avgSpend: {
    fontSize: 12,
    color: 'var(--on-surface-variant)',
    marginTop: 8,
  },
};

export default function ClassificationTree({ clients }) {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    const timers = LIFECYCLE_CONFIG.map((_, i) =>
      setTimeout(() => {
        setVisible(prev => [...prev, i]);
      }, 200 + i * 200)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const segmentData = useMemo(() => {
    const arr = clients || [];
    const total = arr.length || 1;

    return LIFECYCLE_CONFIG.map(cfg => {
      const members = arr.filter(cfg.filter);
      const count = members.length;
      const pct = ((count / total) * 100).toFixed(1);
      const avgSpend = count > 0
        ? members.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0) / count
        : 0;
      const top3 = members
        .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))
        .slice(0, 3)
        .map(c => c.name || c.email || 'Sin nombre');

      return { ...cfg, count, pct, avgSpend, top3 };
    });
  }, [clients]);

  const behavioralStats = useMemo(() => {
    const arr = clients || [];
    const total = arr.length || 1;
    return BEHAVIORAL_CONFIG.map(cfg => {
      const count = arr.filter(cfg.filter).length;
      return { ...cfg, count, pct: ((count / total) * 100).toFixed(1) };
    });
  }, [clients]);

  return (
    <div style={s.container}>
      <div style={s.title}>
        🏷️ Árbol de Clasificación
      </div>

      <div style={s.treeWrapper}>
        {segmentData.map((seg, idx) => (
          <React.Fragment key={seg.key}>
            {/* Connector between cards */}
            {idx > 0 && (
              <div style={s.connector}>
                <div style={s.connectorLine} />
                <span style={s.connectorArrow}>▼</span>
              </div>
            )}

            {/* Segment Card */}
            <div
              style={{
                ...s.card,
                borderLeft: `3px solid ${seg.accentColor}`,
                boxShadow: `0 0 30px ${seg.glowColor}`,
                ...(visible.includes(idx) ? s.cardVisible : {}),
                transitionDelay: `${idx * 0.1}s`,
              }}
            >
              <div style={s.cardHeader}>
                <div style={s.segmentTitle}>
                  <span style={s.segmentIcon}>{seg.icon}</span>
                  <span>{seg.label}</span>
                </div>
                <span
                  style={{
                    ...s.percentBadge,
                    background: seg.accentBg,
                    color: seg.accentColor,
                    border: `1px solid ${seg.borderColor}`,
                  }}
                >
                  {seg.pct}%
                </span>
              </div>

              <div style={s.statsRow}>
                <div style={s.stat}>
                  <span style={s.statLabel}>Clientes</span>
                  <span style={{ ...s.statValue, color: seg.accentColor }}>{seg.count}</span>
                </div>
                <div style={s.stat}>
                  <span style={s.statLabel}>Gasto Promedio</span>
                  <span style={s.statValue}>{formatARS(seg.avgSpend)}</span>
                </div>
              </div>

              {seg.top3.length > 0 && (
                <div style={s.topClients}>
                  <div style={s.topTitle}>Top Clientes</div>
                  {seg.top3.map((name, i) => (
                    <span key={i} style={s.clientChip}>{name}</span>
                  ))}
                </div>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div style={{ ...s.title, marginTop: 32, fontSize: 16 }}>
        🧠 Segmentos de Comportamiento
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {behavioralStats.map(b => (
          <div key={b.key} style={{ 
            background: 'var(--surface-container)', 
            padding: '12px 16px', 
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 140,
            flex: 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{b.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: b.color }}>{b.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)' }}>{b.count}</span>
              <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 600 }}>{b.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
