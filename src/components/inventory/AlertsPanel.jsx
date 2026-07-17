import React, { useState, useMemo } from 'react';
import {
  Bell, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Package, MapPin, Clock, Filter, X,
} from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { label: 'Crítica', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: XCircle },
  high: { label: 'Alta', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: AlertTriangle },
  medium: { label: 'Media', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', icon: Bell },
  low: { label: 'Baja', color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', icon: Bell },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

export default function AlertsPanel({ alerts, onAcknowledge, onCheck, loading }) {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const alertTypes = useMemo(() => {
    const types = new Set();
    (alerts || []).forEach((a) => { if (a.type) types.add(a.type); });
    return [...types].sort();
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    let result = [...(alerts || [])];
    if (!showAcknowledged) {
      result = result.filter((a) => !a.acknowledged);
    }
    if (severityFilter !== 'all') {
      result = result.filter((a) => a.severity === severityFilter);
    }
    if (typeFilter !== 'all') {
      result = result.filter((a) => a.type === typeFilter);
    }
    result.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });
    return result;
  }, [alerts, severityFilter, typeFilter, showAcknowledged]);

  const unacknowledgedCount = useMemo(() =>
    (alerts || []).filter((a) => !a.acknowledged).length,
    [alerts]
  );

  const criticalCount = useMemo(() =>
    (alerts || []).filter((a) => !a.acknowledged && a.severity === 'critical').length,
    [alerts]
  );

  const inputStyle = {
    height: '34px', borderRadius: '8px',
    border: '1px solid var(--border-subtle)', background: 'var(--surface)',
    color: 'var(--on-surface)', fontSize: '12px', fontFamily: 'inherit',
    padding: '0 10px', outline: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header Stats */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          padding: '14px 18px', borderRadius: '12px',
          background: unacknowledgedCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${unacknowledgedCount > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '180px',
        }}>
          <Bell size={18} color={unacknowledgedCount > 0 ? '#ef4444' : '#10b981'} />
          <div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--on-surface)' }}>{unacknowledgedCount}</div>
            <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Pendientes</div>
          </div>
        </div>
        {criticalCount > 0 && (
          <div style={{
            padding: '14px 18px', borderRadius: '12px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <XCircle size={18} color="#ef4444" />
            <div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{criticalCount}</div>
              <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Críticas</div>
            </div>
          </div>
        )}
        <button
          onClick={onCheck}
          disabled={loading}
          style={{
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: '700',
            cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto',
          }}
        >
          {loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Bell size={14} />}
          Revisar Ahora
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Filter size={13} color="var(--on-surface-variant)" />
        </div>
        <select style={inputStyle} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="all">Todas las severidades</option>
          {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        {alertTypes.length > 0 && (
          <select style={inputStyle} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Todos los tipos</option>
            {alertTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => setShowAcknowledged(!showAcknowledged)}
          style={{
            ...inputStyle,
            background: showAcknowledged ? 'rgba(59,130,246,0.1)' : 'var(--surface)',
            color: showAcknowledged ? '#3b82f6' : 'var(--on-surface-variant)',
            border: `1px solid ${showAcknowledged ? 'rgba(59,130,246,0.3)' : 'var(--border-subtle)'}`,
          }}
        >
          {showAcknowledged ? 'Ocultar' : 'Mostrar'} atendidas
        </button>
      </div>

      {/* Alert List */}
      {loading && filteredAlerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
          <CheckCircle size={40} style={{ opacity: 0.3, color: '#10b981', marginBottom: '10px' }} />
          <p style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Sin alertas</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>
            {severityFilter !== 'all' || typeFilter !== 'all'
              ? 'Ajusta los filtros para ver más resultados'
              : 'Todo está bajo control'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredAlerts.map((alert, i) => {
            const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
            const SevIcon = sev.icon;
            return (
              <div
                key={alert.id || i}
                style={{
                  padding: '14px 16px', borderRadius: '12px',
                  background: alert.acknowledged ? 'var(--surface-container-low, rgba(255,255,255,0.03))' : sev.bg,
                  border: `1px solid ${alert.acknowledged ? 'var(--border-subtle)' : sev.border}`,
                  opacity: alert.acknowledged ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', gap: '12px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: alert.acknowledged ? 'var(--surface-container, rgba(255,255,255,0.05))' : `${sev.color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <SevIcon size={18} color={alert.acknowledged ? 'var(--on-surface-variant)' : sev.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)', marginBottom: '2px' }}>
                    {alert.message || alert.title || 'Alerta'}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {alert.product_name && (
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Package size={10} /> {alert.product_name}
                      </span>
                    )}
                    {alert.location && (
                      <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={10} /> {alert.location}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={10} /> {timeAgo(alert.created_at)}
                    </span>
                  </div>
                </div>
                <span style={{
                  fontSize: '9px', fontWeight: '700', padding: '3px 8px',
                  borderRadius: '6px', background: `${sev.color}20`, color: sev.color,
                  textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {sev.label}
                </span>
                {!alert.acknowledged && (
                  <button
                    onClick={() => onAcknowledge?.(alert.id)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px',
                      border: '1px solid rgba(16,185,129,0.3)',
                      background: 'rgba(16,185,129,0.1)',
                      color: '#10b981', fontSize: '11px', fontWeight: '600',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: '4px',
                      whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    <CheckCircle size={12} /> Atender
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
