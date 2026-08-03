import React, { useState, useMemo } from 'react';
import { DollarSign, ShoppingCart, Users, Search, TrendingUp, Package, AlertTriangle } from 'lucide-react';

export default function SalesView({ products, clients }) {
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const totalProducts = products?.length || 0;
    const outOfStock = (products || []).filter(p => {
      const total = (p.variants || []).reduce((s, v) => s + (v.stock === null ? 0 : (parseInt(v.stock, 10) || 0)), 0);
      return total === 0 && !(p.variants || []).some(v => v.stock === null);
    }).length;
    const lowStock = (products || []).filter(p => {
      const total = (p.variants || []).reduce((s, v) => s + (v.stock === null ? 0 : (parseInt(v.stock, 10) || 0)), 0);
      return total > 0 && total <= 5 && !(p.variants || []).some(v => v.stock === null);
    }).length;
    const totalClients = clients?.length || 0;
    return { totalProducts, outOfStock, lowStock, totalClients };
  }, [products, clients]);

  const availableProducts = useMemo(() => {
    let list = (products || []).map(p => {
      const total = (p.variants || []).reduce((s, v) => s + (v.stock === null ? 0 : (parseInt(v.stock, 10) || 0)), 0);
      const hasInfinite = (p.variants || []).some(v => v.stock === null);
      return { ...p, displayName: p.name?.es || p.name || 'Sin nombre', totalStock: total, hasInfinite };
    });
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.displayName.toLowerCase().includes(q));
    }
    return list;
  }, [products, search]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <DollarSign size={22} color="#06B6D4" /> Panel de Ventas
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--on-surface-variant)' }}>Disponibilidad de productos y clientes</p>
      </div>

      {/* ── KPIs Row ── */}
      <div className="responsive-grid-sm" style={{ marginBottom: 20 }}>
        {[
          { label: 'Productos', value: stats.totalProducts, color: '#6366f1', icon: Package },
          { label: 'Disponibles', value: stats.totalProducts - stats.outOfStock, color: '#06B6D4', icon: ShoppingCart },
          { label: 'Sin Stock', value: stats.outOfStock, color: '#E11D48', icon: AlertTriangle },
          { label: 'Stock Bajo', value: stats.lowStock, color: 'var(--primary-container)', icon: TrendingUp },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{
            padding: '14px 16px', borderLeft: `3px solid ${s.color}`,
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
          </div>
        ))}
      </div>

      {/* Product Availability */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>Disponibilidad de Productos</span>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{ padding: '7px 12px 7px 32px', borderRadius: 8, border: '1px solid var(--border-medium)', background: 'var(--border-subtle)', color: 'var(--on-surface)', fontSize: 12, width: 180, boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {availableProducts.map(p => {
            const isOut = p.totalStock === 0 && !p.hasInfinite;
            const isLow = p.totalStock > 0 && p.totalStock <= 5 && !p.hasInfinite;
            return (
              <div key={p.id} style={{
                padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: isOut ? 'rgba(239,68,68,0.05)' : isLow ? 'rgba(6, 182, 212,0.05)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {p.image?.src ? (
                    <img src={p.image.src} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={14} color="var(--on-surface-variant)" />
                    </div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--on-surface)' }}>{p.displayName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isOut && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#E11D4820', color: '#E11D48' }}>NO VENDER</span>}
                  {isLow && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--primary-container)20', color: 'var(--primary-container)' }}>ÚLTIMAS UNIDADES</span>}
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: isOut ? '#E11D48' : isLow ? 'var(--primary-container)' : p.hasInfinite ? '#06b6d4' : '#06B6D4',
                  }}>
                    {p.hasInfinite ? '∞' : p.totalStock}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
