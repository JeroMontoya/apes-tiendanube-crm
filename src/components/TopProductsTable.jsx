import React, { useMemo } from 'react';
import { Package } from 'lucide-react';

export default function TopProductsTable({ rawOrders, dateRange }) {
  const products = useMemo(() => {
    let orders = rawOrders || [];
    
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      const start = new Date(dateRange.startDate + 'T00:00:00').getTime();
      const end = new Date(dateRange.endDate + 'T23:59:59').getTime();
      orders = orders.filter(o => {
        const d = new Date(o.created_at || o.date || new Date()).getTime();
        return d >= start && d <= end;
      });
    }

    const map = new Map();

    orders.forEach(o => {
      (o.products || []).forEach(p => {
        const name = p.name || 'Producto sin nombre';
        const qty = Number(p.quantity) || 1;
        const price = parseFloat(p.price) || 0;
        const existing = map.get(name) || { name, units: 0, revenue: 0, orders: 0 };
        existing.units += qty;
        existing.revenue += price * qty;
        existing.orders += 1;
        map.set(name, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [rawOrders, dateRange]);

  const formatCurrency = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10, padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 600, padding: '16px 18px 0' }}>
        <Package size={15} /> Productos top {dateRange?.preset ? `(${dateRange.preset})` : ''}
      </div>
      {products.length === 0 ? (
        <div style={{ padding: '0 18px 16px', fontSize: 12, color: 'var(--on-surface-variant)' }}>
          Todavía no hay pedidos suficientes para calcular el ranking en este periodo.
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 12px' }}>
          {products.map((p, i) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < products.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--primary-container)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{p.units} unidades · {p.orders} pedidos</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#06B6D4', whiteSpace: 'nowrap' }}>{formatCurrency(p.revenue)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
