import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Clock, Zap, Calendar, ChevronRight, Flame, AlertTriangle, Sparkles } from 'lucide-react';
import { getUpcomingEvents } from '../utils/colombianEvents';

const URGENCY = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: '🔥 URGENTE', glow: 'rgba(239,68,68,0.3)' },
  WARNING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '⚠️ PRÓXIMO', glow: 'rgba(245,158,11,0.3)' },
  INFO:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', label: '📅 PLANIFICAR', glow: 'rgba(59,130,246,0.2)' },
};

function getUrgency(daysUntil) {
  if (daysUntil <= 3) return URGENCY.CRITICAL;
  if (daysUntil <= 10) return URGENCY.WARNING;
  return URGENCY.INFO;
}

function getActionSuggestion(event) {
  const { daysUntil, category, title } = event;
  if (daysUntil <= 3) return `¡Lanza tu campaña de ${title} HOY! Activa ads y remarketing.`;
  if (daysUntil <= 7) return `Prepara creativos y segmenta audiencias para ${title}.`;
  if (daysUntil <= 14) return `Planifica tu estrategia de ${title}. Define presupuesto y canales.`;
  return `${title} se acerca. Buen momento para investigar tendencias y planificar.`;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_notifications') || '[]');
    } catch { return []; }
  });
  const [toasts, setToasts] = useState([]);
  const [toastsShown, setToastsShown] = useState(false);
  const dropdownRef = useRef(null);

  const upcoming = getUpcomingEvents(30);
  const activeNotifications = upcoming.filter(ev => !dismissed.includes(ev.id));
  const criticalEvents = activeNotifications.filter(ev => ev.daysUntil <= 10);

  // Show toast on mount for critical events
  useEffect(() => {
    if (toastsShown) return;
    const sessionKey = 'toast_shown_' + new Date().toDateString();
    if (sessionStorage.getItem(sessionKey)) { setToastsShown(true); return; }
    
    const critical = upcoming.filter(ev => ev.daysUntil <= 10 && !dismissed.includes(ev.id));
    if (critical.length > 0) {
      const firstTwo = critical.slice(0, 2);
      setToasts(firstTwo.map(ev => ({
        id: ev.id,
        emoji: ev.emoji,
        title: ev.title,
        daysUntil: ev.daysUntil,
        urgency: getUrgency(ev.daysUntil),
      })));
      sessionStorage.setItem(sessionKey, 'true');
    }
    setToastsShown(true);
  }, [upcoming, dismissed, toastsShown]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const dismissNotification = (id) => {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissed));
  };

  const clearAll = () => {
    const allIds = activeNotifications.map(n => n.id);
    const newDismissed = [...dismissed, ...allIds];
    setDismissed(newDismissed);
    localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissed));
  };

  return (
    <>
      {/* ── Bell Button ── */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            background: open ? 'var(--surface-container-high)' : 'transparent',
            color: 'var(--on-surface)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Bell size={20} />
          {activeNotifications.length > 0 && (
            <span style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: criticalEvents.length > 0 ? 22 : 18,
              height: criticalEvents.length > 0 ? 22 : 18,
              borderRadius: '50%',
              background: criticalEvents.length > 0 ? '#ef4444' : '#f59e0b',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--background)',
              animation: criticalEvents.length > 0 ? 'pulse-badge 2s ease infinite' : 'none',
            }}>
              {activeNotifications.length}
            </span>
          )}
        </button>

        {/* ── Dropdown Panel ── */}
        {open && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 420,
            maxHeight: '70vh',
            overflowY: 'auto',
            borderRadius: 20,
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-container)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px var(--border-subtle)',
            zIndex: 1100,
            animation: 'fadeSlideDown 0.25s ease',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={20} color="var(--primary)" />
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>
                  Centro de Alertas
                </span>
                {activeNotifications.length > 0 && (
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '2px 10px',
                    borderRadius: 20,
                    background: 'var(--primary-container)',
                    color: 'var(--on-primary-container)',
                  }}>
                    {activeNotifications.length}
                  </span>
                )}
              </div>
              {activeNotifications.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 8,
                  }}
                >
                  Limpiar todo
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div style={{ padding: '8px' }}>
              {activeNotifications.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--on-surface-variant)',
                }}>
                  <Bell size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                    No hay alertas pendientes
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.7 }}>
                    Te notificaremos cuando se acerque una temporada importante
                  </p>
                </div>
              ) : (
                activeNotifications.map((event, i) => {
                  const urgency = getUrgency(event.daysUntil);
                  const suggestion = getActionSuggestion(event);

                  return (
                    <div
                      key={event.id}
                      style={{
                        padding: '16px',
                        borderRadius: 16,
                        marginBottom: 6,
                        background: urgency.bg,
                        border: `1px solid ${urgency.color}22`,
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        cursor: 'default',
                        animation: `fadeSlideDown 0.3s ease ${i * 0.05}s both`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        {/* Emoji */}
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: `${urgency.color}18`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 22,
                          flexShrink: 0,
                        }}>
                          {event.emoji}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>
                              {event.title}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissNotification(event.id); }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--on-surface-variant)',
                                cursor: 'pointer',
                                padding: 4,
                                borderRadius: 8,
                                display: 'flex',
                                flexShrink: 0,
                                opacity: 0.5,
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Countdown chip */}
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 10px',
                            borderRadius: 20,
                            background: `${urgency.color}20`,
                            color: urgency.color,
                            fontSize: 12,
                            fontWeight: 700,
                            marginTop: 6,
                          }}>
                            {event.daysUntil <= 3 ? <Flame size={12} /> : <Clock size={12} />}
                            {event.daysUntil === 0 ? '¡HOY!' : event.daysUntil === 1 ? '¡MAÑANA!' : `En ${event.daysUntil} días`}
                          </div>

                          {/* Suggestion */}
                          <p style={{
                            margin: '8px 0 0',
                            fontSize: 13,
                            color: 'var(--on-surface-variant)',
                            lineHeight: 1.45,
                          }}>
                            {suggestion}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {activeNotifications.length > 0 && (
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: 'var(--on-surface-variant)',
                fontSize: 12,
              }}>
                <Calendar size={13} />
                Próximos 30 días · Colombia
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Toast Notifications (on page load) ── */}
      <div style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map((toast, i) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              padding: '16px 20px',
              borderRadius: 16,
              background: 'var(--surface-container)',
              border: `1px solid ${toast.urgency.color}44`,
              boxShadow: `0 16px 48px rgba(0,0,0,0.2), 0 0 20px ${toast.urgency.glow}`,
              backdropFilter: 'blur(20px)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              minWidth: 320,
              maxWidth: 400,
              animation: `slideInRight 0.4s ease ${i * 0.15}s both`,
              cursor: 'pointer',
            }}
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `${toast.urgency.color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}>
              {toast.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 2 }}>
                {toast.title}
              </div>
              <div style={{ fontSize: 12, color: toast.urgency.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                {toast.daysUntil <= 3 ? <Flame size={12} /> : <AlertTriangle size={12} />}
                {toast.daysUntil === 0 ? '¡Es hoy!' : toast.daysUntil === 1 ? '¡Es mañana!' : `En ${toast.daysUntil} días`}
                {' · ¡Prepara tu campaña!'}
              </div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--on-surface-variant)', opacity: 0.4, flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </>
  );
}
