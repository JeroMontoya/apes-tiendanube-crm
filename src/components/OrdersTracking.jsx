import React, { useState, useMemo } from 'react';
import {
  ShoppingCart, Search, Package, CreditCard, Truck, CheckCircle2,
  Clock, XCircle, AlertTriangle, ChevronDown, ChevronRight, Filter,
  ArrowUpDown, User, Calendar, DollarSign, BoxSelect, Receipt, RotateCcw
} from 'lucide-react';

const PAYMENT_STATUS = {
  pending: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock },
  paid: { label: 'Pagado', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle },
  refunded: { label: 'Reembolsado', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: RotateCcw },
  voided: { label: 'Anulado', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: XCircle },
};

const ORDER_STATE = {
  open: { label: 'Abierta', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: Clock },
  closed: { label: 'Cerrada', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle },
};

const FILTER_TABS = [
  { key: 'all', label: 'Todas', icon: ShoppingCart },
  { key: 'pending', label: 'Pendientes Pago', icon: Clock },
  { key: 'paid', label: 'Pagadas', icon: CheckCircle2 },
  { key: 'open', label: 'En Proceso', icon: Package },
  { key: 'shipped', label: 'Despachadas', icon: Truck },
];

function formatCurrency(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(num);
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch { return '—'; }
}

function getStatusBadge(status, config) {
  const Icon = config?.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: config?.bg || 'rgba(255,255,255,0.06)',
      color: config?.color || 'var(--on-surface-variant)',
      border: `1px solid ${config?.color || 'transparent'}22`,
    }}>
      {Icon && <Icon size={12} />}
      {config?.label || status}
    </span>
  );
}

function getShippingStatus(order) {
  if (order.state === 'cancelled') return 'cancelled';
  if (order.state === 'closed') return 'delivered';
  return 'pending';
}

const SHIPPING_STATUS = {
  pending: { label: 'Por empaquetar', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Package },
  delivered: { label: 'Despachado', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: Truck },
  cancelled: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle },
};

