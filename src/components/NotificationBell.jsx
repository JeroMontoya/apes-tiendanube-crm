import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell, ShoppingBag, UserPlus, AlertTriangle, CheckCircle, Info, RefreshCw, Package, Zap, CheckCheck, Trash2 } from 'lucide-react';

const TYPE_ICONS = {
  order: { icon: ShoppingBag, color: '#34D399' },
  client: { icon: UserPlus, color: '#60A5FA' },
  pqr: { icon: AlertTriangle, color: '#A855F7' },
  sync: { icon: RefreshCw, color: '#22C55E' },
  success: { icon: CheckCircle, color: '#10B981' },
  error: { icon: AlertTriangle, color: '#EF4444' },
  warning: { icon: AlertTriangle, color: '#F59E0B' },
  info: { icon: Info, color: '#818CF8' },
  product: { icon: Package, color: '#06B6D4' },
  system: { icon: Zap, color: '#94A3B8' },
};

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.04)',
          color: 'var(--on-surface)', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18,
            borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 10,
            fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: '2px solid var(--background)', lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>Notificaciones</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <button className="notification-panel-action" onClick={markAllRead} title="Marcar todo leido">
                  <CheckCheck size={14} />
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notification-panel-action notification-panel-action-danger" onClick={clearAll} title="Limpiar todo">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="notification-panel-list">
            {notifications.length === 0 ? (
              <div className="notification-panel-empty">
                <Bell size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>Sin notificaciones</div>
              </div>
            ) : (
              notifications.slice(0, 30).map(n => {
                const cfg = TYPE_ICONS[n.type] || TYPE_ICONS.info;
                const Icon = n.icon || cfg.icon;
                return (
                  <div
                    key={n.id}
                    className={`notification-item ${!n.read ? 'notification-unread' : ''}`}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div className="notification-item-icon" style={{ color: cfg.color, background: `${cfg.color}15` }}>
                      <Icon size={16} />
                    </div>
                    <div className="notification-item-body">
                      {n.title && <div className="notification-item-title">{n.title}</div>}
                      {n.message && <div className="notification-item-message">{n.message}</div>}
                      <div className="notification-item-time">{formatTime(n.timestamp)}</div>
                    </div>
                    {!n.read && <div className="notification-item-dot" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
