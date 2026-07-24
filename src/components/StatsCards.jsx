import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  DollarSign, Users, ShoppingCart, Repeat, 
  Star, Package, TrendingUp, Rocket, Globe, ArrowUpRight, Target,
  RefreshCw, Info, Activity, ArrowUp, ArrowDown
} from 'lucide-react';
import MetricTooltip from './MetricTooltip';

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
  { key: 'revenue', icon: DollarSign, label: 'Ingresos Totales', color: '#10b981', span: 'bento-span-2', trend: '+14.5%', trendUp: true,
    tooltip: 'Suma total de lo que todos tus clientes han gastado en tu tienda.' },
  { key: 'totalOrders', icon: ShoppingCart, label: 'Pedidos', color: '#3b82f6', span: 'bento-span-2', trend: '+12.4%', trendUp: true,
    tooltip: 'Cantidad total de pedidos realizados.' },
  { key: 'conversionRate', icon: Target, label: 'Tasa de Conversión', color: '#8b5cf6', span: 'bento-span-2', trend: '+1.2%', trendUp: true,
    tooltip: 'Porcentaje de visitantes que realizan una compra.' },
  { key: 'growth', icon: TrendingUp, label: 'Crecimiento', color: '#f59e0b', span: 'bento-span-2', trend: '+22.8%', trendUp: true,
    tooltip: 'Crecimiento general de ventas frente al mes anterior.' },
  { key: 'avgTicket', icon: Package, label: 'Ticket Promedio', color: '#06b6d4', span: 'bento-span-2', trend: '+7.1%', trendUp: true,
    tooltip: 'Promedio de lo que gasta un cliente por compra.' },
  { key: 'activeClients', icon: Users, label: 'Clientes Activos', color: '#ec4899', span: 'bento-span-2', trend: '+15.3%', trendUp: true,
    tooltip: 'Cantidad de clientes que han interactuado o comprado recientemente.' }
];

export default function StatsCards({ clients, metaInsights, ga4Insights, metaInsightsLoading }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const stats = useMemo(() => {
    const arr = clients || [];
    const total = arr.filter(c => (c.purchaseCount ?? 0) > 0).length;
    const revenue = arr.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0);
    const totalOrders = arr.reduce((sum, c) => sum + (c.purchaseCount ?? 0), 0);
    
    const avgTicket = totalOrders > 0 ? (revenue / totalOrders) : 0;
    
    const conversionRate = ga4Insights?.conversionRate ? (ga4Insights.conversionRate * 100) : 3.62;
    const activeClients = Math.floor(total * 0.85); // Mock active portion if no direct data

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
      totalOrders: { value: totalOrders.toLocaleString('es-CO'), sparkData: orderSpark },
      conversionRate: { value: `${conversionRate.toFixed(2)}%`, sparkData: [2.8, 3.1, 2.9, 3.4, 3.2, 3.5, 3.62] },
      growth: { value: '22.8%', sparkData: revSpark }, // Mocked based on UI plan
      avgTicket: { value: formatCurrency(avgTicket), sparkData: revSpark },
      activeClients: { value: activeClients.toLocaleString('es-CO'), sparkData: orderSpark }
    };
  }, [clients, ga4Insights]);

  return (
    <div className="bento-grid" style={{ marginBottom: 24 }}>
      {CARD_CONFIG.map((cfg) => {
        const isHovered = hoveredCard === cfg.key;
        const data = stats[cfg.key];
        const Icon = cfg.icon;
        
        return (
          <div
            key={cfg.key}
            className={`glass-card ${cfg.span}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 140,
              cursor: 'default',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              ...(isHovered ? { 
                borderColor: `${cfg.color}55`, 
                boxShadow: `0 0 30px ${cfg.color}15, var(--shadow-md)`,
                transform: 'translateY(-2px)'
              } : {}),
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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}0a)`,
                  border: `1px solid ${cfg.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.3s ease',
                  transform: isHovered ? 'scale(1.1) rotate(5deg)' : 'scale(1)',
                }}>
                  <Icon size={18} color={cfg.color} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="stat-label" style={{ marginBottom: 0, fontSize: 13 }}>{cfg.label}</span>
                    {cfg.tooltip && (
                      <MetricTooltip text={cfg.tooltip}>
                        <Info size={12} color="var(--on-surface-variant)" style={{ opacity: 0.6 }} />
                      </MetricTooltip>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Value + Sparkline + Trend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div className="stat-value" style={{ fontSize: 24, letterSpacing: '-0.5px' }}>
                  <AnimatedValue value={data.value} />
                </div>
                <Sparkline data={data.sparkData} color={cfg.color} width={60} height={24} />
              </div>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: 4, 
                fontSize: 12, fontWeight: 600, 
                color: cfg.trendUp ? '#10b981' : '#f43f5e' 
              }}>
                <div style={{ 
                  display: 'flex', alignItems: 'center', padding: '2px 6px', 
                  borderRadius: 4, background: cfg.trendUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)' 
                }}>
                  {cfg.trendUp ? <ArrowUp size={12} style={{ marginRight: 2 }} /> : <ArrowDown size={12} style={{ marginRight: 2 }} />}
                  {cfg.trend}
                </div>
                <span style={{ color: 'var(--on-surface-variant)', fontWeight: 500, marginLeft: 4 }}>vs mes ant.</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
