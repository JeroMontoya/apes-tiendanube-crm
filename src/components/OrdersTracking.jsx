import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingCart, Search, Package, CreditCard, Truck, CheckCircle2,
  Clock, XCircle, AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Filter,
  ArrowUpDown, User, Calendar, DollarSign, Box, RotateCcw,
  RefreshCw, Eye, Download, Zap, TrendingUp, TrendingDown,
  BarChart2, PieChart, Activity, Flag, MapPin, Smartphone,
  Globe, Layers, MoveHorizontal, MinusSquare, PlusSquare,
  AlertCircle, Award, Star, Tag, ExternalLink, Printer,
  Copy, Share2, MoreHorizontal, FilterX, Zap as ZapIcon,
  Settings, Command, Keyboard, Sparkles, Layout, List,
  CalendarDays, Inbox, Archive, Trash2, Edit3, Bell
} from 'lucide-react';

const PAYMENT_STATUS = {
  pending: { label: 'Pendiente', color: 'var(--primary-container)', bg: 'rgba(245,158,11,0.12)', icon: Clock, subLabel: 'Esperando pago' },
  paid: { label: 'Pagado', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2, subLabel: 'Confirmado' },
  cancelled: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle, subLabel: 'Por el cliente' },
  refunded: { label: 'Reembolsado', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: RotateCcw, subLabel: 'Dinero devuelto' },
  voided: { label: 'Anulado', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: XCircle, subLabel: 'Transacción void' },
};

const ORDER_STATE = {
  open: { label: 'Abierta', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: Clock },
  closed: { label: 'Cerrada', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle },
};

const FULFILLMENT_STATUS = {
  pending: { label: 'Por preparar', color: 'var(--primary-container)', bg: 'rgba(245,158,11,0.12)', icon: Package, action: 'Preparar', step: 1 },
  partial: { label: 'Despacho parcial', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: Package, action: 'Completar', step: 2 },
  fulfilled: { label: 'Despachado', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: Truck, action: 'Entregado', step: 3 },
  delivered: { label: 'Entregado', color: '#059669', bg: 'rgba(5,150,105,0.12)', icon: CheckCircle2, action: 'Completado', step: 4 },
  cancelled: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: XCircle, action: '—', step: 0 },
};

const FUNNEL_STEPS = [
  { key: 'created', label: 'Creados', icon: ShoppingCart, color: '#3b82f6' },
  { key: 'paid', label: 'Pagados', icon: CreditCard, color: '#10b981' },
  { key: 'preparing', label: 'En preparación', icon: Package, color: 'var(--primary-container)' },
  { key: 'shipped', label: 'Despachados', icon: Truck, color: '#8b5cf6' },
  { key: 'delivered', label: 'Entregados', icon: CheckCircle2, color: '#059669' },
];

function formatCurrency(value, currency = 'COP') {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function formatDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' }); } catch { return '—'; }
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return '—'; }
}

function StatusBadge({ status, config }) {
  const c = config || PAYMENT_STATUS[status] || PAYMENT_STATUS.pending;
  const Icon = c.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.color}33`,
      whiteSpace: 'nowrap'
    }}>
      <Icon size={10} /> {c.label}
    </span>
  );
}

function getFulfillmentConfig(order) {
  if (order.state === 'cancelled') return FULFILLMENT_STATUS.cancelled;
  const fs = order.fulfillment_status;
  if (fs === 'fulfilled') return FULFILLMENT_STATUS.fulfilled;
  if (fs === 'partial') return FULFILLMENT_STATUS.partial;
  if (order.state === 'closed' && !fs) return FULFILLMENT_STATUS.fulfilled;
  return FULFILLMENT_STATUS.pending;
}

function Sparkline({ data, color = '#3b82f6', height = 32 }) {
  if (!data || data.length < 2) return <div style={{ width: 100, height, opacity: 0.3 }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100}%,${100 - ((v - min) / range) * 90}%`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, overflow: 'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparkLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${points} 100,100`} fill="url(#sparkGrad)" />
      <polyline points={points} fill="none" stroke="url(#sparkLine)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={data.length > 1 ? 100 : 50} cy={100 - ((data[data.length - 1] - min) / range) * 90} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}

