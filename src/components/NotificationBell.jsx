import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell, ShoppingBag, UserPlus, AlertTriangle, CheckCircle, Info, RefreshCw, Package, Zap, Calendar, CheckCheck, Trash2, X } from 'lucide-react';

const TYPE_CONFIG = {
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
  calendar: { icon: Calendar, color: '#F59E0B' },
};

const URGENCY_COLORS = {
  urgent: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', dot: '#EF4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.15)', dot: '#F59E0B' },
  info: { bg: 'rgba(59, 130, 246, 0.06)', border: 'rgba(59, 130, 246, 0.12)', dot: '#60A5FA' },
};

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll, dismissCalendar } = useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | 'calendar' | 'system'
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const calendarNotifs = notifications.filter(n => n.type === 'calendar');
  const systemNotifs = notifications.filter(n => n.type !== 'calendar');
  const filteredNotifs = tab === 'calendar' ? calendarNotifs : tab === 'system' ? systemNotifs : notifications;

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
          {/* Header */}
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

          {/* Tabs */}
          <div style={{ display: 'flex', padding: '0 12px', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { key: 'all', label: 'Todo', count: notifications.length },
              { key: 'calendar', label: 'Calendario', count: calendarNotifs.length },
              { key: 'system', label: 'Sistema', count: systemNotifs.length },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 600, border: 'none',
                  background: 'transparent', cursor: 'pointer', borderRadius: '8px 8px 0 0',
                  color: tab === t.key ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                  borderBottom: tab === t.key ? '2px solid #60A5FA' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {t.label} {t.count > 0 && <span style={{ opacity: 0.5 }}>({t.count})</span>}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="notification-panel-list">
            {filteredNotifs.length === 0 ? (
              <div className="notification-panel-empty">
                <Bell size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                <div>Sin notificaciones</div>
              </div>
            ) : (
              filteredNotifs.slice(0, 30).map(n => {
                // Calendar event
                if (n.type === 'calendar') {
                  const urg = URGENCY_COLORS[n.urgency] || URGENCY_COLORS.info;
                  return (
                    <div
                      key={n.id}
                      className={`notification-item ${!n.read ? 'notification-unread' : ''}`}
                      onClick={() => markAsRead(n.id)}
                      style={{ background: n.urgency === 'urgent' ? urg.bg : undefined }}
                    >
                      <div className="notification-item-icon" style={{
                        fontSize: 18, background: urg.bg, border: `1px solid ${urg.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {n.emoji || '📅'}
                      </div>
                      <div className="notification-item-body">
                        <div className="notification-item-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {n.title}
                          {n.daysUntil === 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', background: 'rgba(239,68,68,0.15)', padding: '1px 6px', borderRadius: 4 }}>HOY</span>
                          )}
                          {n.daysUntil > 0 && n.daysUntil <= 3 && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#F59E0B', background: 'rgba(245,158,11,0.15)', padding: '1px 6px', borderRadius: 4 }}>{n.daysUntil}d</span>
                          )}
                        </div>
                        {n.message && <div className="notification-item-message">{n.message}</div>}
                        <div className="notification-item-time">
                          {n.daysUntil === 0 ? '¡Es hoy!' : n.daysUntil === 1 ? 'Mañana' : `En ${n.daysUntil} días`}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); dismissCalendar(n.calendarId); }}
                        style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                }

                // System event (order, client, sync, etc.)
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
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
