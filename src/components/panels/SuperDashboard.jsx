import React, { useMemo, useState } from 'react';
import {
  TrendingUp, ShoppingBag, Search, BarChart2, Camera,
  ArrowUpRight, ArrowDownRight, Layers, Globe,
  Activity, Users, Zap, CheckCircle2, AlertTriangle, Package,
  Target, Shield, Brain, Loader2, DollarSign, ShoppingCart,
  ArrowUp, ArrowDown, Minus, ExternalLink
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

const S = {
  card: {
    background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)',
    padding: 20, transition: 'all 0.3s',
  },
  kpiBox: (color) => ({
    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-md)', padding: 18, display: 'flex',
    flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden',
  }),
  badge: (color) => ({
    padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
    background: `${color}15`, color, border: `1px solid ${color}25`,
    fontFamily: 'JetBrains Mono, monospace',
  }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    textAlign: 'left', padding: '10px 12px', fontSize: 9, fontWeight: 800,
    color: 'var(--on-surface-variant)', textTransform: 'uppercase',
    letterSpacing: '0.8px', borderBottom: '1px solid var(--border-subtle)',
    fontFamily: 'JetBrains Mono, monospace',
  },
  td: {
    padding: '10px 12px', color: 'var(--on-surface)',
    borderBottom: '1px solid var(--border-subtle)', fontSize: 12,
  },
};

const fmt = (val, type = 'num') => {
  if (val == null || isNaN(val)) return '—';
  const v = Number(val);
  if (type === 'currency') {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  }
  if (type === 'pct') return `${v.toFixed(1)}%`;
  if (type === 'dec') return v.toFixed(2);
  if (v >= 1000) return v.toLocaleString('es-CO');
  return v.toFixed(v % 1 === 0 ? 0 : 1);
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--on-surface)', fontSize: 13, marginBottom: 4 }}>{label || payload[0].name}</p>
        <p style={{ margin: 0, color: 'var(--on-surface-variant)', fontSize: 13 }}>
          {payload[0].name === 'total' || payload[0].name === 'spent' || payload[0].name === 'totalSales' || payload[0].name === 'grossRevenue' || payload[0].name === 'revenue'
            ? `$${payload[0].value.toLocaleString('es-CO')}` 
            : `${payload[0].value} unidades`}
        </p>
      </div>
    );
  }
  return null;
};

