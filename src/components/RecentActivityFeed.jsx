import React, { useMemo, useState, useEffect } from 'react';
import { ShoppingBag, UserPlus, Clock } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'Ahora';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

function parseDate(str) {
  if (!str) return 0;
  const s = typeof str === 'string' ? str : String(str);
  return new Date(s).getTime() || 0;
}

export default function RecentActivityFeed({ clients, rawOrders, dateRange }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const activities = useMemo(() => {
    const startDate = dateRange?.startDate || '';
    const endDate = dateRange?.endDate || '';
    const items = [];

    if (rawOrders?.length) {
      // TN API returns newest-first, so iterate from start (index 0 = most recent)
      let count = 0;
      const limit = 6;
      for (let i = 0; i < rawOrders.length && count < limit; i++) {
        const o = rawOrders[i];
        if (!o.created_at) continue;
        const d = typeof o.created_at === 'string' ? o.created_at.substring(0, 10) : '';
        if (startDate && endDate && (d < startDate || d > endDate)) continue;
        items.push({
          id: `order-${o.id}`,
          type: 'order',
          icon: ShoppingBag,
          color: 'var(--primary)',
          title: `Pedido #${o.number || o.id}`,
          subtitle: o.customer?.name || o.contact_name || 'Cliente',
          amount: o.total ? `$${parseFloat(o.total).toLocaleString()}` : null,
          time: o.created_at,
        });
        count++;
      }
    }

    if (clients?.length) {
      // Sort clients by created_at descending to get most recent first
      const recentClients = clients
        .filter(c => c.created_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      let count = 0;
      const limit = 4;
      for (const c of recentClients) {
        if (count >= limit) break;
        const d = typeof c.created_at === 'string' ? c.created_at.substring(0, 10) : '';
        if (startDate && endDate && (d < startDate || d > endDate)) continue;
        items.push({
          id: `client-${c.id}`,
          type: 'client',
          icon: UserPlus,
          color: 'var(--primary-glow)',
          title: 'Nuevo cliente',
          subtitle: c.name || c.email || 'Desconocido',
          amount: null,
          time: c.created_at,
        });
        count++;
      }
    }

    items.sort((a, b) => parseDate(b.time) - parseDate(a.time));
    if (items.length > 8) items.length = 8;
    return items;
  }, [clients, rawOrders, dateRange]);

  return (
    <div className="glass-card" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>
          <Clock color="var(--primary)" size={20} />
          Actividad Reciente
          <MetricTooltip text="Últimas órdenes recibidas y nuevos clientes registrados. Se actualiza automáticamente cada minuto." />
        </h3>
        <span className="live-dot" data-tooltip="Datos en vivo"></span>
      </div>

      {!rawOrders?.length && !clients?.length ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>
          Cargando actividad...
        </div>
      ) : activities.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>
          Sin actividad reciente en este rango.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, overflowY: 'auto' }}>
          {activities.map((act, i) => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: i < activities.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${act.color}15`, color: act.color,
                flexShrink: 0,
              }}>
                <act.icon size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {act.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {act.subtitle}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {act.amount && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)' }}>{act.amount}</div>
                )}
                <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{timeAgo(act.time)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
