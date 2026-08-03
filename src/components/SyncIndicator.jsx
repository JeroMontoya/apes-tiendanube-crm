import React, { useState, useRef, useEffect } from 'react';
import { Radio, WifiOff, RefreshCw, Zap, Activity } from 'lucide-react';

function formatLastSync(ts) {
  if (!ts) return 'Aún sin datos';
  const date = ts instanceof Date ? ts : new Date(ts);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'Ahora mismo';
  if (diff < 3600000) return `Hace ${Math.max(1, Math.floor(diff / 60000))} min`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
  return date.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatEventLabel(type) {
  if (!type) return 'Esperando eventos…';
  const labels = {
    'order-changed': 'Pedido actualizado',
    'product-changed': 'Producto actualizado',
    'config-changed': 'Configuración cambiada',
    'broadcast-config': 'Configuración transmitida',
    broadcast: 'Evento transmitido',
  };
  return labels[type] || type;
}

function formatEventTime(ts) {
  if (!ts) return null;
  const diff = Date.now() - ts;
  if (diff < 60000) return 'ahora';
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default function SyncIndicator({ connected, lastEvent, lastSync }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const eventLabel = formatEventLabel(lastEvent?.type);
  const eventTime = formatEventTime(lastEvent?.ts);

  return (
    <div ref={ref} className="sync-indicator">
      <button
        onClick={() => setOpen(!open)}
        className={`sync-chip ${open ? 'open' : ''} ${connected ? '' : 'sync-chip-off'}`}
        title={connected ? 'Sync en vivo — clic para ver detalles' : 'Sin conexión — clic para ver detalles'}
      >
        <span className={`sync-ping ${connected ? 'sync-ping-on' : 'sync-ping-off'}`}>
          {connected ? <Radio size={15} /> : <WifiOff size={15} />}
        </span>
        <span className={`sync-dot ${connected ? 'sync-dot-on' : 'sync-dot-off'}`} />
      </button>

      {open && (
        <div className="sync-popover">
          <div className="sync-popover-glow" />

          <div className="sync-popover-header">
            <span className={`sync-status-ring ${connected ? 'sync-status-ring-on' : 'sync-status-ring-off'}`}>
              {connected ? <Radio size={16} /> : <WifiOff size={16} />}
            </span>
            <div className="sync-popover-heading">
              <div className="sync-popover-title">{connected ? 'Sincronización en vivo' : 'Sin conexión en vivo'}</div>
              <div className="sync-popover-subtitle">Canal Realtime · Supabase</div>
            </div>
            <span className={`sync-chip-badge ${connected ? 'sync-chip-badge-on' : 'sync-chip-badge-off'}`}>
              <span className={`sync-chip-badge-dot ${connected ? 'sync-dot-on' : 'sync-dot-off'}`} />
              {connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          <div className="sync-popover-divider" />

          <div className="sync-row">
            <span className="sync-row-icon"><RefreshCw size={13} /></span>
            <div className="sync-row-text">
              <div className="sync-row-label">Última sincronización</div>
              <div className="sync-row-value">{formatLastSync(lastSync)}</div>
            </div>
          </div>

          <div className="sync-row">
            <span className="sync-row-icon"><Zap size={13} /></span>
            <div className="sync-row-text">
              <div className="sync-row-label">Último evento</div>
              <div className="sync-row-value">
                {eventLabel}
                {eventTime && <span className="sync-row-ago"> · {eventTime}</span>}
              </div>
            </div>
          </div>

          <div className="sync-row">
            <span className="sync-row-icon"><Activity size={13} /></span>
            <div className="sync-row-text">
              <div className="sync-row-label">Latencia del canal</div>
              <div className="sync-row-value">{connected ? 'Verificada · < 30s' : 'No responde'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
