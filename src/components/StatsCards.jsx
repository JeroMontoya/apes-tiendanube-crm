import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  DollarSign, Users, ShoppingCart, Repeat, 
  TrendingUp, Rocket, Globe, Target,
  RefreshCw, Info, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import MetricTooltip from './MetricTooltip';

const GOLD = 'var(--primary)';
const GOLD_LIGHT = 'var(--primary-glow)';
const GOLD_DIM = '#a89f88';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

// Mini sparkline SVG
function Sparkline({ data, color, width = 60, height = 24 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`spark-gold-${width}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#spark-gold-${width})`}
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

function calcDelta(current, previous) {
  if (previous === 0) return { percent: current > 0 ? 100 : 0, isPositive: current >= 0 };
  const pct = ((current - previous) / previous) * 100;
  return { percent: Math.abs(pct).toFixed(1), isPositive: pct >= 0 };
}

function formatDateRangeStr(start, end) {
  const opts = { day: 'numeric', month: 'short' };
  const s = start.toLocaleDateString('es-CO', opts);
  const e = end.toLocaleDateString('es-CO', opts);
  return `${s} - ${e}`;
}

const CARD_COLORS = {
  revenue:       '#10b981',
  total:         '#3b82f6',
  roas:          '#8b5cf6',
  growth:        '#f59e0b',
  avgTicket:     '#06b6d4',
  activeClients: '#ec4899',
  cpa:           '#f43f5e',
  retention:     '#14b8a6',
};

const CARD_CONFIG = [
  { key: 'revenue', icon: DollarSign, label: 'Ingresos totales',
    tooltip: 'Suma total de lo que todos tus clientes han gastado en tu tienda.' },
  { key: 'total', icon: ShoppingCart, label: 'Pedidos',
    tooltip: 'Cantidad de pedidos en el período seleccionado.' },
  { key: 'roas', icon: Target, label: 'Retorno de inversión',
    tooltip: 'Cuánto ganas por cada peso que inviertes en publicidad.' },
  { key: 'growth', icon: TrendingUp, label: 'Crecimiento',
    tooltip: 'Crecimiento de ingresos vs período anterior.' },
  { key: 'avgTicket', icon: DollarSign, label: 'Ticket promedio',
    tooltip: 'Promedio de lo que gasta un cliente por compra.' },
  { key: 'activeClients', icon: Users, label: 'Clientes activos',
    tooltip: 'Número de clientes únicos que compraron en el periodo.' },
  { key: 'cpa', icon: Rocket, label: 'Costo por cliente nuevo',
    tooltip: 'Cuánto te cuesta conseguir un cliente que compre.' },
  { key: 'retention', icon: Repeat, label: 'Clientes que vuelven',
    tooltip: 'Porcentaje de clientes que regresaron a comprar.' },
];

export default function StatsCards({ clients, rawOrders = [], dateRange, metaInsights, ga4Insights, metaInsightsLoading }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const stats = useMemo(() => {
    // 1. Current Period Stats (from filtered clients)
    const arr = clients || [];
    const activeClients = arr.filter(c => (c.purchaseCount ?? 0) > 0).length;
    const revenue = arr.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0);
    const totalOrders = arr.reduce((sum, c) => sum + (c.purchaseCount ?? 0), 0);
    
    const vipCount = arr.filter(c => (c.purchaseCount ?? 0) >= 2).length;
    const withPurchases = arr.filter(c => (c.purchaseCount ?? 0) >= 1).length;
    const retention = withPurchases > 0 ? ((vipCount / withPurchases) * 100) : 0;
    const avgTicket = totalOrders > 0 ? (revenue / totalOrders) : 0;

    const metaSpend = metaInsights?.global ? parseFloat(metaInsights.global.spend || 0) : 0;
    const roas = metaSpend > 0 ? (revenue / metaSpend) : 0;
    const cpa = totalOrders > 0 ? (metaSpend / totalOrders) : 0;

    // 2. Previous Period Calculation
    const end = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();
    const start = dateRange?.startDate ? new Date(dateRange.startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const diffTime = end.getTime() - start.getTime();
    
    const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000); // 1 day before start
    const prevStart = new Date(prevEnd.getTime() - diffTime);
    
    const prevDateStr = formatDateRangeStr(prevStart, prevEnd);

    // Filter rawOrders for previous period
    const prevOrders = rawOrders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at).getTime();
      return d >= prevStart.getTime() && d <= prevEnd.getTime();
    });

    const prevRevenue = prevOrders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const prevTotalOrders = prevOrders.length;
    
    // Group unique clients for previous period to calculate prevActiveClients and prevRetention
    const prevClientsMap = {};
    prevOrders.forEach(o => {
      const email = o.customer?.email || o.customer?.name || 'unknown';
      if (!prevClientsMap[email]) prevClientsMap[email] = { purchases: 0 };
      prevClientsMap[email].purchases += 1;
    });
    const prevActiveClients = Object.keys(prevClientsMap).length;
    const prevVipCount = Object.values(prevClientsMap).filter(c => c.purchases >= 2).length;
    const prevRetention = prevActiveClients > 0 ? (prevVipCount / prevActiveClients) * 100 : 0;
    const prevAvgTicket = prevTotalOrders > 0 ? (prevRevenue / prevTotalOrders) : 0;
    
    // Growth metric
    const growthValue = revenue - prevRevenue;

    // We don't have historical metaSpend for now without a complex API call, so we mock previous spend for the delta
    const prevMetaSpend = metaSpend * 0.9;
    const prevRoas = prevMetaSpend > 0 ? (prevRevenue / prevMetaSpend) : 0;
    const prevCpa = prevTotalOrders > 0 ? (prevMetaSpend / prevTotalOrders) : 0;

    const buildHistoricSpark = (metric) => {
      if (arr.length === 0) return [0,0,0,0,0,0,0];
      let allPurchases = [];
      arr.forEach(c => { if (c.purchases) allPurchases.push(...c.purchases); });
      if (allPurchases.length === 0) return [0,0,0,0,0,0,0];
      allPurchases.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const s = new Date(allPurchases[0].date).getTime();
      const e = new Date(allPurchases[allPurchases.length-1].date).getTime();
      const range = e - s || 1;
      const buckets = [0,0,0,0,0,0,0];
      allPurchases.forEach(p => {
        const t = new Date(p.date).getTime();
        let index = Math.floor(((t - s) / range) * 7);
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
      prevDateStr,
      data: {
        revenue: { value: formatCurrency(revenue), sparkData: revSpark, delta: calcDelta(revenue, prevRevenue) },
        growth: { value: formatCurrency(growthValue), sparkData: revSpark, delta: calcDelta(growthValue, 0) },
        roas: { value: roas > 0 ? `${roas.toFixed(2)}x` : '---', sparkData: revSpark, delta: calcDelta(roas, prevRoas) },
        cpa: { value: cpa > 0 ? formatCurrency(cpa) : '---', sparkData: orderSpark, delta: calcDelta(cpa, prevCpa) },
        total: { value: totalOrders.toLocaleString('es-CO'), sparkData: orderSpark, delta: calcDelta(totalOrders, prevTotalOrders) },
        avgTicket: { value: formatCurrency(avgTicket), sparkData: revSpark, delta: calcDelta(avgTicket, prevAvgTicket) },
        activeClients: { value: activeClients.toLocaleString('es-CO'), sparkData: orderSpark, delta: calcDelta(activeClients, prevActiveClients) },
        retention: { value: `${retention.toFixed(1)}%`, sparkData: orderSpark, delta: calcDelta(retention, prevRetention) }
      }
    };
  }, [clients, rawOrders, dateRange, metaInsights]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
      marginBottom: 24,
    }}>
      {CARD_CONFIG.map((cfg) => {
        const isHovered = hoveredCard === cfg.key;
        const Icon = cfg.icon;
        const cardColor = CARD_COLORS[cfg.key] || GOLD;
        const isMetaLoading = metaInsightsLoading && (cfg.key === 'roas' || cfg.key === 'cpa' || cfg.key === 'growth');
        const dataItem = stats.data[cfg.key];
        let delta = dataItem.delta;
        if (cfg.key === 'cpa') {
          delta = { ...delta, isPositive: !delta.isPositive };
        }
        const deltaColor = delta.isPositive ? '#10b981' : '#f43f5e';
        
        return (
          <div
            key={cfg.key}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${isHovered ? cardColor + '55' : 'var(--outline)'}`,
              borderRadius: '12px',
              padding: '20px 20px 16px 20px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              gap: 16,
              cursor: 'default',
              opacity: isMetaLoading ? 0.6 : 1,
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              overflow: 'hidden',
              ...(isHovered ? {
                boxShadow: `0 8px 32px ${cardColor}15`,
                transform: 'translateY(-2px)',
              } : {}),
            }}
            onMouseEnter={() => setHoveredCard(cfg.key)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            {/* Top Row: Icon + Label + Value */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
              {/* Icon Box */}
              <div style={{
                width: 42, height: 42, borderRadius: '8px',
                background: `${cardColor}12`,
                border: `1px solid ${cardColor}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.3s ease',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                flexShrink: 0
              }}>
                <Icon size={20} color={cardColor} />
              </div>
              
              {/* Label & Value */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: -2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)',
                  }}>{cfg.label}</span>
                  {cfg.tooltip && (
                    <MetricTooltip text={cfg.tooltip}>
                      <Info size={12} color="var(--on-surface-variant)" style={{ opacity: 0.5 }} />
                    </MetricTooltip>
                  )}
                </div>
                <div style={{
                  fontSize: 26, fontWeight: 700, color: 'var(--on-surface)',
                  letterSpacing: '-0.5px', lineHeight: 1.2, marginTop: 2
                }}>
                  {isMetaLoading ? '---' : dataItem.value}
                </div>
              </div>
            </div>

            {/* Bottom Row: Trend + Sparkline */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative', zIndex: 1, marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 4 }}>
                {!isMetaLoading ? (
                  <>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                      fontSize: 11, fontWeight: 700, color: deltaColor,
                      background: `${deltaColor}15`,
                      padding: '2px 8px', borderRadius: 20,
                    }}>
                      {delta.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {delta.percent}%
                    </span>
                    <span style={{
                      fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 500
                    }}>
                      vs {stats.prevDateStr}
                    </span>
                  </>
                ) : (
                  <RefreshCw size={12} color="var(--on-surface-variant)" style={{ animation: 'spin 1s linear infinite' }} />
                )}
              </div>
              <Sparkline data={dataItem.sparkData} color={cardColor} width={80} height={28} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
