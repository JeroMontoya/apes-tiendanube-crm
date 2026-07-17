import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell, ShoppingBag, UserPlus, AlertTriangle, CheckCircle, Info, RefreshCw, Package, Zap, Calendar, CheckCheck, Trash2, X, ChevronRight } from 'lucide-react';

const TYPE_CONFIG = {
  order:   { icon: ShoppingBag, color: '#34D399', label: 'Pedido' },
  client:  { icon: UserPlus, color: '#60A5FA', label: 'Cliente' },
  pqr:     { icon: AlertTriangle, color: '#A78BFA', label: 'PQR' },
  sync:    { icon: RefreshCw, color: '#34D399', label: 'Sync' },
  success: { icon: CheckCircle, color: '#34D399', label: 'OK' },
  error:   { icon: AlertTriangle, color: '#F87171', label: 'Error' },
  warning: { icon: AlertTriangle, color: '#FBBF24', label: 'Alerta' },
  info:    { icon: Info, color: '#818CF8', label: 'Info' },
  product: { icon: Package, color: '#22D3EE', label: 'Producto' },
  system:  { icon: Zap, color: '#94A3B8', label: 'Sistema' },
  calendar:{ icon: Calendar, color: '#FBBF24', label: 'Calendario' },
};

const URGENCY_MAP = {
  urgent: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', dot: '#F87171', pulse: true },
  warning:{ bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)', dot: '#FBBF24', pulse: false },
  info:   { bg: 'rgba(96,165,250,0.06)', border: 'rgba(96,165,250,0.12)', dot: '#60A5FA', pulse: false },
};

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

function groupByTime(notifs) {
  const now = Date.now();
  const groups = { 'Hoy': [], 'Ayer': [], 'Anteriores': [] };
  notifs.forEach(n => {
    const diff = now - n.timestamp;
    if (diff < 86400000) groups['Hoy'].push(n);
    else if (diff < 172800000) groups['Ayer'].push(n);
    else groups['Anteriores'].push(n);
  });
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll, dismissCalendar } = useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
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
  const grouped = useMemo(() => groupByTime(filteredNotifs), [filteredNotifs]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`notif-bell-btn ${open ? 'notif-bell-active' : ''}`}
      >
        <Bell size={17} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="notif-bell-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="notif-panel">
          {/* Gradient accent line */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, #60A5FA, #A78BFA, #34D399)', opacity: 0.6 }} />

          {/* Header */}
          <div className="notif-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>Notificaciones</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', background: 'rgba(96,165,250,0.1)', padding: '2px 7px', borderRadius: 6 }}>
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 2 }}>
              {unreadCount > 0 && (
                <button className="notif-action-btn" onClick={markAllRead} title="Marcar todo leído">
                  <CheckCheck size={14} />
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notif-action-btn notif-action-danger" onClick={clearAll} title="Limpiar todo">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="notif-tabs">
            {[
              { key: 'all', label: 'Todo', count: notifications.length },
              { key: 'calendar', label: 'Calendario', count: calendarNotifs.length },
              { key: 'system', label: 'Sistema', count: systemNotifs.length },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`notif-tab ${tab === t.key ? 'notif-tab-active' : ''}`}
              >
                {t.label}
                {t.count > 0 && <span className="notif-tab-count">{t.count}</span>}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="notif-list">
            {filteredNotifs.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">
                  <Bell size={28} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 4 }}>Sin notificaciones</div>
                <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.6 }}>Aparecerán aquí cuando haya actividad</div>
              </div>
            ) : (
              grouped.map(([group, items]) => (
                <div key={group}>
                  <div className="notif-group-label">{group}</div>
                  {items.slice(0, 15).map((n, idx) => {
                    if (n.type === 'calendar') {
                      const urg = URGENCY_MAP[n.urgency] || URGENCY_MAP.info;
                      return (
                        <div
                          key={n.id}
                          className={`notif-item ${!n.read ? 'notif-item-unread' : ''}`}
                          onClick={() => markAsRead(n.id)}
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <div className="notif-item-icon" style={{ background: urg.bg, border: `1px solid ${urg.border}` }}>
                            <span style={{ fontSize: 15 }}>{n.emoji || '📅'}</span>
                          </div>
                          <div className="notif-item-body">
                            <div className="notif-item-title">
                              {n.title}
                              {n.daysUntil === 0 && <span className="notif-badge notif-badge-urgent">HOY</span>}
                              {n.daysUntil > 0 && n.daysUntil <= 3 && <span className="notif-badge notif-badge-warning">{n.daysUntil}d</span>}
                            </div>
                            {n.message && <div className="notif-item-message">{n.message}</div>}
                            <div className="notif-item-time">
                              {n.daysUntil === 0 ? '¡Es hoy!' : n.daysUntil === 1 ? 'Mañana' : `En ${n.daysUntil} días`}
                            </div>
                          </div>
                          <button
                            className="notif-dismiss-btn"
                            onClick={(e) => { e.stopPropagation(); dismissCalendar(n.calendarId); }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    }

                    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                    const Icon = n.icon || cfg.icon;
                    return (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.read ? 'notif-item-unread' : ''}`}
                        onClick={() => markAsRead(n.id)}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div className="notif-item-icon" style={{ color: cfg.color, background: `${cfg.color}12` }}>
                          <Icon size={15} strokeWidth={2} />
                        </div>
                        <div className="notif-item-body">
                          {n.title && <div className="notif-item-title">{n.title}</div>}
                          {n.message && <div className="notif-item-message">{n.message}</div>}
                          <div className="notif-item-time">{formatTime(n.timestamp)}</div>
                        </div>
                        {!n.read && <div className="notif-item-dot" />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
