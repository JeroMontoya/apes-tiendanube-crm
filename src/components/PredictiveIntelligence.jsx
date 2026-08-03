import React, { useState, useEffect, useCallback } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, DollarSign, Package, Zap, BarChart3, RefreshCw, ArrowUp, ArrowDown, Minus, Shield, Target } from 'lucide-react';

const API_BASE = '/api/inventory/stock-governance';

const TREND_ICONS = { accelerating: ArrowUp, stable: Minus, decelerating: ArrowDown, dormant: Clock };
const TREND_COLORS = { accelerating: '#3B8A6E', stable: '#666', decelerating: '#A08240', dormant: '#994444' };
const RISK_COLORS = { low: '#3B8A6E', medium: '#A08240', high: '#CC6633', critical: '#CC3333' };
const PACING_COLORS = { under_pacing: '#3D5A99', on_track: '#3B8A6E', over_pacing: '#A08240', capped: '#CC3333' };
const SEVERITY_COLORS = { info: '#3D5A99', warning: '#A08240', critical: '#CC3333' };

export default function PredictiveIntelligence() {
  const [data, setData] = useState({ velocity: [], pacing: [], overview: {}, active_alerts: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('velocity');

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(API_BASE);
      if (r.ok) setData(await r.json());
    } catch (e) { console.error('Failed to fetch governance data:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, [fetchData]);

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  const handleRecalculate = async () => {
    setRefreshing(true);
    try {
      await fetch(API_BASE + '?action=recalculate', { method: 'POST' });
      await fetchData();
    } catch (e) { console.error(e); }
  };

  const handleAckAlert = async (id) => {
    try {
      await fetch(API_BASE + '?id=' + id, { method: 'PATCH' });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const criticalAlerts = data.active_alerts.filter(a => a.severity === 'critical');
  const velocityAlerts = data.velocity.filter(v => v.is_alert_active || v.variant_stock?.stock_web === 0);
  const totalRevenue7d = data.velocity.reduce((s, v) => s + (v.revenue_7d || 0), 0);
  const totalRevenue30d = data.velocity.reduce((s, v) => s + (v.revenue_30d || 0), 0);

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#090B0F' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ color: '#E8E6E3', fontSize: '20px', fontFamily: 'Inter, sans-serif', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            Predictive Intelligence  ONYX v16
          </h1>
          <p style={{ color: '#8A8F98', fontSize: '12px', margin: '4px 0 0', fontFamily: 'Inter, sans-serif' }}>
            Velocidad de stock + Gobernanza de presupuesto + Proyeccion de quiebre
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleRecalculate} disabled={refreshing} style={{ background: '#3D5A9920', border: '1px solid #3D5A9944', color: '#3D5A99', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Brain size={14} /> Recalcular
          </button>
          <button onClick={handleRefresh} disabled={refreshing} style={{ background: 'none', border: '1px solid #333', color: '#8A8F98', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <KPICard icon={AlertTriangle} label="Alertas Activas" value={data.active_alerts.length} color={criticalAlerts.length > 0 ? '#CC3333' : '#A08240'} />
        <KPICard icon={Package} label="Stockout Inminente" value={velocityAlerts.length} color="#CC3333" />
        <KPICard icon={DollarSign} label="Revenue 7d" value={'$' + totalRevenue7d.toLocaleString('es-CO')} color="#3B8A6E" />
        <KPICard icon={TrendingUp} label="Revenue 30d" value={'$' + totalRevenue30d.toLocaleString('es-CO')} color="#3D5A99" />
        <KPICard icon={Shield} label="Governance Checks" value={data.pacing.length} color="#6B5BA0" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {[{ id: 'velocity', label: 'Velocidad de Stock' }, { id: 'pacing', label: 'Budget Pacing' }, { id: 'alerts', label: 'Alertas (' + data.active_alerts.length + ')' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? '#3D5A99' : '#111214',
            color: tab === t.id ? '#fff' : '#8A8F98',
            border: `1px solid ${tab === t.id ? '#3D5A99' : '#1A1E2B'}`,
            padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
            fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 600,
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? <div style={{ color: '#666', textAlign: 'center', padding: '60px' }}>Cargando...</div> : (
        <>
          {tab === 'velocity' && <VelocityTable items={data.velocity} />}
          {tab === 'pacing' && <PacingTable items={data.pacing} />}
          {tab === 'alerts' && <AlertsList alerts={data.active_alerts} onAck={handleAckAlert} />}
        </>
      )}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: '#111214', border: '1px solid #1A1B1E', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div style={{ color: '#E8E6E3', fontSize: '18px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>{value}</div>
        <div style={{ color: '#666', fontSize: '10px', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      </div>
    </div>
  );
}

function VelocityTable({ items }) {
  if (!items.length) return <EmptyState message="No hay datos de velocidad. Ejecuta el recalculo inicial." />;
  return (
    <div style={{ background: '#111214', border: '1px solid #1A1B1E', borderRadius: '8px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1A1E2B' }}>
            {['Variante', 'Stock Total', 'Vel 1d', 'Vel 7d', 'Vel 30d', 'Tendencia', 'Dias a Stockout', 'Revenue 7d', 'Riesgo'].map(h => (
              <th key={h} style={{ color: '#666', padding: '10px 12px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((v, i) => {
            const TrendIcon = TREND_ICONS[v.trend_direction] || Minus;
            const trendColor = TREND_COLORS[v.trend_direction] || '#666';
            const totalStock = (v.variant_stock?.stock_web || 0) + (v.variant_stock?.stock_apes || 0) + (v.variant_stock?.stock_r5 || 0);
            const risk = v.days_to_stockout != null ? (v.days_to_stockout <= 3 ? 'critical' : v.days_to_stockout <= 7 ? 'high' : v.days_to_stockout <= 14 ? 'medium' : 'low') : 'low';
            return (
              <tr key={v.variant_id || i} style={{ borderBottom: '1px solid #1A1B1E', background: v.is_alert_active ? '#CC333308' : 'transparent' }}>
                <td style={{ padding: '10px 12px', color: '#E8E6E3' }}>
                  <div style={{ fontWeight: 600 }}>{v.variant_stock?.name || v.variant_id}</div>
                  <div style={{ color: '#666', fontSize: '10px' }}>{v.variant_stock?.sku || ''}</div>
                </td>
                <td style={{ padding: '10px 12px', color: '#8A8F98' }}>
                  <span style={{ color: v.variant_stock?.stock_web === 0 ? '#CC3333' : '#E8E6E3' }}>{v.variant_stock?.stock_web || 0}</span>
                  <span style={{ color: '#444' }}> / </span>
                  <span>{v.variant_stock?.stock_apes || 0}</span>
                  <span style={{ color: '#444' }}> / </span>
                  <span>{v.variant_stock?.stock_r5 || 0}</span>
                  <div style={{ fontSize: '10px', color: '#555' }}>({totalStock} total)</div>
                </td>
                <td style={{ padding: '10px 12px', color: '#8A8F98', fontWeight: v.velocity_1d > 0 ? 700 : 400 }}>{v.velocity_1d}</td>
                <td style={{ padding: '10px 12px', color: '#8A8F98', fontWeight: v.velocity_7d > 0 ? 700 : 400 }}>{v.velocity_7d}</td>
                <td style={{ padding: '10px 12px', color: '#8A8F98' }}>{v.velocity_30d}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: trendColor }}>
                    <TrendIcon size={14} />
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>{v.trend_pct > 0 ? '+' : ''}{(v.trend_pct || 0).toFixed(1)}%</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#555', textTransform: 'capitalize' }}>{v.trend_direction}</div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {v.days_to_stockout != null ? (
                    <span style={{ color: RISK_COLORS[risk], fontWeight: 700, fontSize: '13px' }}>
                      {v.days_to_stockout.toFixed(1)}d
                    </span>
                  ) : <span style={{ color: '#555' }}></span>}
                  {v.projected_stockout_date && (
                    <div style={{ fontSize: '10px', color: '#555' }}>{new Date(v.projected_stockout_date).toLocaleDateString('es-CO')}</div>
                  )}
                </td>
                <td style={{ padding: '10px 12px', color: '#3B8A6E', fontWeight: 600 }}>${(v.revenue_7d || 0).toLocaleString('es-CO')}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ background: RISK_COLORS[risk] + '20', color: RISK_COLORS[risk], padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>
                    {risk}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PacingTable({ items }) {
  if (!items.length) return <EmptyState message="No hay logs de gobernanza de presupuesto." />;
  return (
    <div style={{ background: '#111214', border: '1px solid #1A1B1E', borderRadius: '8px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1A1E2B' }}>
            {['Ad Set', 'Presupuesto', 'Gastado', 'Pacing', 'ROAS', 'CPA', 'Conversiones', 'Riesgo Stock', 'Accion'].map(h => (
              <th key={h} style={{ color: '#666', padding: '10px 12px', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => (
            <tr key={p.id || i} style={{ borderBottom: '1px solid #1A1B1E' }}>
              <td style={{ padding: '10px 12px', color: '#E8E6E3', fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.adset_name || p.adset_id}</td>
              <td style={{ padding: '10px 12px', color: '#8A8F98' }}>${(p.daily_budget || 0).toLocaleString('es-CO')}</td>
              <td style={{ padding: '10px 12px', color: p.spend_rate > 1.1 ? '#CC3333' : '#8A8F98', fontWeight: p.spend_rate > 1.1 ? 700 : 400 }}>${(p.spent_today || 0).toLocaleString('es-CO')}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ background: PACING_COLORS[p.pacing_status] + '20', color: PACING_COLORS[p.pacing_status], padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                  {p.pacing_status?.replace('_', ' ')}
                </span>
              </td>
              <td style={{ padding: '10px 12px', color: p.roas >= 2 ? '#3B8A6E' : p.roas >= 1 ? '#A08240' : '#CC3333', fontWeight: 700 }}>{(p.roas || 0).toFixed(2)}x</td>
              <td style={{ padding: '10px 12px', color: '#8A8F98' }}>${(p.cpa || 0).toFixed(0)}</td>
              <td style={{ padding: '10px 12px', color: '#E8E6E3' }}>{p.conversions || 0}</td>
              <td style={{ padding: '10px 12px' }}>
                <span style={{ background: RISK_COLORS[p.stockout_risk] + '20', color: RISK_COLORS[p.stockout_risk], padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                  {p.stockout_risk}
                </span>
              </td>
              <td style={{ padding: '10px 12px' }}>
                {p.action_taken && p.action_taken !== 'none' ? (
                  <span style={{ color: '#A08240', fontSize: '11px', fontWeight: 600 }}>{p.action_taken.replace('_', ' ')}</span>
                ) : <span style={{ color: '#444' }}></span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertsList({ alerts, onAck }) {
  if (!alerts.length) return <EmptyState message="No hay alertas activas. El sistema esta saludable." icon={CheckCircle} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {alerts.map(a => (
        <div key={a.id} style={{ background: '#111214', border: `1px solid ${SEVERITY_COLORS[a.severity]}22`, borderLeft: `3px solid ${SEVERITY_COLORS[a.severity]}`, borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ background: SEVERITY_COLORS[a.severity] + '20', color: SEVERITY_COLORS[a.severity], padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>{a.severity}</span>
              <span style={{ color: '#666', fontSize: '10px' }}>{a.alert_type?.replace(/_/g, ' ')}</span>
              <span style={{ color: '#444', fontSize: '10px' }}>{new Date(a.created_at).toLocaleString('es-CO')}</span>
            </div>
            <p style={{ color: '#8A8F98', fontSize: '12px', margin: 0, fontFamily: 'Inter, sans-serif' }}>{a.message}</p>
            {a.projected_days != null && <span style={{ color: '#555', fontSize: '10px' }}>Stock actual: {a.current_stock}  Proyectado: {a.projected_days?.toFixed(1)} dias</span>}
          </div>
          <button onClick={() => onAck(a.id)} style={{ background: '#33333320', color: '#666', border: '1px solid #333', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontFamily: 'Inter, sans-serif', marginLeft: '12px' }}>OK</button>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message, icon: Icon = Brain }) {
  return (
    <div style={{ color: '#666', textAlign: 'center', padding: '60px', background: '#111214', borderRadius: '8px', border: '1px solid #1A1B1E' }}>
      <Icon size={32} style={{ color: '#333', marginBottom: '12px' }} />
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>{message}</p>
    </div>
  );
}
