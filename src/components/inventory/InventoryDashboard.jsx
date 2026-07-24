import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, DollarSign, AlertTriangle, TrendingUp, Bell, RefreshCw,
  ArrowLeftRight, Plus, TrendingDown, CheckCircle, XCircle,
  MapPin, Activity, ArrowUpDown,
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
  receive: { label: 'Entró', color: '#10b981', icon: TrendingUp },
  dispatch: { label: 'Salió', color: '#ef4444', icon: TrendingDown },
  transfer: { label: 'Se movió', color: '#3b82f6', icon: ArrowLeftRight },
  adjustment: { label: 'Ajuste', color: '#f59e0b', icon: RefreshCw },
  return: { label: 'Devolución', color: '#f59e0b', icon: RefreshCw },
  production_in: { label: 'Producción', color: '#06b6d4', icon: Package },
  sync: { label: 'Sync', color: '#8b5cf6', icon: RefreshCw },
};

function StatCard({ label, value, color, icon: Icon, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '20px',
        borderRadius: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
      onMouseEnter={onClick ? (e) => { e.currentTarget.style.borderColor = color; } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; } : undefined}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '14px',
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--on-surface)', lineHeight: 1 }}>
          {typeof value === 'number' ? formatNumber(value) : value}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
          {label}
        </div>
      </div>
    </div>
  );
}

export default function InventoryDashboard({ summary, alerts, movements, locations, onAction }) {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [activeLocation, setActiveLocation] = useState('all');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;

  const stats = useMemo(() => {
    if (!summary) return { totalProducts: 0, totalStockValue: 0, lowStock: 0, outOfStock: 0, pendingAlerts: 0 };

    const unacknowledged = (alerts || []).filter(a => !a.acknowledged);

    // If a location is selected, try to filter summary by that location
    let locProducts = summary.total_products || 0;
    let locStockValue = summary.total_value || 0;
    let locLowStock = summary.low_stock_count || 0;
    let locOutOfStock = summary.out_of_stock_count || 0;

    if (activeLocation !== 'all' && summary.locations) {
      const loc = summary.locations.find(l => (l.code || l.location_id) === activeLocation);
      if (loc) {
        locProducts = loc.products || 0;
        locStockValue = loc.total_value || 0;
      }
    }

    return {
      totalProducts: locProducts,
      totalStockValue: locStockValue,
      lowStock: locLowStock,
      outOfStock: locOutOfStock,
      pendingAlerts: unacknowledged.length,
      criticalAlerts: unacknowledged.filter(a => a.severity === 'critical').length,
    };
  }, [summary, alerts, activeLocation]);

  const recentMovements = useMemo(() => (movements || []).slice(0, 6), [movements]);

  const activeAlerts = useMemo(() => {
    return (alerts || [])
      .filter(a => !a.acknowledged)
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      })
      .slice(0, 4);
  }, [alerts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: '12px',
      }}>
        <StatCard
          label="Productos"
          value={stats.totalProducts}
          color="#3b82f6"
          icon={Package}
          onClick={() => onAction?.('view_products')}
        />
        <StatCard
          label="En inventario"
          value={formatCurrency(stats.totalStockValue)}
          color="#10b981"
          icon={DollarSign}
        />
        <StatCard
          label="Necesitan atención"
          value={stats.lowStock + stats.outOfStock}
          color="#f59e0b"
          icon={AlertTriangle}
          onClick={() => onAction?.('alerts')}
        />
        <StatCard
          label="Alertas"
          value={stats.pendingAlerts}
          color="#ef4444"
          icon={Bell}
          onClick={() => onAction?.('alerts')}
        />
      </div>

      {/* Location Tabs */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap',
      }}>
        {[
          { id: 'all', label: 'Todos', color: '#6366f1', icon: MapPin },
          ...(locations || []).map(l => ({ id: l.id || l.code, label: l.name || l.code, color: l.color || '#3b82f6', icon: MapPin })),
        ].map(loc => {
          const isActive = activeLocation === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => setActiveLocation(loc.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: isActive ? '2px solid' : '1px solid var(--border-subtle)',
                borderColor: isActive ? loc.color : 'transparent',
                background: isActive ? `${loc.color}15` : 'var(--surface)',
                color: isActive ? loc.color : 'var(--on-surface-variant)',
                fontSize: '13px', fontWeight: isActive ? '700' : '500',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: loc.color,
              }} />
              {loc.label}
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {[
          { key: 'new_product', label: '+ Producto nuevo', color: '#3b82f6', icon: Plus },
          { key: 'adjust', label: 'Sumar / Restar stock', color: '#10b981', icon: ArrowUpDown },
          { key: 'transfer', label: 'Mover entre locales', color: '#8b5cf6', icon: ArrowLeftRight },
          { key: 'sync_tn', label: 'Actualizar de TiendaNube', color: '#06b6d4', icon: RefreshCw },
        ].map(action => (
          <button
            key={action.key}
            onClick={() => onAction?.(action.key === 'new_product' ? 'new-product' : action.key === 'sync_tn' ? 'sync' : action.key)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              background: `${action.color}12`,
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
            onMouseEnter={(e) => { e.currentTarget.style.background = `${action.color}22`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${action.color}12`; }}
          >
            <action.icon size={16} />
            {action.label}
          </button>
        ))}
      </div>

      {/* Two Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '16px',
      }}>
        {/* Recent Activity */}
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
        }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#06b6d4" />
            Últimos movimientos
          </h3>
          {recentMovements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--on-surface-variant)' }}>
              <Activity size={28} style={{ opacity: 0.2, marginBottom: '6px' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Sin movimientos recientes</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentMovements.map((m, i) => {
                const cfg = MOVEMENT_TYPE_CONFIG[m.type] || MOVEMENT_TYPE_CONFIG.adjustment;
                return (
                  <div key={m.id || i} style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--surface-container-low, rgba(255,255,255,0.03))',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '8px',
                      background: `${cfg.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <cfg.icon size={13} color={cfg.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.product_name || m.productName || 'Producto'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                        {cfg.label} · {m.quantity > 0 ? '+' : ''}{m.quantity}
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

        {/* Alerts */}
        <div style={{
          padding: '20px',
          borderRadius: '16px',
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={16} color="#8b5cf6" />
              Alertas
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
          </div>
          {activeAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--on-surface-variant)' }}>
              <CheckCircle size={28} style={{ opacity: 0.3, marginBottom: '6px', color: '#10b981' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '600' }}>Todo tranquilo por acá</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeAlerts.map((alert, i) => {
                const isCrit = alert.severity === 'critical';
                return (
                  <div key={alert.id || i} style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: isCrit ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${isCrit ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}>
                    <AlertTriangle size={16} color={isCrit ? '#ef4444' : '#f59e0b'} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface)' }}>
                        {alert.message || alert.product_name || 'Alerta'}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                        {alert.location || ''} · {timeAgo(alert.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
