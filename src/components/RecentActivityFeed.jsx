import React, { useMemo } from 'react';
import { ShoppingBag, UserPlus, Package, TrendingUp, Clock } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

export default function RecentActivityFeed({ clients, rawOrders, dateRange }) {
  const activities = useMemo(() => {
    const items = [];

    // Date range for filtering
    const start = dateRange?.startDate ? new Date(dateRange.startDate) : null;
    const end = dateRange?.endDate ? new Date(dateRange.endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    // Recent orders (filtered by date range)
    if (rawOrders?.length) {
      let filtered = [...rawOrders].filter(o => o.created_at);
      if (start && end) {
        filtered = filtered.filter(o => {
          const d = new Date(o.created_at);
          return d >= start && d <= end;
        });
      }
      const sorted = filtered
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 6);

      sorted.forEach(order => {
        items.push({
          id: `order-${order.id}`,
          type: 'order',
          icon: ShoppingBag,
          color: '#10b981',
          title: `Pedido #${order.number}`,
          subtitle: order.customer?.name || 'Cliente',
          amount: order.total ? `$${parseFloat(order.total).toLocaleString()}` : null,
          time: order.created_at,
        });
      });
    }

    // New clients (within date range)
    if (clients?.length) {
      let recentClients = clients.filter(c => c.created_at);
      if (start && end) {
        recentClients = recentClients.filter(c => {
          const d = new Date(c.created_at);
          return d >= start && d <= end;
        });
      }
      recentClients = recentClients
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4);

      recentClients.forEach(client => {
        items.push({
          id: `client-${client.id}`,
          type: 'client',
          icon: UserPlus,
          color: '#3b82f6',
          title: 'Nuevo cliente',
          subtitle: client.name || client.email || 'Desconocido',
          amount: null,
          time: client.created_at,
        });
      });
    }

    // Sort all by time
    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 8);
  }, [clients, rawOrders, dateRange]);

  return (
    <div className="glass-card" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>
          <Clock color="var(--primary)" size={20} />
          Actividad Reciente
        </h3>
        <span className="live-dot" data-tooltip="Datos en vivo"></span>
      </div>

      {activities.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>
          Sin actividad reciente registrada.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
          {activities.map((act, i) => (
            <div
              key={act.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: i < activities.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                animation: `slideUp 0.3s ease ${i * 50}ms both`,
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
