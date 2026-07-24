import React from 'react';
import { Package, Eye, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const ACCENT = '#ec4899';
const ACCENT_LIGHT = 'rgba(236,72,153,0.4)';

function formatCurrency(v) {
  if (v >= 1000000) return `$${(v/1000000).toFixed(1)}M`;
  return `$${v.toLocaleString('es-CO')}`;
}



export default function TopProductsTable({ rawOrders, clients }) {
  const products = rawOrders && rawOrders.length > 0 ? (() => {
    const byProduct = {};
    rawOrders.forEach(o => {
      const items = o.products || o.items || [];
      items.forEach(item => {
        const name = item.name || item.product_name || 'Producto';
        if (!byProduct[name]) byProduct[name] = { name, views: 0, revenue: 0, orders: 0 };
        byProduct[name].revenue += parseFloat(item.price || item.total || 0) * (item.quantity || 1);
        byProduct[name].orders += item.quantity || 1;
        byProduct[name].views = byProduct[name].orders * 25; // estimated views based on orders (assuming 4% conversion rate)
      });
    });
    return Object.values(byProduct)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(p => ({ ...p, convRate: p.orders > 0 ? ((p.orders / (p.views || 1)) * 100).toFixed(1) : '0' }));
  })() : [];

  return (
    <div className="glass-card bento-span-3" style={{ display: 'flex', flexDirection: 'column', minHeight: 280 }}>
      <h3 style={{ fontSize: 13, fontWeight: 500, margin: '0 0 16px', color: 'var(--on-surface-variant)' }}>
        Productos / Páginas top
      </h3>

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 60px 80px 60px',
        gap: 8, padding: '0 0 10px', borderBottom: '1px solid var(--border-subtle)',
      }}>
        {['Producto / Página', 'Visitas', 'Ingresos', 'Tasa conv.'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {products.length === 0 ? (
          <div style={{ padding: '20px 0', fontSize: 13, color: 'var(--on-surface-variant)', textAlign: 'center' }}>
            No hay datos de productos.
          </div>
        ) : products.map((p, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 60px 80px 60px',
            gap: 8, padding: '10px 0',
            borderBottom: i < products.length - 1 ? '1px solid var(--surface-container-low)' : 'none',
            transition: 'background 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{p.emoji || '📦'}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--on-background)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--on-background)', fontWeight: 500 }}>{typeof p.views === 'number' ? p.views.toLocaleString('es-CO') : p.views}</span>
            <span style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>{formatCurrency(p.revenue)}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)',
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              {p.convRate}%
            </span>
          </div>
        ))}
      </div>

      <div 
        style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'inventario' }))}
      >
        <span style={{ fontSize: 12, color: ACCENT, fontWeight: 500 }}>Ver todos los productos →</span>
      </div>
    </div>
  );
}
