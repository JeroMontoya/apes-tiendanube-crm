import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, DollarSign, AlertTriangle, TrendingUp, Bell, RefreshCw,
  ArrowLeftRight, Plus, TrendingDown, CheckCircle, XCircle, Clock,
  MapPin, Activity, ShoppingCart,
} from 'lucide-react';

function formatCurrency(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
}

function formatNumber(v) {
  return new Intl.NumberFormat('es-CO').format(v || 0);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const MOVEMENT_TYPE_CONFIG = {
  receive: { label: 'Recepción', color: '#10b981', icon: TrendingUp },
  dispatch: { label: 'Despacho', color: '#ef4444', icon: TrendingDown },
  transfer: { label: 'Transferencia', color: '#3b82f6', icon: ArrowLeftRight },
  adjustment: { label: 'Ajuste', color: '#f59e0b', icon: RefreshCw },
  return: { label: 'Devolución', color: '#f59e0b', icon: RefreshCw },
  production_in: { label: 'Producción', color: '#06b6d4', icon: Package },
  sync: { label: 'Sync TN', color: '#8b5cf6', icon: RefreshCw },
};

const SEVERITY_CONFIG = {
  critical: { label: 'Crítica', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  high: { label: 'Alta', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  medium: { label: 'Media', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  low: { label: 'Baja', color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
};

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: '12px',
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--on-surface)' }}>
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', opacity: 0.7, marginTop: '2px' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function LocationBar({ name, stock, maxStock, color }) {
  const pct = maxStock > 0 ? Math.min(100, (stock / maxStock) * 100) : 0;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface)' }}>{name}</span>
        <span style={{ fontSize: '12px', fontWeight: '700', color, fontFamily: "'JetBrains Mono', monospace" }}>
          {formatNumber(stock)}
        </span>
      </div>
      <div style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-container, rgba(255,255,255,0.05))', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: '4px',
          width: `${pct}%`,
          background: color,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

export default function InventoryDashboard({ summary, alerts, movements, locations, onAction }) {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  const stats = useMemo(() => {
    if (!summary) {
      return {
        totalProducts: 0, totalStockValue: 0, lowStock: 0,
        outOfStock: 0, movementsToday: 0, pendingAlerts: 0,
        locationStock: {},
      };
    }
    const locStock = {};
    (locations || []).forEach((l) => { locStock[l.id] = 0; });
    (summary.locationBreakdown || []).forEach((lb) => {
      locStock[lb.location_id] = lb.total_stock || 0;
    });
    const unacknowledgedAlerts = (alerts || []).filter((a) => !a.acknowledged);
    const critCount = unacknowledgedAlerts.filter((a) => a.severity === 'critical').length;
    const highCount = unacknowledgedAlerts.filter((a) => a.severity === 'high').length;
    return {
      totalProducts: summary.total_products || 0,
      totalStockValue: summary.total_value || 0,
      lowStock: summary.low_stock_count || 0,
      outOfStock: summary.out_of_stock_count || 0,
      movementsToday: summary.movements_today || 0,
      pendingAlerts: unacknowledgedAlerts.length,
      critCount,
      highCount,
      locationStock: locStock,
      maxLocationStock: Math.max(1, ...Object.values(locStock)),
    };
  }, [summary, alerts, locations]);

  const recentMovements = useMemo(() => {
    return (movements || []).slice(0, 10);
  }, [movements]);

  const activeAlerts = useMemo(() => {
    return (alerts || [])
      .filter((a) => !a.acknowledged)
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      })
      .slice(0, 8);
  }, [alerts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stat Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: '14px',
      }}>
        <StatCard
          label="Productos Totales"
          value={stats.totalProducts}
          color="#3b82f6"
          icon={Package}
        />
        <StatCard
          label="Valor del Inventario"
          value={formatCurrency(stats.totalStockValue)}
          color="#10b981"
          icon={DollarSign}
        />
        <StatCard
          label="Stock Bajo"
          value={stats.lowStock}
          color="#f59e0b"
          icon={AlertTriangle}
        />
        <StatCard
          label="Sin Stock"
          value={stats.outOfStock}
          color="#ef4444"
          icon={XCircle}
        />
        <StatCard
          label="Movimientos Hoy"
          value={stats.movementsToday}
          sub={`${recentMovements.length} recientes`}
          color="#06b6d4"
          icon={Activity}
        />
        <StatCard
          label="Alertas Pendientes"
          value={stats.pendingAlerts}
          sub={stats.critCount > 0 ? `${stats.critCount} críticas` : undefined}
          color="#8b5cf6"
          icon={Bell}
        />
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {[
          { key: 'new_product', label: 'Nuevo Producto', color: '#3b82f6', icon: Plus },
          { key: 'transfer', label: 'Transferir Stock', color: '#8b5cf6', icon: ArrowLeftRight },
          { key: 'check_alerts', label: 'Revisar Alertas', color: '#f59e0b', icon: Bell },
          { key: 'sync_tn', label: 'Sync TiendaNube', color: '#10b981', icon: RefreshCw },
        ].map((action) => (
          <button
            key={action.key}
            onClick={() => onAction?.(action.key)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: `${action.color}15`,
              color: action.color,
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${action.color}25`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${action.color}15`; }}
          >
            <action.icon size={16} />
            {action.label}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '16px',
      }}>
        {/* Stock by Location */}
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="#3b82f6" />
            Stock por Ubicación
          </h3>
          {(locations || []).map((loc) => (
            <LocationBar
              key={loc.id}
              name={loc.name}
              stock={stats.locationStock[loc.id] || 0}
              maxStock={stats.maxLocationStock}
              color={loc.color}
            />
          ))}
        </div>

        {/* Recent Movements */}
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#06b6d4" />
              Movimientos Recientes
            </h3>
            <button
              onClick={() => onAction?.('view_movements')}
              style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#3b82f6', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              Ver todo
            </button>
          </div>
          {recentMovements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--on-surface-variant)' }}>
              <Activity size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Sin movimientos recientes</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
              {recentMovements.map((m, i) => {
                const cfg = MOVEMENT_TYPE_CONFIG[m.type] || MOVEMENT_TYPE_CONFIG.adjustment;
                return (
                  <div key={m.id || i} style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-container-low, rgba(255,255,255,0.03))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: `${cfg.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <cfg.icon size={14} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.product_name || m.productName || 'Producto'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        {cfg.label} · {m.quantity > 0 ? '+' : ''}{m.quantity}
                        {m.from_location ? ` · ${m.from_location}` : ''}
                        {m.to_location ? ` → ${m.to_location}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>
                      {timeAgo(m.created_at || m.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Alerts */}
      <div style={{
        padding: '20px',
        borderRadius: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="#8b5cf6" />
            Alertas Activas
            {activeAlerts.length > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: '700',
                padding: '2px 8px', borderRadius: '10px',
                background: '#ef4444', color: '#fff',
              }}>
                {activeAlerts.length}
              </span>
            )}
          </h3>
          <button
            onClick={() => onAction?.('view_alerts')}
            style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#3b82f6', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            Ver todas
          </button>
        </div>
        {activeAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--on-surface-variant)' }}>
            <CheckCircle size={32} style={{ opacity: 0.3, marginBottom: '8px', color: '#10b981' }} />
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Sin alertas pendientes</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '8px' }}>
            {activeAlerts.map((alert, i) => {
              const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
              return (
                <div key={alert.id || i} style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: sev.bg,
                  border: `1px solid ${sev.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <AlertTriangle size={16} color={sev.color} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {alert.message || alert.product_name || 'Alerta'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                      {alert.location || ''} · {timeAgo(alert.created_at)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '9px', fontWeight: '700', padding: '2px 8px',
                    borderRadius: '6px', background: `${sev.color}20`, color: sev.color,
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {sev.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
