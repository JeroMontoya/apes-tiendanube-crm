import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  DollarSign, Users, ShoppingCart, Repeat, 
  Star, Package, TrendingUp, Rocket, Globe, ArrowUpRight, ArrowDownRight, Target
} from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

// Animated number counter
function AnimatedValue({ value, duration = 1200 }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  
  useEffect(() => {
    prevRef.current = value;
    setDisplayed(value);
  }, [value, duration]);
  
  return <>{displayed}</>;
}

// Mini sparkline SVG
function Sparkline({ data, color, width = 80, height = 32 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  
  const gradientId = `spark-${color.replace('#','')}`;
  
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CARD_CONFIG = [
  { key: 'revenue', icon: DollarSign, label: 'Ingresos Totales', color: '#10b981', span: 'bento-span-3' },
  { key: 'metaSpend', icon: TrendingUp, label: 'Inversión Meta', color: '#1877F2', span: 'bento-span-3' },
  { key: 'roas', icon: Rocket, label: 'ROAS Global', color: '#8b5cf6', span: 'bento-span-3' },
  { key: 'cpa', icon: Target, label: 'CPA Promedio', color: '#f43f5e', span: 'bento-span-3' },
  { key: 'total', icon: Users, label: 'Total Clientes', color: '#3b82f6', span: 'bento-span-3' },
  { key: 'avgTicket', icon: ShoppingCart, label: 'Ticket Promedio', color: '#f59e0b', span: 'bento-span-3' },
  { key: 'cltv', icon: Globe, label: 'CLTV Promedio', color: '#06b6d4', span: 'bento-span-3' },
  { key: 'retention', icon: Repeat, label: 'Tasa Retención', color: '#8b5cf6', span: 'bento-span-3' },
];

export default function StatsCards({ clients, metaInsights, ga4Insights }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const stats = useMemo(() => {
    const arr = clients || [];
    const total = arr.filter(c => (c.purchaseCount ?? 0) > 0).length;
    const revenue = arr.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0);
    const totalOrders = arr.reduce((sum, c) => sum + (c.purchaseCount ?? 0), 0);
    
    const vipCount = arr.filter(c => (c.purchaseCount ?? 0) >= 2).length;
    const withPurchases = arr.filter(c => (c.purchaseCount ?? 0) >= 1).length;
    const retention = withPurchases > 0 ? ((vipCount / withPurchases) * 100) : 0;
    const avgTicket = totalOrders > 0 ? (revenue / totalOrders) : 0;

    const metaSpend = metaInsights?.global ? parseFloat(metaInsights.global.spend || 0) : 0;
    const roas = metaSpend > 0 ? (revenue / metaSpend) : 0;
    const cpa = total > 0 ? (metaSpend / total) : 0;
    const cltv = withPurchases > 0 ? (revenue / withPurchases) : 0;

    const buildHistoricSpark = (metric) => {
      if (arr.length === 0) return [0,0,0,0,0,0,0];
      let allPurchases = [];
      arr.forEach(c => { if (c.purchases) allPurchases.push(...c.purchases); });
      if (allPurchases.length === 0) return [0,0,0,0,0,0,0];
      allPurchases.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const start = new Date(allPurchases[0].date).getTime();
      const end = new Date(allPurchases[allPurchases.length-1].date).getTime();
      const range = end - start || 1;
      const buckets = [0,0,0,0,0,0,0];
      allPurchases.forEach(p => {
        const t = new Date(p.date).getTime();
        let index = Math.floor(((t - start) / range) * 7);
        if (index >= 7) index = 6;
        if (metric === 'revenue') buckets[index] += parseFloat(p.amount || 0);
        else if (metric === 'orders') buckets[index] += 1;
      });
      if (buckets.every(b => b === 0)) return [1,1,1,1,1,1,1];
      return buckets;
    };

    const revSpark = buildHistoricSpark('revenue');
    const orderSpark = buildHistoricSpark('orders');

    return {
      revenue: { value: formatCurrency(revenue), sparkData: revSpark },
      metaSpend: { value: metaInsights?.global ? formatCurrency(metaSpend) : '---', sparkData: [metaSpend*0.6, metaSpend*0.7, metaSpend*0.8, metaSpend*0.9, metaSpend] },
      roas: { value: roas > 0 ? `${roas.toFixed(2)}x` : '---', sparkData: revSpark },
      cpa: { value: cpa > 0 ? formatCurrency(cpa) : '---', sparkData: orderSpark },
      total: { value: total.toLocaleString('es-CO'), sparkData: orderSpark },
      avgTicket: { value: formatCurrency(avgTicket), sparkData: revSpark },
      cltv: { value: formatCurrency(cltv), sparkData: revSpark },
      retention: { value: `${retention.toFixed(1)}%`, sparkData: orderSpark },
      vip: { value: vipCount.toLocaleString('es-CO'), sparkData: orderSpark },
      totalOrders: { value: totalOrders.toLocaleString('es-CO'), sparkData: orderSpark },
    };
  }, [clients, metaInsights, ga4Insights]);

  return (
    <div className="bento-grid" style={{ gridAutoRows: 'auto' }}>
      {CARD_CONFIG.map((cfg) => {
        const isHovered = hoveredCard === cfg.key;
        const data = stats[cfg.key];
        const Icon = cfg.icon;
        return (
          <div
            key={cfg.key}
            className={`glass-card ${cfg.span}`}
            style={{
              padding: '20px 24px',
              cursor: 'default',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 130,
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              ...(isHovered ? { borderColor: `${cfg.color}33`, boxShadow: `0 0 30px ${cfg.color}15, 0 8px 32px rgba(0,0,0,0.15)` } : {}),
            }}
            onMouseEnter={() => setHoveredCard(cfg.key)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {/* Background glow on hover */}
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 120, height: 120, borderRadius: '50%',
              background: cfg.color, filter: 'blur(60px)',
              opacity: isHovered ? 0.12 : 0,
              transition: 'opacity 0.5s ease',
              pointerEvents: 'none',
            }} />
            
            {/* Header Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}0a)`,
                  border: `1px solid ${cfg.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.3s ease',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                }}>
                  <Icon size={18} color={cfg.color} />
                </div>
                <span className="stat-label" style={{ marginBottom: 0 }}>{cfg.label}</span>
              </div>
              <div style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.3s' }}>
                <ArrowUpRight size={16} color="#10b981" />
              </div>
            </div>
            
            {/* Value + Sparkline */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, position: 'relative', zIndex: 1 }}>
              <div className="stat-value" style={{ fontSize: cfg.span === 'bento-span-4' ? 28 : 24 }}>
                <AnimatedValue value={data.value} />
              </div>
              <Sparkline data={data.sparkData} color={cfg.color} width={70} height={28} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