export default function SuperDashboard({
  ga4Insights, gscPerformance, mcProducts, metaInsights, googleAdsData,
  tiktokData, unifiedClients, tiendanubeProducts, session
}) {
  // Aggregate data
  const totalSpend = (metaInsights?.spend || 0) + (googleAdsData?.spend || 0) + (tiktokData?.spend || 0);
  const totalRevenueAds = (metaInsights?.revenue || 0) + (googleAdsData?.revenue || 0) + (tiktokData?.revenue || 0);
  const consolidatedRoas = totalSpend > 0 ? (totalRevenueAds / totalSpend).toFixed(2) : 0;

  const ga4Global = ga4Insights?.global || {};
  const ga4Ecom = ga4Insights?.ecommerce || {};
  const ga4Acq = ga4Insights?.acquisition || [];
  const ga4Events = ga4Insights?.events || [];

  const kpis = [
    { label: 'ROAS Consolidado', val: consolidatedRoas, type: 'dec', color: '#06B6D4', icon: TrendingUp },
    { label: 'Impresiones SEO', val: gscPerformance?.totals?.impressions || 0, type: 'num', color: '#6366f1', icon: Search },
    { label: 'Sesiones Totales', val: ga4Global.sessions || 0, type: 'num', color: 'var(--primary-container)', icon: Globe },
    { label: 'Usuarios Activos', val: ga4Global.activeUsers || 0, type: 'num', color: '#06B6D4', icon: Users },
    { label: 'Duración Media', val: ga4Global.averageSessionDuration || 0, type: 'dec', color: '#8b5cf6', icon: Activity },
    { label: 'Tasa Rebote', val: (ga4Global.bounceRate || 0) * 100, type: 'pct', color: '#E11D48', icon: ArrowDownRight },
    { label: 'Revenue E-com (GA4)', val: ga4Ecom.totalRevenue || 0, type: 'currency', color: '#059669', icon: DollarSign },
    { label: 'Pedidos E-com', val: ga4Ecom.totalPurchases || 0, type: 'num', color: '#8b5cf6', icon: ShoppingBag },
    { label: 'AOV E-com', val: ga4Ecom.averageOrderValue || 0, type: 'currency', color: '#0891b2', icon: ShoppingCart },
    { label: 'Conversiones (E-com)', val: ga4Ecom.purchases || 0, type: 'num', color: '#8b5cf6', icon: ShoppingBag },
  ];

  const inStock = tiendanubeProducts?.filter(p => p.variants?.some(v => v.stock > 0))?.length || 0;
  const outOfStock = (tiendanubeProducts?.length || 0) - inStock;
  
  const mcApproved = mcProducts?.filter(p => p.availability === 'in stock')?.length || 0; // Simplified
  const mcTotal = mcProducts?.length || 0;

  // ONYX Brain integration
  const [actionPlan, setActionPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);

  const generateActionPlan = async () => {
    setLoadingPlan(true);
    setPlanError(null);
    try {
      const res = await fetch('/api/onyx/generate-action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roas: parseFloat(consolidatedRoas),
          ga4_sessions: ga4Insights?.global?.sessions || 0,
          // Cart abandonment rate requires add_to_cart vs purchase events from GA4
          // which are not currently available in the batch report
          cart_abandonment_rate: null
        })
      });

      if (res.status === 429) throw new Error('Demasiadas solicitudes, esperá un momento.');
      if (res.status === 403) throw new Error('No autorizado para acceder a Onyx Brain.');
      if (!res.ok) throw new Error(`Error Onyx Brain: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setActionPlan(data);
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {kpis.map((k, i) => (
          <div key={i} style={S.kpiBox(k.color)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</span>
              <k.icon size={14} color={k.color} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--on-surface)', fontFamily: 'JetBrains Mono, monospace' }}>
                {fmt(k.val, k.type)}{k.type === 'dec' ? 'x' : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        
        {/* Ads Performance */}
        <div style={S.card}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Target size={14} color="var(--primary-container)" /> Rendimiento de Inversión (Ads)
          </div>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Plataforma</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Inversión</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Revenue</th>
                <th style={{ ...S.th, textAlign: 'right' }}>ROAS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={S.td}><span style={{ fontWeight: 600 }}>Meta Ads</span></td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(metaInsights?.spend, 'currency')}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#06B6D4' }}>{fmt(metaInsights?.revenue, 'currency')}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{metaInsights?.spend > 0 ? (metaInsights.revenue / metaInsights.spend).toFixed(2) + 'x' : '—'}</td>
              </tr>
              <tr>
                <td style={S.td}><span style={{ fontWeight: 600 }}>Google Ads</span></td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(googleAdsData?.spend, 'currency')}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#06B6D4' }}>{fmt(googleAdsData?.revenue, 'currency')}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{googleAdsData?.spend > 0 ? (googleAdsData.revenue / googleAdsData.spend).toFixed(2) + 'x' : '—'}</td>
              </tr>
              <tr>
                <td style={S.td}><span style={{ fontWeight: 600 }}>TikTok Ads</span></td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(tiktokData?.spend, 'currency')}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#06B6D4' }}>{fmt(tiktokData?.revenue, 'currency')}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{tiktokData?.spend > 0 ? (tiktokData.revenue / tiktokData.spend).toFixed(2) + 'x' : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Health & Catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={S.card}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={14} color="#8b5cf6" /> Estado Operativo (Inventario y Catálogo)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginBottom: 4 }}>Tiendanube Stock</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#06B6D4', fontFamily: 'JetBrains Mono, monospace' }}>{inStock}</span>
                  <span style={{ fontSize: 10, color: '#E11D48' }}>{outOfStock} sin stock</span>
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginBottom: 4 }}>Merchant Center</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#6366f1', fontFamily: 'JetBrains Mono, monospace' }}>{mcApproved}</span>
                  <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>de {mcTotal} total</span>
                </div>
              </div>
            </div>
          </div>
          
          <div style={S.card}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} color="#e4405f" /> Ecosistema de Clientes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--on-surface)' }}>Base Maestra Unificada</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#e4405f', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(unifiedClients?.length || 0)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--on-surface)' }}>Rebote General (GA4)</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary-container)', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(ga4Insights?.global?.bounceRate ? ga4Insights.global.bounceRate * 100 : 0, 'pct')}</span>
            </div>
          </div>
        </div>
        
      </div>

      {/* GA4 Analytics Section */}
      {(ga4Acq.length > 0 || (ga4Ecom && Object.keys(ga4Ecom).length > 0) || ga4Events.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Acquisition by Channel */}
          {ga4Acq.length > 0 && (
            <div style={S.card}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={14} color="#06B6D4" /> Adquisición GA4 — Canales (Últimos 30 días)
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ga4Acq.sort((a,b) => b.sessions - a.sessions)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container)" horizontal={false} />
                  <XAxis type="number" stroke="var(--outline)" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} fontSize={12} />
                  <YAxis dataKey="channel" type="category" stroke="var(--on-surface-variant)" width={140} fontSize={11} tick={{fill: 'var(--on-surface-variant)'}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="sessions" fill="#06B6D4" radius={[0, 4, 4, 0]} name="Sesiones" />
                  <Bar dataKey="activeUsers" fill="#6366f1" radius={[0, 4, 4, 0]} name="Usuarios" />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, fontSize: 11 }}>
                {ga4Acq.map((ch, i) => (
                  <span key={ch.channel} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'var(--surface-container)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    <strong>{ch.channel}:</strong> {fmt(ch.sessions)} ses / {fmt(ch.activeUsers)} users
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ecommerce & Revenue */}
          {(ga4Ecom && Object.keys(ga4Ecom).length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
              
              {/* Revenue Timeline */}
              {ga4Ecom.revenueByDate?.length > 0 && (
                <div style={S.card}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={14} color="#059669" /> Revenue Diario (GA4 E-com)
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={ga4Ecom.revenueByDate.sort((a,b) => a.date.localeCompare(b.date))} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--outline)" fontSize={10} tickFormatter={(v) => v.substring(6,8)+'/'+v.substring(4,6)} tick={{fill: 'var(--on-surface-variant)'}} />
                      <YAxis stroke="var(--outline)" fontSize={11} tickFormatter={(v) => fmt(v, 'currency')} tick={{fill: 'var(--on-surface-variant)'}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="grossRevenue" stroke="#059669" fillOpacity={1} fill="url(#revenueGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Products by Revenue */}
              {ga4Ecom.topProducts?.length > 0 && (
                <div style={S.card}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Package size={14} color="#8b5cf6" /> Top Productos por Revenue (GA4)
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={ga4Ecom.topProducts.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container)" horizontal={false} />
                      <XAxis type="number" stroke="var(--outline)" tickFormatter={(v) => fmt(v, 'currency')} fontSize={12} />
                      <YAxis dataKey="name" type="category" stroke="var(--on-surface-variant)" width={180} fontSize={11} tick={{fill: 'var(--on-surface-variant)'}} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 12, fontSize: 11 }}>
                    <strong>AOV:</strong> {fmt(ga4Ecom.averageOrderValue, 'currency')} | <strong>Pedidos:</strong> {fmt(ga4Ecom.totalPurchases)} | <strong>Revenue Total:</strong> {fmt(ga4Ecom.totalRevenue, 'currency')}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Events Funnel */}
          {ga4Events.length > 0 && (
            <div style={S.card}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color="#f59e0b" /> Eventos Principales (GA4)
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ga4Events.slice(0, 15)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-container)" horizontal={false} />
                  <XAxis type="number" stroke="var(--outline)" fontSize={12} />
                  <YAxis dataKey="eventName" type="category" stroke="var(--on-surface-variant)" width={200} fontSize={11} tick={{fill: 'var(--on-surface-variant)'}} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="eventCount" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, fontSize: 11 }}>
                {ga4Events.slice(0, 10).map((ev, i) => (
                  <span key={ev.eventName} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: 'var(--surface-container)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                    {ev.eventName}: {fmt(ev.eventCount)}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ONYX Brain Action Plan Section */}
      <div style={{ ...S.card, marginTop: 10, background: 'linear-gradient(145deg, rgba(15,23,42,0.6), rgba(30,41,59,0.8))', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--on-surface)' }}>ONYX Brain (Python)</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--on-surface-variant)' }}>Motor Analítico Predictivo v23.0</p>
            </div>
          </div>
          <button 
            onClick={generateActionPlan}
            disabled={loadingPlan}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366f1', color: 'var(--on-surface)', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: loadingPlan ? 'not-allowed' : 'pointer', fontSize: 12, opacity: loadingPlan ? 0.7 : 1 }}
          >
            {loadingPlan ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
            Generar Plan Estratégico
          </button>
        </div>

        {planError && (
          <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', color: '#E11D48', borderRadius: 8, fontSize: 12, border: '1px solid rgba(239,68,68,0.2)' }}>
            Error: {planError}. Asegúrate de que el backend FastAPI esté en ejecución.
          </div>
        )}

        {actionPlan && (
          <div style={{ padding: 16, background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#06B6D4', marginBottom: 12, textTransform: 'uppercase' }}>
              <CheckCircle2 size={14} /> Plan Generado Exitosamente (vía {actionPlan.model_used})
            </div>
            <div style={{ fontSize: 14, color: 'var(--on-surface)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {actionPlan.action_plan}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
