import React, { useEffect, useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { ShoppingBag, UserPlus, AlertTriangle, CheckCircle, Info, X, Bell, RefreshCw, Package, Zap, Check } from 'lucide-react';

const TOAST_STYLES = {
  order:   { accent: '#34D399', bg: 'rgba(52, 211, 153, 0.08)', icon: ShoppingBag, glow: 'rgba(52, 211, 153, 0.15)' },
  client:  { accent: '#60A5FA', bg: 'rgba(96, 165, 250, 0.08)', icon: UserPlus, glow: 'rgba(96, 165, 250, 0.15)' },
  pqr:     { accent: '#A78BFA', bg: 'rgba(167, 139, 250, 0.08)', icon: AlertTriangle, glow: 'rgba(167, 139, 250, 0.15)' },
  sync:    { accent: '#34D399', bg: 'rgba(52, 211, 153, 0.08)', icon: RefreshCw, glow: 'rgba(52, 211, 153, 0.15)' },
  success: { accent: '#34D399', bg: 'rgba(52, 211, 153, 0.08)', icon: Check, glow: 'rgba(52, 211, 153, 0.15)' },
  error:   { accent: '#F87171', bg: 'rgba(248, 113, 113, 0.08)', icon: AlertTriangle, glow: 'rgba(248, 113, 113, 0.15)' },
  warning: { accent: '#FBBF24', bg: 'rgba(251, 191, 36, 0.08)', icon: AlertTriangle, glow: 'rgba(251, 191, 36, 0.15)' },
  info:    { accent: '#818CF8', bg: 'rgba(129, 140, 248, 0.08)', icon: Info, glow: 'rgba(129, 140, 248, 0.15)' },
  product: { accent: '#22D3EE', bg: 'rgba(34, 211, 238, 0.08)', icon: Package, glow: 'rgba(34, 211, 238, 0.15)' },
  system:  { accent: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)', icon: Zap, glow: 'rgba(148, 163, 184, 0.15)' },
  calendar:{ accent: '#FBBF24', bg: 'rgba(251, 191, 36, 0.08)', icon: Bell, glow: 'rgba(251, 191, 36, 0.15)' },
};

function ToastProgress({ duration, accent }) {
  const [width, setWidth] = useState(100);
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      setWidth(Math.max(0, 100 - (elapsed / duration) * 100));
      if (elapsed < duration) requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.04)', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${width}%`, background: accent, borderRadius: '0 0 12px 12px', transition: 'width 0.1s linear', opacity: 0.6 }} />
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();
  if (!toasts.length) return null;

  return (
    <div className="toast-container-v2">
      {toasts.map((toast, i) => {
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
        const Icon = toast.icon || style.icon;

        return (
          <div
            key={toast.id}
            className={`toast-v2 ${toast.exiting ? 'toast-v2-exit' : ''}`}
            style={{
              '--toast-accent': style.accent,
              '--toast-glow': style.glow,
            }}
          >
            <div className="toast-v2-accent" />
            <div className="toast-v2-icon" style={{ color: style.accent, background: style.bg }}>
              <Icon size={16} strokeWidth={2.5} />
            </div>
            <div className="toast-v2-body">
              {toast.title && <div className="toast-v2-title">{toast.title}</div>}
              {toast.message && <div className="toast-v2-message">{toast.message}</div>}
            </div>
            <button className="toast-v2-close" onClick={() => dismissToast(toast.id)}>
              <X size={13} />
            </button>
            <ToastProgress duration={toast.duration || 5000} accent={style.accent} />
          </div>
        );
      })}
    </div>
  );
}
