import React, { useMemo, useState } from 'react';

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
    fontFamily: "'Montserrat', sans-serif",
  },
  card: {
    background: 'var(--surface)',
    borderRadius: 16,
    padding: '24px 20px',
    border: '1px solid var(--border-subtle)',
    cursor: 'default',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardHover: {
    transform: 'translateY(-4px)',
    border: '1px solid #D1D5DB',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--on-surface-variant)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  value: {
    fontSize: 28,
    fontWeight: 800,
    color: 'var(--on-surface)',
    letterSpacing: -0.5,
  },
  sparkle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: '50%',
    opacity: 0,
    transition: 'opacity 0.4s ease',
    filter: 'blur(20px)',
  },
  sparkleVisible: {
    opacity: 0.3,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
    transition: 'left 0.6s ease',
  },
  shimmerActive: {
    left: '100%',
  },
};

const CARD_CONFIG = [
  {
    key: 'revenue',
    icon: '💰',
    label: 'Ingresos Totales',
    bg: 'rgba(45, 139, 78, 0.15)',
    sparkleColor: '#34C759',
    iconBorder: '1px solid rgba(45, 139, 78, 0.3)',
  },
  {
    key: 'total',
    icon: '👥',
    label: 'Total Clientes',
    bg: 'rgba(30, 111, 186, 0.15)',
    sparkleColor: '#3B9FE3',
    iconBorder: '1px solid rgba(30, 111, 186, 0.3)',
  },
  {
    key: 'avgTicket',
    icon: '🛒',
    label: 'Ticket Promedio',
    bg: 'rgba(212, 168, 67, 0.15)',
    sparkleColor: '#D4A843',
    iconBorder: '1px solid rgba(212, 168, 67, 0.3)',
  },
  {
    key: 'retention',
    icon: '🔄',
    label: 'Tasa Retención',
    bg: 'rgba(139, 92, 246, 0.15)',
    sparkleColor: '#8B5CF6',
    iconBorder: '1px solid rgba(139, 92, 246, 0.3)',
  },
  {
    key: 'vip',
    icon: '🌟',
    label: 'Clientes VIP',
    bg: 'rgba(160, 132, 92, 0.15)',
    sparkleColor: '#A0845C',
    iconBorder: '1px solid rgba(160, 132, 92, 0.3)',
  },
  {
    key: 'totalOrders',
    icon: '📦',
    label: 'Órdenes Totales',
    bg: 'rgba(224, 69, 69, 0.15)',
    sparkleColor: '#FF6B6B',
    iconBorder: '1px solid rgba(224, 69, 69, 0.3)',
  },
];

function formatARS(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StatsCards({ clients }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const stats = useMemo(() => {
    const arr = clients || [];
    const total = arr.filter(c => (c.purchaseCount ?? 0) > 0).length; // Only count those who bought
    const revenue = arr.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0);
    const totalOrders = arr.reduce((sum, c) => sum + (c.purchaseCount ?? 0), 0);
    
    const vipCount = arr.filter(c => (c.purchaseCount ?? 0) >= 2).length;
    const withPurchases = arr.filter(c => (c.purchaseCount ?? 0) >= 1).length;
    const retention = withPurchases > 0 ? ((vipCount / withPurchases) * 100) : 0;
    const avgTicket = totalOrders > 0 ? (revenue / totalOrders) : 0;

    return {
      revenue: formatARS(revenue),
      total: total.toLocaleString('es-AR'),
      avgTicket: formatARS(avgTicket),
      retention: `${retention.toFixed(1)}%`,
      vip: vipCount.toLocaleString('es-AR'),
      totalOrders: totalOrders.toLocaleString('es-AR'),
    };
  }, [clients]);

  return (
    <div style={styles.grid}>
      {CARD_CONFIG.map((cfg) => {
        const isHovered = hoveredCard === cfg.key;
        return (
          <div
            key={cfg.key}
            style={{
              ...styles.card,
              ...(isHovered ? styles.cardHover : {}),
            }}
            onMouseEnter={() => setHoveredCard(cfg.key)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {/* Sparkle glow */}
            <div
              style={{
                ...styles.sparkle,
                background: cfg.sparkleColor,
                ...(isHovered ? styles.sparkleVisible : {}),
              }}
            />
            {/* Shimmer line */}
            <div
              style={{
                ...styles.shimmer,
                ...(isHovered ? styles.shimmerActive : {}),
              }}
            />
            {/* Icon */}
            <div
              style={{
                ...styles.iconBox,
                background: cfg.bg,
                border: cfg.iconBorder,
              }}
            >
              {cfg.icon}
            </div>
            {/* Content */}
            <div style={styles.label}>{cfg.label}</div>
            <div style={styles.value}>{stats[cfg.key]}</div>
          </div>
        );
      })}
    </div>
  );
}
