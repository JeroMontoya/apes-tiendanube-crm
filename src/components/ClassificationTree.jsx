import React, { useMemo, useState, useEffect } from 'react';

const SEGMENT_CONFIG = [
  {
    key: 'abandoned',
    icon: '🛒',
    label: 'Carrito Abandonado',
    filter: (c) => (c.purchaseCount ?? 0) === 0,
    accentColor: '#EF4444',
    accentBg: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    glowColor: 'rgba(239, 68, 68, 0.15)',
  },
  {
    key: 'regular',
    icon: '🛍️',
    label: 'Cliente Regular',
    filter: (c) => (c.purchaseCount ?? 0) === 1,
    accentColor: '#3B82F6',
    accentBg: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    glowColor: 'rgba(59, 130, 246, 0.15)',
  },
  {
    key: 'vip',
    icon: '🌟',
    label: 'Cliente VIP',
    filter: (c) => (c.purchaseCount ?? 0) >= 2,
    accentColor: '#F59E0B',
    accentBg: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    glowColor: 'rgba(245, 158, 11, 0.15)',
  },
];

function formatARS(val) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
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
    const timers = SEGMENT_CONFIG.map((_, i) =>
      setTimeout(() => {
        setVisible(prev => [...prev, i]);
      }, 200 + i * 200)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const segmentData = useMemo(() => {
    const arr = clients || [];
    const total = arr.length || 1;

    return SEGMENT_CONFIG.map(cfg => {
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
    </div>
  );
}
