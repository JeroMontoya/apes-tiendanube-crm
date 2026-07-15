import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { ShoppingBag, UserPlus, AlertTriangle, CheckCircle, Info, X, Bell, RefreshCw, Package, Zap } from 'lucide-react';

const TOAST_STYLES = {
  order: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)', icon: ShoppingBag, iconColor: '#34D399' },
  client: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.25)', icon: UserPlus, iconColor: '#60A5FA' },
  pqr: { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.25)', icon: AlertTriangle, iconColor: '#A855F7' },
  sync: { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.25)', icon: RefreshCw, iconColor: '#22C55E' },
  success: { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)', icon: CheckCircle, iconColor: '#10B981' },
  error: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)', icon: AlertTriangle, iconColor: '#EF4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)', icon: AlertTriangle, iconColor: '#F59E0B' },
  info: { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.25)', icon: Info, iconColor: '#818CF8' },
  product: { bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.25)', icon: Package, iconColor: '#06B6D4' },
  system: { bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)', icon: Zap, iconColor: '#94A3B8' },
};

function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Ahora';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`;
  return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast, i) => {
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
        const Icon = toast.icon || style.icon;

        return (
          <div
            key={toast.id}
            className={`toast-item ${toast.exiting ? 'toast-exit' : ''}`}
            style={{
              background: style.bg,
              border: `1px solid ${style.border}`,
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            <div className="toast-icon" style={{ color: style.iconColor }}>
              <Icon size={18} />
            </div>
            <div className="toast-body">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button className="toast-close" onClick={() => dismissToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
