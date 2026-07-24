import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { Bell, ShoppingBag, UserPlus, AlertTriangle, CheckCircle, Info, RefreshCw, Package, Zap, Calendar, CheckCheck, Trash2, X, ChevronRight, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

const TYPE_CONFIG = {
  order:   { icon: ShoppingBag, color: '#10b981', label: 'Pedido' },
  client:  { icon: UserPlus, color: '#3b82f6', label: 'Cliente' },
  pqr:     { icon: AlertTriangle, color: '#8b5cf6', label: 'PQR' },
  sync:    { icon: RefreshCw, color: '#10b981', label: 'Sync' },
  success: { icon: CheckCircle, color: '#10b981', label: 'OK' },
  error:   { icon: AlertTriangle, color: '#ef4444', label: 'Error' },
  warning: { icon: AlertTriangle, color: '#f59e0b', label: 'Alerta' },
  info:    { icon: Info, color: '#6366f1', label: 'Info' },
  product: { icon: Package, color: '#06b6d4', label: 'Producto' },
  system:  { icon: Zap, color: '#94a3b8', label: 'Sistema' },
  calendar:{ icon: Calendar, color: '#f59e0b', label: 'Calendario' },
};

const URGENCY_MAP = {
  urgent: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.12)', dot: '#ef4444', glow: '0 0 20px rgba(239,68,68,0.15)' },
  warning:{ bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.12)', dot: '#f59e0b', glow: '0 0 20px rgba(245,158,11,0.15)' },
  info:   { bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.12)', dot: '#6366f1', glow: '0 0 20px rgba(99,102,241,0.15)' },
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

function SwipeableNotification({ children, onDismiss, isMobile }) {
  const [touchStart, setTouchStart] = useState(null);
  const [touchCurrent, setTouchCurrent] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e) => {
    if (!isMobile) return;
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isMobile || touchStart === null) return;
    const current = e.touches[0].clientX;
    const diff = touchStart - current;
    if (diff > 0) {
      setTouchCurrent(current);
      setIsSwiping(true);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    const diff = touchStart - (touchCurrent || touchStart);
    if (diff > 80) {
      onDismiss();
    }
    setTouchStart(null);
    setTouchCurrent(null);
    setIsSwiping(false);
  };

  const swipeOffset = isSwiping ? Math.min(100, (touchStart - (touchCurrent || touchStart))) : 0;

  return (
    <div 
      className="notif-swipe-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {isSwiping && (
        <div className="notif-swipe-action" style={{ opacity: swipeOffset / 100 }}>
          <Trash2 size={16} />
          <span>Eliminar</span>
        </div>
      )}
      <div 
        className="notif-swipe-content"
        style={{ 
          transform: `translateX(-${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease'
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll, dismissCalendar, clearNotification, expandedId, toggleExpand, setSoundEnabled, isSoundEnabled } = useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
          <div className="notif-accent-line" />

          {/* Header */}
          <div className="notif-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="notif-header-title">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="notif-unread-badge">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button 
                className="notif-action-btn" 
                onClick={() => setSoundEnabled(!isSoundEnabled())}
                title={isSoundEnabled() ? 'Silenciar sonidos' : 'Activar sonidos'}
              >
                {isSoundEnabled() ? <Volume2 size={14} /> : <VolumeX size={14} />}
              </button>
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
                <div className="notif-empty-title">Sin notificaciones</div>
                <div className="notif-empty-subtitle">Aparecerán aquí cuando haya actividad</div>
              </div>
            ) : (
              grouped.map(([group, items]) => (
                <div key={group}>
                  <div className="notif-group-label">{group}</div>
                  {items.slice(0, 15).map((n, idx) => {
                    if (n.type === 'calendar') {
                      const urg = URGENCY_MAP[n.urgency] || URGENCY_MAP.info;
                      const isExpanded = expandedId === n.id;
                      return (
                        <SwipeableNotification 
                          key={n.id} 
                          onDismiss={() => dismissCalendar(n.calendarId)}
                          isMobile={isMobile}
                        >
                          <div
                            className={`notif-item ${!n.read ? 'notif-item-unread' : ''} ${isExpanded ? 'notif-item-expanded' : ''}`}
                            onClick={() => markAsRead(n.id)}
                            style={{ 
                              animationDelay: `${idx * 30}ms`,
                              borderLeft: `3px solid ${urg.dot}`
                            }}
                          >
                            <div className="notif-item-icon" style={{ background: urg.bg, border: `1px solid ${urg.border}` }}>
                              <span style={{ fontSize: 15 }}>{n.emoji || '📅'}</span>
                            </div>
                            <div className="notif-item-body">
                              <div className="notif-item-header">
                                <div className="notif-item-title">
                                  {n.title}
                                  {n.daysUntil === 0 && <span className="notif-badge notif-badge-urgent">HOY</span>}
                                  {n.daysUntil > 0 && n.daysUntil <= 3 && <span className="notif-badge notif-badge-warning">{n.daysUntil}d</span>}
                                </div>
                                <div className="notif-item-actions">
                                  <button
                                    className="notif-mark-read-btn"
                                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                    title="Marcar como leído"
                                  >
                                    <CheckCircle size={12} />
                                  </button>
                                  <button
                                    className="notif-dismiss-btn"
                                    onClick={(e) => { e.stopPropagation(); dismissCalendar(n.calendarId); }}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                              {n.message && <div className="notif-item-message">{n.message}</div>}
                              <div className="notif-item-time">
                                {n.daysUntil === 0 ? '¡Es hoy!' : n.daysUntil === 1 ? 'Mañana' : `En ${n.daysUntil} días`}
                              </div>
                              {n.details && (
                                <div className="notif-expand-trigger" onClick={(e) => { e.stopPropagation(); toggleExpand(n.id); }}>
                                  <span>Ver detalles</span>
                                  <ChevronDown size={12} className={isExpanded ? 'notif-chevron-rotated' : ''} />
                                </div>
                              )}
                              {isExpanded && n.details && (
                                <div className="notif-expanded-content">
                                  {n.details}
                                </div>
                              )}
                            </div>
                          </div>
                        </SwipeableNotification>
                      );
                    }

                    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                    const Icon = n.icon || cfg.icon;
                    const isExpanded = expandedId === n.id;
                    return (
                      <SwipeableNotification 
                        key={n.id} 
                        onDismiss={() => clearNotification(n.id)}
                        isMobile={isMobile}
                      >
                        <div
                          className={`notif-item ${!n.read ? 'notif-item-unread' : ''} ${isExpanded ? 'notif-item-expanded' : ''}`}
                          onClick={() => markAsRead(n.id)}
                          style={{ 
                            animationDelay: `${idx * 30}ms`,
                            borderLeft: `3px solid ${cfg.color}`
                          }}
                        >
                          <div className="notif-item-icon" style={{ color: cfg.color, background: `${cfg.color}12` }}>
                            <Icon size={15} strokeWidth={2} />
                          </div>
                          <div className="notif-item-body">
                            <div className="notif-item-header">
                              {n.title && <div className="notif-item-title">{n.title}</div>}
                              <div className="notif-item-actions">
                                <button
                                  className="notif-mark-read-btn"
                                  onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                  title="Marcar como leído"
                                >
                                  <CheckCircle size={12} />
                                </button>
                                <button
                                  className="notif-dismiss-btn"
                                  onClick={(e) => { e.stopPropagation(); clearNotification(n.id); }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                            {n.message && <div className="notif-item-message">{n.message}</div>}
                            <div className="notif-item-time">{formatTime(n.timestamp)}</div>
                            {n.details && (
                              <div className="notif-expand-trigger" onClick={(e) => { e.stopPropagation(); toggleExpand(n.id); }}>
                                <span>Ver detalles</span>
                                <ChevronDown size={12} className={isExpanded ? 'notif-chevron-rotated' : ''} />
                              </div>
                            )}
                            {isExpanded && n.details && (
                              <div className="notif-expanded-content">
                                {n.details}
                              </div>
                            )}
                          </div>
                          {!n.read && <div className="notif-item-dot" />}
                        </div>
                      </SwipeableNotification>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="notif-footer">
            <div className="notif-footer-info">
              <Calendar size={13} />
              <span>Próximos 30 días · Colombia</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