export default function OrdersTracking({ rawOrders }) {
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [sortCol, setSortCol] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const PAGE_SIZE = 12;

  const orders = useMemo(() => {
    if (!rawOrders || !Array.isArray(rawOrders)) return [];
    return rawOrders.map(o => ({
      ...o,
      shippingStatus: getShippingStatus(o),
    }));
  }, [rawOrders]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.payment_status === 'pending').length;
    const paid = orders.filter(o => o.payment_status === 'paid').length;
    const totalRevenue = orders
      .filter(o => o.payment_status === 'paid')
      .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    const openOrders = orders.filter(o => o.state === 'open').length;
    const shipped = orders.filter(o => o.shippingStatus === 'delivered').length;
    const cancelled = orders.filter(o => o.payment_status === 'cancelled' || o.payment_status === 'voided').length;
    const avgOrder = paid > 0 ? totalRevenue / paid : 0;
    return { total, pending, paid, totalRevenue, openOrders, shipped, cancelled, avgOrder };
  }, [orders]);

  const filtered = useMemo(() => {
    let result = [...orders];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        (o.number && String(o.number).includes(q)) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(q)) ||
        (o.customer?.email && o.customer.email.toLowerCase().includes(q)) ||
        (o.contact_name && o.contact_name.toLowerCase().includes(q))
      );
    }

    if (filterTab === 'pending') result = result.filter(o => o.payment_status === 'pending');
    else if (filterTab === 'paid') result = result.filter(o => o.payment_status === 'paid');
    else if (filterTab === 'open') result = result.filter(o => o.state === 'open');
    else if (filterTab === 'shipped') result = result.filter(o => o.shippingStatus === 'delivered');

    result.sort((a, b) => {
      let va, vb;
      if (sortCol === 'number') { va = a.number || 0; vb = b.number || 0; }
      else if (sortCol === 'created_at') { va = a.created_at || ''; vb = b.created_at || ''; }
      else if (sortCol === 'customer') { va = a.customer?.name || ''; vb = b.customer?.name || ''; }
      else if (sortCol === 'total') { va = parseFloat(a.total) || 0; vb = parseFloat(b.total) || 0; }
      else { va = a[sortCol] || ''; vb = b[sortCol] || ''; }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    return result;
  }, [orders, search, filterTab, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => (
    <ArrowUpDown size={12} style={{ opacity: sortCol === col ? 1 : 0.3, transition: 'opacity 0.2s' }} />
  );

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
            <ShoppingCart size={24} color="#3b82f6" /> Seguimiento de Ventas
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--on-surface-variant)', fontSize: 13 }}>
            Historial completo de pedidos con estado de pago y envío
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Pedidos', value: stats.total, icon: ShoppingCart, color: '#3b82f6' },
          { label: 'Pendientes Pago', value: stats.pending, icon: Clock, color: '#f59e0b' },
          { label: 'Pagadas', value: stats.paid, icon: CheckCircle2, color: '#10b981' },
          { label: 'En Proceso', value: stats.openOrders, icon: Package, color: '#8b5cf6' },
          { label: 'Ingresos', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: '#06b6d4' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--glass-bg)', borderRadius: 14, padding: '16px 18px',
            border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${s.color}18`, color: s.color,
            }}>
              <s.icon size={20} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--on-surface)', lineHeight: 1.1 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '0 0 280px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
          <input
            type="text"
            placeholder="Buscar por #, cliente o email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            style={{
              width: '100%', padding: '10px 14px 10px 38px', borderRadius: 10,
              border: '1px solid var(--glass-border)', background: 'var(--glass-bg)',
              color: 'var(--on-surface)', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {FILTER_TABS.map(tab => {
            const Icon = tab.icon;
            const active = filterTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setFilterTab(tab.key); setPage(0); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                  background: active ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  color: active ? '#fff' : 'var(--on-surface-variant)',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { key: 'number', label: '# Venta', w: '8%' },
                  { key: 'created_at', label: 'Fecha', w: '11%' },
                  { key: 'customer', label: 'Cliente', w: '18%' },
                  { key: 'total', label: 'Total', w: '12%' },
                  { key: 'products', label: 'Productos', w: '22%' },
                  { key: 'payment_status', label: 'Pago', w: '11%' },
                  { key: 'shipping', label: 'Envío', w: '12%' },
                  { key: 'expand', label: '', w: '6%' },
                ].map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.key !== 'expand' && col.key !== 'products' && toggleSort(col.key)}
                    style={{
                      width: col.w, padding: '12px 14px', textAlign: 'left', fontWeight: 600,
                      color: 'var(--on-surface-variant)', fontSize: 11, textTransform: 'uppercase',
                      letterSpacing: 0.5, cursor: col.key !== 'expand' && col.key !== 'products' ? 'pointer' : 'default',
                      userSelect: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {col.key !== 'expand' && col.key !== 'products' && <SortIcon col={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((order, i) => {
                const isExpanded = expandedOrder === order.id;
                const payConf = PAYMENT_STATUS[order.payment_status] || PAYMENT_STATUS.pending;
                const shipConf = SHIPPING_STATUS[order.shippingStatus] || SHIPPING_STATUS.pending;
                return (
                  <React.Fragment key={order.id}>
                    <tr
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}
                    >
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 13 }}>
                          #{order.number || order.id}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--on-surface-variant)', fontSize: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={12} style={{ opacity: 0.5 }} />
                          {formatDate(order.created_at)}
                        </span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                            background: `hsl(${(order.number * 37) % 360}, 55%, 25%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, color: '#fff',
                          }}>
                            {(order.customer?.name || order.contact_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--on-surface)' }}>
                              {order.customer?.name || order.contact_name || 'Sin nombre'}
                            </div>
                            {order.customer?.email && (
                              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 1 }}>
                                {order.customer.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', fontWeight: 700, color: '#10b981', fontSize: 13 }}>
                        {formatCurrency(order.total)}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(order.products || []).slice(0, 2).map((p, pi) => (
                            <span key={pi} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '2px 8px', borderRadius: 6, fontSize: 11,
                              background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
                              border: '1px solid rgba(59,130,246,0.2)',
                            }}>
                              {p.quantity}x {p.name?.length > 20 ? p.name.substring(0, 20) + '...' : p.name}
                            </span>
                          ))}
                          {(order.products || []).length > 2 && (
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: 11,
                              background: 'rgba(255,255,255,0.06)', color: 'var(--on-surface-variant)',
                            }}>
                              +{order.products.length - 2} más
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {getStatusBadge(order.payment_status, payConf)}
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {getStatusBadge(order.shippingStatus, shipConf)}
                      </td>
                      <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                        <button
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                            color: 'var(--on-surface-variant)', transition: 'color 0.2s',
                          }}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} style={{ padding: '0 14px 14px', background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16,
                            padding: '16px 0',
                          }}>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
                                Productos ({(order.products || []).length})
                              </div>
                              {(order.products || []).map((p, pi) => (
                                <div key={pi} style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                  fontSize: 12,
                                }}>
                                  <span style={{ color: 'var(--on-surface)' }}>{p.name}</span>
                                  <span style={{ color: 'var(--on-surface-variant)' }}>
                                    {p.quantity}x {formatCurrency(p.price)}
                                  </span>
                                </div>
                              ))}
                              <div style={{
                                display: 'flex', justifyContent: 'space-between', marginTop: 8,
                                padding: '8px 0', borderTop: '2px solid rgba(255,255,255,0.08)',
                                fontWeight: 700, fontSize: 13,
                              }}>
                                <span>Total</span>
                                <span style={{ color: '#10b981' }}>{formatCurrency(order.total)}</span>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
                                Datos del Cliente
                              </div>
                              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                                <div><strong>Nombre:</strong> {order.customer?.name || order.contact_name || '—'}</div>
                                <div><strong>Email:</strong> {order.customer?.email || '—'}</div>
                                <div><strong>Teléfono:</strong> {order.customer?.phone || '—'}</div>
                                <div><strong>DNI/CUIT:</strong> {order.billing_identification || '—'}</div>
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
                                Detalles del Pedido
                              </div>
                              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                                <div><strong>Pedido:</strong> #{order.number || order.id}</div>
                                <div><strong>Estado:</strong> {ORDER_STATE[order.state]?.label || order.state}</div>
                                <div><strong>Pago:</strong> {PAYMENT_STATUS[order.payment_status]?.label || order.payment_status}</div>
                                <div><strong>Envío:</strong> {SHIPPING_STATUS[order.shippingStatus]?.label || '—'}</div>
                                {order.discount > 0 && (
                                  <div style={{ color: '#f59e0b' }}><strong>Descuento:</strong> -{formatCurrency(order.discount)}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <div>No se encontraron pedidos</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
              Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: '1px solid var(--glass-border)',
                  background: page === 0 ? 'transparent' : 'rgba(255,255,255,0.05)',
                  color: page === 0 ? 'var(--on-surface-variant)' : 'var(--on-surface)',
                  cursor: page === 0 ? 'default' : 'pointer', fontSize: 12, fontWeight: 600,
                  opacity: page === 0 ? 0.4 : 1,
                }}
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: '1px solid var(--glass-border)',
                  background: page >= totalPages - 1 ? 'transparent' : 'var(--primary)',
                  color: page >= totalPages - 1 ? 'var(--on-surface-variant)' : '#fff',
                  cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: 12, fontWeight: 600,
                  opacity: page >= totalPages - 1 ? 0.4 : 1,
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