function KeyboardShortcuts() {
  const shortcuts = [
    { keys: ['⌘', 'K'], desc: 'Búsqueda global' },
    { keys: ['⌘', 'N'], desc: 'Nuevo pedido' },
    { keys: ['⌘', 'F'], desc: 'Filtros' },
    { keys: ['⌘', 'Shift', 'K'], desc: 'Vista Kanban' },
    { keys: ['⌘', 'Shift', 'T'], desc: 'Vista Tabla' },
    { keys: ['⌘', 'Shift', 'F'], desc: 'Embudo' },
    { keys: ['?'], desc: 'Atajos' },
  ];
  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--on-surface)' }}>Atajos de teclado</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {shortcuts.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--on-surface-variant)' }}>
            <kbd style={{ background: 'var(--surface-container)', border: '1px solid var(--border-subtle)', borderRadius: 4, padding: '2px 6px', fontFamily: 'monospace', fontSize: 10 }}>{s.keys.join(' + ')}</kbd>
            <span>{s.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentFunnel({ orders }) {
  const funnelData = useMemo(() => {
    const created = orders.length;
    const paid = orders.filter(o => o.payment_status === 'paid').length;
    const preparing = orders.filter(o => o.state === 'open' && o.payment_status === 'paid').length;
    const shipped = orders.filter(o => o.fulfillment_status === 'fulfilled').length;
    const delivered = orders.filter(o => o.fulfillment_status === 'delivered' || (o.fulfillment_status === 'fulfilled' && o.shipping_status === 'delivered')).length;
    return { created, paid, preparing, shipped, delivered };
  }, [orders]);

  const maxCount = Math.max(...Object.values(funnelData));

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart2 size={16} color="#3b82f6" /> Embudo de Conversión
      </h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
        {FUNNEL_STEPS.map((step, i) => {
          const keys = ['created', 'paid', 'preparing', 'shipped', 'delivered'];
          const count = funnelData[keys[i]] || 0;
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const dropOff = i > 0 ? funnelData[keys[i-1]] - count : 0;
          const dropPct = funnelData[keys[i-1]] > 0 ? ((dropOff / funnelData[keys[i-1]]) * 100).toFixed(1) : 0;
          return (
            <div key={step.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{ 
                width: '100%', 
                height: `${Math.max(pct, 10)}%`, 
                minHeight: 20,
                background: `linear-gradient(180deg, ${step.color} 0%, ${step.color}CC 100%)`,
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: 8,
                position: 'relative',
                transition: 'height 0.5s cubic-bezier(0.4,0,0.2,1)',
              }}>
                <span style={{ 
                  color: 'var(--on-surface)', 
                  fontWeight: 800, 
                  fontSize: 14,
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap'
                }}>
                  {count.toLocaleString()}
                </span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                  <step.icon size={14} color={step.color} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface)' }}>{step.label}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>
                  {(count / funnelData.created * 100).toFixed(1)}% del total
                </div>
                {i > 0 && dropOff > 0 && (
                  <div style={{ fontSize: 9, color: '#ef4444', fontWeight: 600, marginTop: 2 }}>
                    −{dropPct}% ({dropOff.toLocaleString()})
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', fontSize: 11, color: 'var(--on-surface-variant)' }}>
        <span>Conversión: <strong style={{ color: 'var(--on-surface)' }}>{funnelData.created > 0 ? ((funnelData.paid / funnelData.created) * 100).toFixed(1) : 0}%</strong></span>
        <span>Cumplimiento: <strong style={{ color: 'var(--on-surface)' }}>{funnelData.paid > 0 ? ((funnelData.delivered / funnelData.paid) * 100).toFixed(1) : 0}%</strong></span>
      </div>
    </div>
  );
}

function ShippingTimeline({ order }) {
  const trackingEvents = order.shipping_lines?.[0]?.tracking_events || [];
  const fs = order.fulfillment_status || 'pending';
  const config = getFulfillmentConfig(order);
  
  const steps = [
    { key: 'created', label: 'Pedido creado', time: order.created_at, icon: ShoppingCart, color: '#3b82f6', completed: true },
    { key: 'paid', label: 'Pago confirmado', time: order.paid_at || order.updated_at, icon: CreditCard, color: '#10b981', completed: order.payment_status === 'paid' },
    { key: 'preparing', label: 'En preparación', time: order.preparing_at, icon: Package, color: 'var(--primary-container)', completed: fs !== 'pending', current: fs === 'pending' },
    { key: 'shipped', label: 'Despachado', time: order.shipped_at, icon: Truck, color: '#8b5cf6', completed: fs === 'fulfilled' || fs === 'partial' || fs === 'delivered', current: fs === 'partial' },
    { key: 'delivered', label: 'Entregado', time: order.delivered_at, icon: CheckCircle2, color: '#059669', completed: fs === 'delivered', current: fs === 'fulfilled' },
  ];

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} color="#3b82f6" /> Timeline de Envío
        </h3>
        {order.tracking_number && (
          <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
            <ExternalLink size={12} /> Ver tracking #{order.tracking_number}
          </a>
        )}
      </div>
      
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 19, top: 0, bottom: 0, width: 2, background: 'var(--border-subtle)' }} />
        {steps.map((step, i) => (
          <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i === steps.length - 1 ? 0 : 24, position: 'relative' }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', 
              background: step.completed || step.current ? step.color : 'var(--surface-container)',
              border: step.current ? `3px solid ${step.color}` : '2px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, zIndex: 1, boxShadow: step.current ? `0 0 0 4px ${step.color}33` : 'none',
              transition: 'all 0.3s ease'
            }}>
              <step.icon size={step.completed ? 16 : 14} color={step.completed || step.current ? '#fff' : 'var(--on-surface-variant)'} />
            </div>
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--on-surface)' }}>{step.label}</span>
                {step.current && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: `${step.color}20`, color: step.color, fontWeight: 700 }}>ACTUAL</span>}
                {step.completed && !step.current && <CheckCircle2 size={12} color={step.color} />}
              </div>
              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                {step.time ? formatDateTime(step.time) : '— Pendiente —'}
              </div>
              {step.key === 'shipped' && order.carrier && (
                <div style={{ marginTop: 4, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)' }}>
                  <Truck size={12} /> Transportista: <strong>{order.carrier}</strong>
                  {order.shipping_method && <span> · Método: {order.shipping_method}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {trackingEvents.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Eventos de Tracking</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {trackingEvents.slice(0, 10).map((event, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 10px', background: 'var(--surface-container)', borderRadius: 8, fontSize: 11 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--on-surface)', fontWeight: 500 }}>{event.status || event.description || 'Actualización'}</div>
                  <div style={{ color: 'var(--on-surface-variant)' }}>{event.location ? `${event.location} · ` : ''}{event.timestamp ? formatDateTime(event.timestamp) : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderDetailModal({ order, onClose, rawOrders }) {
  if (!order) return null;
  
  const fulfillmentConfig = getFulfillmentConfig(order);
  const paymentConfig = PAYMENT_STATUS[order.payment_status] || PAYMENT_STATUS.pending;
  const stateConfig = ORDER_STATE[order.state] || ORDER_STATE.open;
  
  const relatedOrders = rawOrders?.filter(o => 
    o.customer?.id === order.customer?.id && o.id !== order.id
  ).slice(0, 5) || [];

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', 
      zIndex: 1000, padding: 20, animation: 'fadeIn 0.2s ease'
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 900, maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)', animation: 'slideUp 0.3s ease',
        minWidth: 0, wordBreak: 'break-word'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(180deg, rgba(59,130,246,0.04) 0%, transparent 100%)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>#{order.number || order.id}</span>
              <StatusBadge status={order.payment_status} config={paymentConfig} />
              <StatusBadge status={order.fulfillment_status || 'pending'} config={fulfillmentConfig} />
              <StatusBadge status={order.state} config={stateConfig} />
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--on-surface-variant)' }}>
              <span><strong>Creado:</strong> {formatDateTime(order.created_at)}</span>
              <span><strong>Cliente:</strong> {order.customer?.name || order.contact_name || 'Sin nombre'}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-container-high)', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--error-container)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-container-high)'}><XCircle size={20} /></button>
        </div>

        <div className="responsive-grid" style={{ flex: 1, overflow: 'auto', padding: 20, minWidth: 0 }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            {/* Order Summary */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingCart size={16} color="#3b82f6" /> Resumen del Pedido</h4>
              <div className="responsive-grid-xs" style={{ gap: 12 }}>
                <div><span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Subtotal</span><div style={{ fontWeight: 700, color: 'var(--on-surface)' }}>{formatCurrency(order.subtotal)}</div></div>
                <div><span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Descuento</span><div style={{ fontWeight: 700, color: 'var(--primary-container)' }}>-{formatCurrency(order.discount)}</div></div>
                <div><span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Envío</span><div style={{ fontWeight: 700, color: 'var(--on-surface)' }}>{formatCurrency(order.shipping_cost)}</div></div>
                <div><span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Impuestos</span><div style={{ fontWeight: 700, color: 'var(--on-surface)' }}>{formatCurrency(order.tax)}</div></div>
                <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>TOTAL</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{formatCurrency(order.total)}</div>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}><Box size={16} color="#8b5cf6" /> Productos ({order.products?.length || 0})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {order.products?.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--surface-container)', borderRadius: 10 }}>
                    {p.image && <img src={p.image} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', display: 'flex', gap: 12, marginTop: 2 }}>
                        <span>{p.quantity}x {formatCurrency(p.price)}</span>
                        <span>{p.sku || p.variant_id ? `SKU: ${p.sku || p.variant_id}` : ''}</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#10b981', fontSize: 13 }}>{formatCurrency((parseFloat(p.price) || 0) * (p.quantity || 1))}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}><User size={16} color="#f43f5e" /> Cliente</h4>
              <div className="responsive-grid-xs" style={{ gap: 12 }}>
                <div><span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Nombre</span><div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{order.customer?.name || order.contact_name || '—'}</div></div>
                <div><span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Email</span><div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{order.customer?.email || order.contact_email || '—'}</div></div>
                <div><span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Teléfono</span><div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{order.customer?.phone || order.contact_phone || '—'}</div></div>
                <div><span style={{ fontSize: 10, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>DNI/CUIT</span><div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{order.billing_identification || '—'}</div></div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <ShippingTimeline order={order} />

            {/* Addresses */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={16} color="#06b6d4" /> Direcciones</h4>
              <div className="responsive-grid-xs" style={{ gap: 16 }}>
                {order.shipping_address && (
                  <div style={{ padding: 12, background: 'var(--surface-container)', borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Envío</div>
                    <div style={{ fontSize: 12, color: 'var(--on-surface)', lineHeight: 1.6 }}>
                      {order.shipping_address.name}<br/>
                      {order.shipping_address.street}<br/>
                      {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.zip_code}<br/>
                      {order.shipping_address.country}
                    </div>
                  </div>
                )}
                {order.billing_address && (
                  <div style={{ padding: 12, background: 'var(--surface-container)', borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Facturación</div>
                    <div style={{ fontSize: 12, color: 'var(--on-surface)', lineHeight: 1.6 }}>
                      {order.billing_address.name}<br/>
                      {order.billing_address.street}<br/>
                      {order.billing_address.city}, {order.billing_address.province} {order.billing_address.zip_code}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Related Orders */}
            {relatedOrders.length > 0 && (
              <div className="glass-card" style={{ padding: 20 }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}><RotateCcw size={16} color="#8b5cf6" /> Otros pedidos del cliente ({relatedOrders.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {relatedOrders.map(o => (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-container)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container-high)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-container)'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>#{o.number || o.id}</span>
                        <StatusBadge status={o.payment_status} config={PAYMENT_STATUS[o.payment_status] || PAYMENT_STATUS.pending} />
                        <StatusBadge status={o.fulfillment_status || 'pending'} config={getFulfillmentConfig(o)} />
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 11 }}>
                        <div style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(o.total)}</div>
                        <div style={{ color: 'var(--on-surface-variant)' }}>{formatDate(o.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanBoard({ orders, onUpdateOrder, onSelectOrder }) {
  const columns = [
    { key: 'pending', title: 'Por Pagar', icon: Clock, color: 'var(--primary-container)', filter: o => o.payment_status === 'pending' },
    { key: 'paid', title: 'Pagados · Por Preparar', icon: CreditCard, color: '#3b82f6', filter: o => o.payment_status === 'paid' && o.fulfillment_status === 'pending' },
    { key: 'preparing', title: 'En Preparación', icon: Package, color: 'var(--primary-container)', filter: o => o.fulfillment_status === 'pending' && o.payment_status === 'paid' },
    { key: 'partial', title: 'Despacho Parcial', icon: Package, color: '#8b5cf6', filter: o => o.fulfillment_status === 'partial' },
    { key: 'shipped', title: 'Despachados', icon: Truck, color: '#8b5cf6', filter: o => o.fulfillment_status === 'fulfilled' },
    { key: 'delivered', title: 'Entregados', icon: CheckCircle2, color: '#10b981', filter: o => o.fulfillment_status === 'delivered' },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, minHeight: 500 }}>
      {columns.map(col => {
        const colOrders = orders.filter(col.filter);
        return (
          <div key={col.key} style={{ minWidth: 300, maxWidth: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', background: `${col.color}15`, border: `1px solid ${col.color}30`, borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <col.icon size={16} color={col.color} />
                <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--on-surface)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col.title}</span>
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 10, background: col.color, color: 'var(--on-surface)', fontSize: 11, fontWeight: 700 }}>{colOrders.length}</span>
            </div>
            <div style={{ flex: 1, background: 'var(--surface-container)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflowY: 'auto', maxHeight: 480, minHeight: 480 }}>
              {colOrders.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <col.icon size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p style={{ fontSize: 12 }}>Sin pedidos</p>
                </div>
              ) : (
                <div style={{ padding: 8 }}>
                  {colOrders.map((order, i) => (
                    <div key={order.id} onClick={() => onSelectOrder(order)} style={{ 
                      padding: '12px', marginBottom: 8, background: 'var(--surface)', borderRadius: 8, 
                      border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>#{order.number || order.id}</span>
                        <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{formatDate(order.created_at)}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--on-surface)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.customer?.name || order.contact_name || 'Sin nombre'}</div>
                      <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 8 }}>{order.customer?.email || order.contact_email || ''}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#10b981', fontSize: 14 }}>{formatCurrency(order.total)}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <StatusBadge status={order.payment_status} config={PAYMENT_STATUS[order.payment_status] || PAYMENT_STATUS.pending} />
                          <StatusBadge status={order.fulfillment_status || 'pending'} config={getFulfillmentConfig(order)} />
                        </div>
                      </div>
                      {order.tracking_number && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--primary)' }}>
                          <ExternalLink size={10} /> Tracking: {order.tracking_number}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdvancedFilters({ orders, filters, onFiltersChange, savedViews, onSaveView }) {
  const [expanded, setExpanded] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [viewName, setViewName] = useState('');

  const paymentStatuses = [...new Set(orders.map(o => o.payment_status).filter(Boolean))];
  const fulfillmentStatuses = [...new Set(orders.map(o => o.fulfillment_status || 'pending').filter(Boolean))];
  const states = [...new Set(orders.map(o => o.state).filter(Boolean))];
  const carriers = [...new Set(orders.map(o => o.carrier).filter(Boolean))];
  const tags = [...new Set(orders.flatMap(o => o.segmentTags || []).filter(Boolean))];

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Filter size={18} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--on-surface)' }}>Filtros Avanzados</span>
          <span style={{ padding: '2px 8px', borderRadius: 10, background: 'var(--primary)', color: 'var(--on-surface)', fontSize: 10, fontWeight: 700 }}>
            {Object.values(filters).flat().filter(Boolean).length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ChevronDown size={16} color="var(--on-surface-variant)" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }} />
          <button onClick={e => { e.stopPropagation(); setShowSaveDialog(true); }} style={{ padding: '6px 12px', background: 'var(--primary)', color: 'var(--on-surface)', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><PlusSquare size={12} /> Guardar vista</button>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <FilterGroup label="Estado de Pago" options={paymentStatuses} value={filters.paymentStatus} onChange={v => onFiltersChange({ ...filters, paymentStatus: v })} multi />
          <FilterGroup label="Estado Envío" options={fulfillmentStatuses} value={filters.fulfillmentStatus} onChange={v => onFiltersChange({ ...filters, fulfillmentStatus: v })} multi />
          <FilterGroup label="Estado Pedido" options={states} value={filters.state} onChange={v => onFiltersChange({ ...filters, state: v })} multi />
          <FilterGroup label="Transportista" options={carriers} value={filters.carrier} onChange={v => onFiltersChange({ ...filters, carrier: v })} multi />
          <FilterGroup label="Segmentos" options={tags} value={filters.tags} onChange={v => onFiltersChange({ ...filters, tags: v })} multi />
          
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 6 }}>Rango de Total</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" placeholder="Min" value={filters.minTotal || ''} onChange={e => onFiltersChange({ ...filters, minTotal: e.target.value ? parseFloat(e.target.value) : null })} style={{ ...inputStyle, width: '100%' }} />
                <input type="number" placeholder="Max" value={filters.maxTotal || ''} onChange={e => onFiltersChange({ ...filters, maxTotal: e.target.value ? parseFloat(e.target.value) : null })} style={{ ...inputStyle, width: '100%' }} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 6 }}>Rango de Fechas</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={filters.dateFrom || ''} onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value || null })} style={{ ...inputStyle, width: '100%' }} />
                <input type="date" value={filters.dateTo || ''} onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value || null })} style={{ ...inputStyle, width: '100%' }} />
              </div>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={() => onFiltersChange({})} style={{ flex: 1, padding: '10px', background: 'var(--surface-container)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--on-surface)', fontWeight: 600, cursor: 'pointer' }}><FilterX size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Limpiar todo</button>
            {savedViews.length > 0 && (
              <select onChange={e => { if (e.target.value) onFiltersChange(savedViews.find(v => v.id === e.target.value)?.filters || {}); }} style={{ padding: '10px', background: 'var(--surface-container)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--on-surface)', minWidth: 200 }}>
                <option value="">📋 Vistas guardadas...</option>
                {savedViews.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--on-surface)', fontSize: 12, outline: 'none' };

function FilterGroup({ label, options, value, onChange, multi }) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 6 }}>{label} ({selected.length})</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 100, overflowY: 'auto' }}>
        {options.map(opt => (
          <label key={opt} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, border: '1px solid var(--glass-border)', background: selected.includes(opt) ? 'var(--primary)' : 'var(--surface-container)', color: selected.includes(opt) ? '#fff' : 'var(--on-surface)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            <input type="checkbox" checked={selected.includes(opt)} onChange={e => {
              const newVal = e.target.checked 
                ? (multi ? [...selected, opt] : [opt])
                : selected.filter(v => v !== opt);
              onChange(multi ? newVal : newVal[0]);
            }} style={{ accentColor: 'var(--primary)', width: 12, height: 12 }} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function OrdersTracking({ rawOrders, lastSync, refreshOrders, storeId, workspaceData }) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('kanban');
  const [filters, setFilters] = useState({
    paymentStatus: [],
    fulfillmentStatus: [],
    state: [],
    carrier: [],
    tags: [],
    minTotal: null,
    maxTotal: null,
    dateFrom: null,
    dateTo: null,
  });
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', dir: 'desc' });
  const [page, setPage] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [savedViews, setSavedViews] = useState(() => {
    try { return JSON.parse(localStorage.getItem('order_saved_views') || '[]'); } catch { return []; }
  });
  const intervalRef = useRef(null);
  const PAGE_SIZE = 25;

  useEffect(() => {
    if (autoRefresh && storeId) {
      intervalRef.current = setInterval(() => handleRefresh(true), 90000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, storeId]);

  const handleRefresh = useCallback(async (silent = false) => {
    if (!storeId) return;
    if (!silent) setIsRefreshing(true);
    try {
      const token = workspaceData?.tiendanube_access_token || 'system';
      await refreshOrders(storeId, token);
    } catch (e) { console.error('Refresh failed:', e); }
    finally { if (!silent) setIsRefreshing(false); }
  }, [storeId, workspaceData, refreshOrders]);

  const handleSaveView = useCallback((name) => {
    const newView = { id: Date.now().toString(), name, filters, createdAt: new Date().toISOString() };
    const updated = [...savedViews, newView];
    setSavedViews(updated);
    localStorage.setItem('order_saved_views', JSON.stringify(updated));
  }, [filters, savedViews]);

  // Enhanced orders with computed fields
  const enhancedOrders = useMemo(() => {
    if (!rawOrders || !Array.isArray(rawOrders)) return [];
    return rawOrders.map(o => ({
      ...o,
      fulfillmentConfig: getFulfillmentConfig(o),
      paymentConfig: PAYMENT_STATUS[o.payment_status] || PAYMENT_STATUS.pending,
      stateConfig: ORDER_STATE[o.state] || ORDER_STATE.open,
      isLate: o.fulfillment_status !== 'fulfilled' && o.fulfillment_status !== 'delivered' && 
              o.created_at && (Date.now() - new Date(o.created_at).getTime()) > 7 * 24 * 60 * 60 * 1000,
      daysSinceCreated: o.created_at ? Math.floor((Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    }));
  }, [rawOrders]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    let result = [...enhancedOrders];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        (o.number && String(o.number).includes(q)) ||
        (o.customer?.name?.toLowerCase().includes(q)) ||
        (o.customer?.email?.toLowerCase().includes(q)) ||
        (o.contact_name?.toLowerCase().includes(q)) ||
        (o.tracking_number?.toLowerCase().includes(q))
      );
    }

    if (filters.paymentStatus?.length) result = result.filter(o => filters.paymentStatus.includes(o.payment_status));
    if (filters.fulfillmentStatus?.length) result = result.filter(o => filters.fulfillmentStatus.includes(o.fulfillment_status || 'pending'));
    if (filters.state?.length) result = result.filter(o => filters.state.includes(o.state));
    if (filters.carrier?.length) result = result.filter(o => filters.carrier.includes(o.carrier));
    if (filters.tags?.length) result = result.filter(o => filters.tags.some(t => o.segmentTags?.includes(t)));
    if (filters.minTotal != null) result = result.filter(o => (parseFloat(o.total) || 0) >= filters.minTotal);
    if (filters.maxTotal != null) result = result.filter(o => (parseFloat(o.total) || 0) <= filters.maxTotal);
    if (filters.dateFrom) result = result.filter(o => o.created_at && o.created_at >= filters.dateFrom);
    if (filters.dateTo) result = result.filter(o => o.created_at && o.created_at <= filters.dateTo + 'T23:59:59');

    result.sort((a, b) => {
      let va = a[sortConfig.key];
      let vb = b[sortConfig.key];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va instanceof Date) va = va.getTime();
      if (vb instanceof Date) vb = vb.getTime();
      if (va === undefined || va === null) va = '';
      if (vb === undefined || vb === null) vb = '';
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortConfig.dir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [enhancedOrders, search, filters, sortConfig]);

  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const pagedOrders = filteredOrders.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Stats
  const stats = useMemo(() => {
    const paid = enhancedOrders.filter(o => o.payment_status === 'paid');
    const pending = enhancedOrders.filter(o => o.payment_status === 'pending');
    const fulfilled = enhancedOrders.filter(o => o.fulfillment_status === 'fulfilled' || o.fulfillment_status === 'delivered');
    const partial = enhancedOrders.filter(o => o.fulfillment_status === 'partial');
    const late = enhancedOrders.filter(o => o.isLate);
    const totalRevenue = paid.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const avgOrder = paid.length > 0 ? totalRevenue / paid.length : 0;
    
    return {
      total: enhancedOrders.length,
      paid: paid.length,
      pending: pending.length,
      fulfilled: fulfilled.length,
      partial: partial.length,
      late: late.length,
      totalRevenue,
      avgOrder,
      conversionRate: enhancedOrders.length > 0 ? (paid.length / enhancedOrders.length * 100) : 0,
      fulfillmentRate: paid.length > 0 ? (fulfilled.length / paid.length * 100) : 0,
    };
  }, [enhancedOrders]);

  const toggleSort = (key) => {
    if (sortConfig.key === key) setSortConfig(c => ({ ...c, dir: c.dir === 'asc' ? 'desc' : 'asc' }));
    else setSortConfig({ key, dir: 'desc' });
    setPage(0);
  };

  const SortIcon = ({ key }) => (
    <ArrowUpDown size={12} style={{ opacity: sortConfig.key === key ? 1 : 0.3, transform: sortConfig.key === key && sortConfig.dir === 'desc' ? 'rotate(180deg)' : 'rotate(0)', transition: 'all 0.2s' }} />
  );

  // Weekly revenue data for sparkline
  const weeklyRevenue = useMemo(() => {
    const weeks = [];
    const now = Date.now();
    for (let i = 11; i >= 0; i--) {
      const weekStart = now - i * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
      const weekRevenue = enhancedOrders
        .filter(o => o.payment_status === 'paid' && o.created_at && new Date(o.created_at).getTime() >= weekStart && new Date(o.created_at).getTime() < weekEnd)
        .reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
      weeks.push(weekRevenue);
    }
    return weeks;
  }, [enhancedOrders]);

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
            <ShoppingCart size={24} color="#3b82f6" /> Centro de Operaciones
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--on-surface-variant)', fontSize: 13 }}>
            Pipeline completo: pago → preparación → envío → entrega
            {lastSync && <span style={{ marginLeft: 8, opacity: 0.7 }}>· Última sync: {lastSync.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: 'var(--primary)' }} /> Auto-sync 90s
          </label>
          <button onClick={() => handleRefresh(false)} disabled={isRefreshing || !storeId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--glass-border)', background: isRefreshing ? 'rgba(59,130,246,0.1)' : 'var(--border-subtle)', color: isRefreshing ? '#3b82f6' : 'var(--on-surface)', cursor: isRefreshing ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}><RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />{isRefreshing ? 'Sincronizando...' : 'Actualizar'}</button>
          <button onClick={() => setShowShortcuts(!showShortcuts)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: showShortcuts ? 'var(--primary)' : 'var(--border-subtle)', color: showShortcuts ? '#fff' : 'var(--on-surface-variant)', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}><Keyboard size={14} /> Atajos</button>
        </div>
      </div>

      {/* KPIs Row */}
      <div className="responsive-grid-sm" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total', value: stats.total, icon: ShoppingCart, color: '#3b82f6', trend: '+5%' },
          { label: 'Pagados', value: stats.paid, icon: CreditCard, color: '#10b981', trend: '+3%' },
          { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'var(--primary-container)', trend: '-2%' },
          { label: 'Entregados', value: stats.fulfilled, icon: CheckCircle2, color: '#06b6d4', trend: '+8%' },
          { label: 'Parciales', value: stats.partial, icon: Package, color: '#8b5cf6', trend: '+1%' },
          { label: 'Retrasados', value: stats.late, icon: AlertCircle, color: '#ef4444', trend: '-3%' },
          { label: 'Ingresos', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: '#06b6d4', trend: '+12%' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            borderRadius: 'var(--radius-md)', padding: '14px 16px',
            border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            cursor: 'default',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${s.color}25`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${s.color}15`, color: s.color, flexShrink: 0,
            }}><s.icon size={17} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.1 }}>{s.value}</div>
            </div>
            <span style={{
              fontSize: 9, padding: '3px 8px', borderRadius: 9999,
              background: `${s.color}15`, color: s.color, fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>{s.trend}</span>
          </div>
        ))}

        {/* Conversion Metrics */}
        <div className="glass-card" style={{ padding: 16, background: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(16,185,129,0.05) 100%)', border: '1px solid var(--glass-border)' }}>
          <div className="responsive-grid-sm" style={{ gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{stats.conversionRate.toFixed(1)}%</div>
              <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase' }}>Conversión Pago</div>
            </div>
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{stats.fulfillmentRate.toFixed(1)}%</div>
              <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase' }}>Cumplimiento</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary-container)', lineHeight: 1 }}>{formatCurrency(stats.avgOrder)}</div>
              <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', fontWeight: 600, textTransform: 'uppercase' }}>Ticket Promedio</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <AdvancedFilters 
        orders={enhancedOrders} 
        filters={filters} 
        onFiltersChange={setFilters} 
        savedViews={savedViews}
        onSaveView={handleSaveView}
      />

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--surface-container)', borderRadius: 8, border: '1px solid var(--glass-border)', padding: 4 }}>
        {['kanban', 'table', 'funnel'].map(v => (
          <button key={v} onClick={() => { setViewMode(v); setPage(0); }} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', background: viewMode === v ? 'var(--primary)' : 'transparent', color: viewMode === v ? '#fff' : 'var(--on-surface-variant)', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
            {v === 'kanban' && <Layers size={14} />}
            {v === 'table' && <BarChart2 size={14} />}
            {v === 'funnel' && <PieChart size={14} />}
            <span style={{ display: v !== 'kanban' ? 'none' : 'inline' }}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === 'kanban' && (
        <KanbanBoard orders={filteredOrders} onSelectOrder={setSelectedOrder} />
      )}

      {viewMode === 'funnel' && (
        <div style={{ display: 'grid', gap: 20 }}>
          <PaymentFunnel orders={filteredOrders} />
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color="#3b82f6" /> Ingresos semanales (12 semanas)
            </h3>
            <div style={{ height: 60, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
              {weeklyRevenue.map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', height: '100%', minHeight: 8, background: i === 11 ? 'var(--primary)' : 'var(--border-subtle)', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', bottom: 0, left: 0, right: 0, 
                      height: weeklyRevenue.length > 0 ? `${Math.max((v / Math.max(...weeklyRevenue)) * 100, 2)}%` : '2%',
                      background: i === 11 ? 'linear-gradient(180deg, var(--primary) 0%, var(--primary)CC 100%)' : 'transparent',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.5s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>{i === 11 ? 'Esta semana' : `${i+1}s`}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'table' && (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--surface-container-low)' }}>
                  {[
                    { key: 'created_at', label: 'Fecha', width: 110 },
                    { key: 'number', label: 'Orden', width: 100 },
                    { key: 'customer', label: 'Cliente', width: 200 },
                    { key: 'payment_status', label: 'Pago', width: 120 },
                    { key: 'fulfillment_status', label: 'Envío', width: 140 },
                    { key: 'carrier', label: 'Transportista', width: 140 },
                    { key: 'total', label: 'Total', width: 120 },
                    { key: 'days', label: 'Días', width: 70 },
                    { key: 'actions', label: '', width: 50 },
                  ].map(col => (
                    <th key={col.key} onClick={() => col.key !== 'actions' && toggleSort(col.key)} style={{ 
                      padding: '12px', textAlign: 'left', fontSize: 11, fontWeight: 600, 
                      textTransform: 'uppercase', color: 'var(--on-surface-variant)', 
                      borderBottom: '1px solid var(--border-subtle)', cursor: col.key !== 'actions' ? 'pointer' : 'default',
                      whiteSpace: 'nowrap', userSelect: 'none', width: col.width
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {col.label}
                        {col.key !== 'actions' && <SortIcon key={col.key} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                      <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <div>No se encontraron pedidos</div>
                    </td>
                  </tr>
                ) : (
                  pagedOrders.map((order, i) => (
                    <tr key={order.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--on-surface-variant)', fontSize: 13, whiteSpace: 'nowrap' }}>{formatDate(order.created_at)}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--primary)', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>#{order.number || order.id}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--on-surface)', fontSize: 13 }}>{order.customer?.name || order.contact_name || 'Sin nombre'}</div>
                        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{order.customer?.email || order.contact_email || ''}</div>
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <StatusBadge status={order.payment_status} config={PAYMENT_STATUS[order.payment_status] || PAYMENT_STATUS.pending} />
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                        <StatusBadge status={order.fulfillment_status || 'pending'} config={getFulfillmentConfig(order)} />
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--on-surface)', fontSize: 12 }}>
                        {order.carrier || '—'}
                        {order.shipping_method && <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}> · {order.shipping_method}</span>}
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: 13, whiteSpace: 'nowrap' }}>{formatCurrency(order.total)}</td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center', fontSize: 11 }}>
                        {order.isLate ? (
                          <span style={{ color: '#ef4444', fontWeight: 600 }}>{order.daysSinceCreated}d <AlertCircle size={12} style={{ verticalAlign: 'middle' }} /></span>
                        ) : (
                          <span style={{ color: 'var(--on-surface-variant)' }}>{order.daysSinceCreated}d</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <button onClick={() => setSelectedOrder(order)} style={{ padding: 6, borderRadius: 6, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--primary)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-variant)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}><Eye size={14} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredOrders.length)} de {filteredOrders.length}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--glass-border)', background: page === 0 ? 'transparent' : 'var(--border-subtle)', color: page === 0 ? 'var(--on-surface-variant)' : 'var(--on-surface)', cursor: page === 0 ? 'default' : 'pointer', fontSize: 11, fontWeight: 600, opacity: page === 0 ? 0.4 : 1 }}>Anterior</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--glass-border)', background: page >= totalPages - 1 ? 'transparent' : 'var(--primary)', color: page >= totalPages - 1 ? 'var(--on-surface-variant)' : '#fff', cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: 11, fontWeight: 600, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Siguiente</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} rawOrders={rawOrders} />
      
      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 1001, padding: 20, animation: 'fadeIn 0.2s ease'
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '85vh',
            overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', animation: 'slideUp 0.3s ease'
          }}>
            <KeyboardShortcuts />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .modal-overlay { animation: fadeIn 0.2s ease; }
        .modal-content { animation: slideUp 0.3s ease; }
      `}</style>
    </div>
  );
}
