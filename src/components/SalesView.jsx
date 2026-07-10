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
          <DollarSign size={22} color="#10b981" /> Panel de Ventas
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--on-surface-variant)' }}>Disponibilidad de productos y clientes</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Productos', value: stats.totalProducts, color: '#3b82f6', icon: Package },
          { label: 'Disponibles', value: stats.totalProducts - stats.outOfStock, color: '#10b981', icon: ShoppingCart },
          { label: 'Sin Stock', value: stats.outOfStock, color: '#ef4444', icon: AlertTriangle },
          { label: 'Stock Bajo', value: stats.lowStock, color: '#f59e0b', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '16px 20px', borderLeft: `3px solid ${s.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <s.icon size={14} color={s.color} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Product Availability */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>Disponibilidad de Productos</span>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{ padding: '7px 12px 7px 32px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 12, width: 180, boxSizing: 'border-box' }}
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
                background: isOut ? 'rgba(239,68,68,0.05)' : isLow ? 'rgba(245,158,11,0.05)' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {p.image?.src ? (
                    <img src={p.image.src} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={14} color="var(--on-surface-variant)" />
                    </div>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--on-surface)' }}>{p.displayName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isOut && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#ef444420', color: '#ef4444' }}>NO VENDER</span>}
                  {isLow && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#f59e0b20', color: '#f59e0b' }}>ÚLTIMAS UNIDADES</span>}
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: isOut ? '#ef4444' : isLow ? '#f59e0b' : p.hasInfinite ? '#06b6d4' : '#10b981',
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
