import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  RefreshCw, CheckCircle, AlertTriangle, Clock, Wifi, WifiOff,
  ToggleLeft, ToggleRight, ArrowUpDown, Loader2, X, Webhook, ExternalLink,
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
  connected: { label: 'Conectado', color: '#06B6D4', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  disconnected: { label: 'Desconectado', color: '#E11D48', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
  syncing: { label: 'Sincronizando', color: 'var(--primary-container)', bg: 'rgba(6, 182, 212,0.1)', border: 'rgba(6, 182, 212,0.3)' },
  error: { label: 'Error', color: '#E11D48', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' },
};

export default function SyncStatus({ connected, lastSync, onSync, events, autoSync, onToggleAutoSync }) {
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState(null);
  const [registeredWebhooks, setRegisteredWebhooks] = useState([]);

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
      borderRadius: '16px',
      border: '1px solid var(--border-subtle)',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.03), transparent 120%)',
      backdropFilter: 'blur(16px)',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
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
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-container-low, var(--surface-container-low))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Status Dot */}
        <div style={{
          width: '12px', height: '12px', borderRadius: '50%',
          background: statusConfig.color,
          boxShadow: `0 0 12px ${statusConfig.color}`,
          animation: syncing ? 'pulse 1.5s ease-in-out infinite' : status === 'connected' ? 'statusGlow 2.5s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }} />

        {/* Status Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '800', color: statusConfig.color, letterSpacing: '0.01em' }}>
              TiendaNube · {statusConfig.label}
            </span>
            {syncing && <Loader2 size={13} color="var(--primary-container)" style={{ animation: 'spin 1s linear infinite' }} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 9px', borderRadius: '999px',
              border: '1px solid rgba(6,182,212,0.22)',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.10), rgba(99,102,241,0.05))',
              fontSize: '10.5px', fontWeight: '700', color: '#67E8F9',
              fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.02em',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              <Clock size={10} style={{ flexShrink: 0 }} />
              {formatTime(lastSync)}
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: status === 'connected' ? '#34D399' : statusConfig.color,
                boxShadow: status === 'connected' ? '0 0 6px #34D399' : 'none',
                flexShrink: 0,
              }} />
            </span>
            {status === 'connected' && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '10px', fontWeight: '600', color: '#34D399', opacity: 0.85,
              }}>
                <Wifi size={11} /> Realtime activo
              </span>
            )}
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
              color: autoSync ? '#06B6D4' : 'var(--on-surface-variant)',
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
              padding: '8px 14px', borderRadius: '10px',
              border: 'none',
              background: syncing ? 'rgba(6,182,212,0.45)' : 'linear-gradient(135deg, #06B6D4, #6366F1)',
              color: '#fff', fontSize: '12px', fontWeight: '700',
              cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: syncing ? 'none' : '0 4px 14px rgba(6,182,212,0.3), 0 0 0 1px rgba(255,255,255,0.08) inset',
              transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s',
              transform: syncing ? 'none' : 'translateY(0)',
            }}
            onMouseEnter={(e) => {
              if (!syncing) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(6,182,212,0.4), 0 0 0 1px rgba(255,255,255,0.12) inset';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = syncing ? 'none' : '0 4px 14px rgba(6,182,212,0.3), 0 0 0 1px rgba(255,255,255,0.08) inset';
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

      {/* Expanded: Recent Events + Webhook Config */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 18px' }}>
          {/* Webhook Registration */}
          <div style={{
            padding: '12px 14px', borderRadius: '10px',
            background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
            marginBottom: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Webhook size={14} color="#6366f1" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface)' }}>Webhook TiendaNube</span>
              </div>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '11px', color: 'var(--on-surface-variant)', lineHeight: '1.5' }}>
              Registra webhooks automáticamente para sincronizar stock, pedidos y productos en tiempo real.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                disabled={webhookLoading}
                onClick={async () => {
                  setWebhookLoading(true);
                  setWebhookResult(null);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch('/api/inventory/register-webhook', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.access_token}`,
                      },
                      body: JSON.stringify({ action: 'register' }),
                    });
                    const data = await res.json();
                    setWebhookResult(data);
                    if (data.results) {
                      setRegisteredWebhooks(data.results.filter(r => r.status === 'registered' || r.status === 'already_registered'));
                    }
                  } catch (e) {
                    setWebhookResult({ error: e.message });
                  } finally {
                    setWebhookLoading(false);
                  }
                }}
                style={{
                  padding: '7px 14px', borderRadius: '6px', border: 'none',
                  background: webhookLoading ? 'rgba(99,102,241,0.5)' : '#6366f1',
                  color: 'var(--on-surface)', fontSize: '11px', fontWeight: '700',
                  cursor: webhookLoading ? 'wait' : 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {webhookLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Webhook size={12} />}
                {webhookLoading ? 'Registrando...' : 'Registrar Webhooks'}
              </button>
              <button
                onClick={async () => {
                  setWebhookLoading(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const res = await fetch('/api/inventory/register-webhook', {
                      headers: { Authorization: `Bearer ${session?.access_token}` },
                    });
                    const data = await res.json();
                    setRegisteredWebhooks(data.webhooks || []);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setWebhookLoading(false);
                  }
                }}
                style={{
                  padding: '7px 14px', borderRadius: '6px',
                  border: '1px solid var(--border-subtle)', background: 'transparent',
                  color: 'var(--on-surface-variant)', fontSize: '11px', fontWeight: '600',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Ver Webhooks
              </button>
            </div>
            {webhookResult && (
              <div style={{ marginTop: '10px' }}>
                {webhookResult.error ? (
                  <div style={{ fontSize: '11px', color: '#E11D48', padding: '6px 10px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)' }}>
                    Error: {webhookResult.error}
                  </div>
                ) : webhookResult.results ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {webhookResult.results.map((r, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '5px 10px', borderRadius: '6px',
                        background: r.status === 'registered' ? 'rgba(16,185,129,0.1)' :
                          r.status === 'already_registered' ? 'rgba(99, 102, 241,0.1)' : 'rgba(239,68,68,0.1)',
                        fontSize: '11px',
                      }}>
                        {r.status === 'registered' || r.status === 'already_registered' ?
                          <CheckCircle size={12} color="#06B6D4" /> : <AlertTriangle size={12} color="#E11D48" />}
                        <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{r.event}</span>
                        <span style={{
                          marginLeft: 'auto', fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                          background: r.status === 'registered' ? 'rgba(16,185,129,0.15)' :
                            r.status === 'already_registered' ? 'rgba(99, 102, 241,0.15)' : 'rgba(239,68,68,0.15)',
                          color: r.status === 'registered' ? '#06B6D4' :
                            r.status === 'already_registered' ? '#6366f1' : '#E11D48',
                          fontWeight: 700,
                        }}>
                          {r.status === 'registered' ? 'Registrado' : r.status === 'already_registered' ? 'Ya existe' : 'Error'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
            {registeredWebhooks.length > 0 && !webhookResult && (
              <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--on-surface-variant)' }}>
                {registeredWebhooks.length} webhook(s) configurado(s)
              </div>
            )}
          </div>

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
                    background: 'var(--surface-container-low, var(--surface-container-low))',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    {isSync ? (
                      <RefreshCw size={13} color={isSuccess ? '#06B6D4' : '#E11D48'} style={{ flexShrink: 0 }} />
                    ) : event.type === 'stock' ? (
                      <ArrowUpDown size={13} color="#6366f1" style={{ flexShrink: 0 }} />
                    ) : (
                      <AlertTriangle size={13} color="var(--primary-container)" style={{ flexShrink: 0 }} />
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
                        color: isSuccess ? '#06B6D4' : '#E11D48',
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
        @keyframes statusGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(6,182,212,0.6); }
          50% { box-shadow: 0 0 18px rgba(6,182,212,1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
