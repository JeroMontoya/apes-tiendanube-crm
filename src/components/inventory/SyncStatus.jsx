import React, { useState, useEffect } from 'react';
import {
  RefreshCw, CheckCircle, AlertTriangle, Clock, Wifi, WifiOff,
  ToggleLeft, ToggleRight, ArrowUpDown, Loader2, X,
} from 'lucide-react';

function formatTime(dateStr) {
  if (!dateStr) return 'Nunca';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_CONFIG = {
  connected: { label: 'Conectado', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  disconnected: { label: 'Desconectado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  syncing: { label: 'Sincronizando', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  error: { label: 'Error', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
};

export default function SyncStatus({ connected, lastSync, onSync, events, autoSync, onToggleAutoSync }) {
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const status = syncing ? 'syncing' : connected ? 'connected' : 'disconnected';
  const statusConfig = STATUS_CONFIG[status];

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await onSync?.();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={{
      borderRadius: '12px',
      border: '1px solid var(--border-subtle)',
      background: 'var(--surface)',
      overflow: 'hidden',
    }}>
      {/* Main Status Bar */}
      <div
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onClick={() => setExpanded(!expanded)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-container-low, rgba(255,255,255,0.03))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Status Dot */}
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: statusConfig.color,
          boxShadow: status === 'connected' ? `0 0 8px ${statusConfig.color}` : 'none',
          animation: syncing ? 'pulse 1.5s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }} />

        {/* Status Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: statusConfig.color }}>
              TiendaNube · {statusConfig.label}
            </span>
            {syncing && <Loader2 size={13} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '1px' }}>
            Última sync: {formatTime(lastSync)}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {/* Auto-sync toggle */}
          <button
            onClick={onToggleAutoSync}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 10px', borderRadius: '6px',
              border: `1px solid ${autoSync ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
              background: autoSync ? 'rgba(16,185,129,0.1)' : 'transparent',
              color: autoSync ? '#10b981' : 'var(--on-surface-variant)',
              fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
            }}
            title={autoSync ? 'Auto-sync activado' : 'Auto-sync desactivado'}
          >
            {autoSync ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            Auto
          </button>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: 'none',
              background: syncing ? 'rgba(59,130,246,0.5)' : '#3b82f6',
              color: '#fff', fontSize: '12px', fontWeight: '700',
              cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {syncing ? (
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <ArrowUpDown size={13} />
            )}
            {syncing ? 'Sincronizando...' : 'Sync Ahora'}
          </button>
        </div>
      </div>

      {/* Expanded: Recent Events */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 18px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '10px' }}>
            Eventos Recientes
          </div>
          {(!events || events.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--on-surface-variant)' }}>
              <Clock size={24} style={{ opacity: 0.2, marginBottom: '6px' }} />
              <p style={{ margin: 0, fontSize: '12px' }}>Sin eventos recientes</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
              {(events || []).slice(0, 5).map((event, i) => {
                const isSync = event.type === 'sync';
                const isSuccess = event.data?.success !== false;
                return (
                  <div key={event.timestamp || i} style={{
                    padding: '10px 12px', borderRadius: '8px',
                    background: 'var(--surface-container-low, rgba(255,255,255,0.03))',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    {isSync ? (
                      <RefreshCw size={13} color={isSuccess ? '#10b981' : '#ef4444'} style={{ flexShrink: 0 }} />
                    ) : event.type === 'stock' ? (
                      <ArrowUpDown size={13} color="#3b82f6" style={{ flexShrink: 0 }} />
                    ) : (
                      <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface)' }}>
                        {event.data?.message || `${event.type}: ${event.event}`}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>
                        {formatTime(event.timestamp)}
                      </div>
                    </div>
                    {isSync && (
                      <span style={{
                        fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px',
                        background: isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: isSuccess ? '#10b981' : '#ef4444',
                      }}>
                        {isSuccess ? 'OK' : 'Error'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Inline keyframe for animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
