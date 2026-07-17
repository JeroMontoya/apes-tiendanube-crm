import React, { useMemo, useState } from 'react';
import { PackageX, AlertTriangle, CheckCircle, Package, ChevronDown, RefreshCw, DollarSign, Filter, Search, Info } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'out', label: 'Sin Stock' },
  { key: 'low', label: 'Stock Bajo' },
  { key: 'reorder', label: 'Reponer' },
];

export default function StockAlertWidget({ clients, products, onRefresh, isRefreshing, lastSync, isConnected }) {
  const { outOfStock, lowStock, totalProducts, inStockCount } = useMemo(() => {
    if (!products || products.length === 0) return { outOfStock: [], lowStock: [], totalProducts: 0, inStockCount: 0 };

    const productStats = {};
    clients?.forEach(c => {
      c.purchases?.forEach(p => {
        p.products?.forEach(prod => {
          const name = prod.name.trim().toLowerCase();
          if (!productStats[name]) productStats[name] = { demand: 0, totalRevenue: 0, transactions: 0 };
          productStats[name].demand += (prod.quantity || 1);
          productStats[name].totalRevenue += parseFloat(prod.price || 0) * (prod.quantity || 1);
          productStats[name].transactions += 1;
        });
      });
    });

    const out = [];
    const low = [];
    let count = 0;
    let inStock = 0;

    products.forEach(prod => {
      const nameMatch = prod.name?.es?.trim().toLowerCase() || prod.name?.trim().toLowerCase() || '';
      let totalStock = 0;
      let hasInfiniteStock = false;

      (prod.variants || []).forEach(v => {
        if (v.stock === null || v.stock === undefined) {
          hasInfiniteStock = true;
        } else {
          totalStock += parseInt(v.stock, 10);
        }
      });

      if (hasInfiniteStock && totalStock === 0) {
        const allNull = (prod.variants || []).every(v => v.stock === null || v.stock === undefined);
        if (allNull) return;
      }

      count++;
      const stats = productStats[nameMatch] || { demand: 0, totalRevenue: 0, transactions: 0 };
      const avgTicket = stats.demand > 0 ? stats.totalRevenue / stats.demand : 0;

      const item = {
        id: prod.id,
        name: prod.name?.es || prod.name || 'Producto',
        stock: totalStock,
        demand: stats.demand,
        avgTicket,
        totalRevenue: stats.totalRevenue,
        transactions: stats.transactions,
      };

      if (totalStock === 0) {
        out.push({ ...item, status: 'out_of_stock' });
      } else if (totalStock <= 5) {
        low.push({
          ...item,
          status: avgTicket > 5000 ? 'high_value' : (totalStock <= 2 ? 'critical' : 'warning')
        });
      } else {
        inStock++;
      }
    });

    out.sort((a, b) => b.demand - a.demand);
    low.sort((a, b) => {
      if (a.status === 'high_value' && b.status !== 'high_value') return -1;
      if (a.status !== 'high_value' && b.status === 'high_value') return 1;
      if (a.status === 'critical' && b.status !== 'critical') return -1;
      if (a.status !== 'critical' && b.status === 'critical') return 1;
      return b.avgTicket - a.avgTicket;
    });

    return { outOfStock: out, lowStock: low, totalProducts: count, inStockCount: inStock };
  }, [clients, products]);

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const totalAlerts = outOfStock.length + lowStock.length;
  const hasAlerts = totalAlerts > 0;
  const isEmpty = products && products.length > 0 && totalAlerts === 0;
  const hasProducts = products && products.length > 0;

  const allItems = useMemo(() => {
    const items = [
      ...outOfStock.map(i => ({ ...i, _type: 'out' })),
      ...lowStock.map(i => ({ ...i, _type: 'low' })),
    ];
    let filtered = items;
    if (filter === 'reorder') filtered = items.filter(i => i._type === 'low' || i._type === 'out');
    else if (filter !== 'all') filtered = items.filter(i => i._type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(i => i.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [outOfStock, lowStock, filter, search]);

  const formatSyncTime = () => {
    if (!lastSync) return null;
    const diff = Date.now() - new Date(lastSync).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  };

  const formatCurrency = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val.toFixed(0)}`;
  };

  return (
    <div style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-blur)',
      border: '1px solid var(--glass-border)',
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
      borderColor: open ? (outOfStock.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)') : 'var(--glass-border)'
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 22px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-container)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #f59e0b, #f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? '0 2px 12px rgba(245,158,11,0.3)' : '0 2px 8px rgba(245,158,11,0.15)',
          transition: 'box-shadow 0.2s', flexShrink: 0
        }}>
          <Package size={17} color="#fff" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 6 }}>
            Estado del Inventario
            <MetricTooltip text="Muestra productos sin stock y con stock bajo. Los productos 'Sin Stock' ya no están disponibles en tu tienda. 'Stock Bajo' significa que quedan pocos y podrían agotarse pronto.">
              <Info size={12} color="var(--on-surface-variant)" style={{ opacity: 0.6 }} />
            </MetricTooltip>
          </div>
          <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2, opacity: 0.7 }}>
            {!isConnected ? 'Conectá TiendaNube para ver el stock'
              : isEmpty ? 'Todos los productos tienen stock'
              : !hasProducts ? 'Cargando stock...'
              : `${outOfStock.length} sin stock · ${lowStock.length} con stock bajo`}
          </div>
        </div>

        {!open && hasAlerts && (
          <div style={{ display: 'flex', gap: 6 }}>
            {outOfStock.length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.15)'
              }}>
                <PackageX size={9} /> {outOfStock.length}
              </span>
            )}
            {lowStock.length > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.15)'
              }}>
                <AlertTriangle size={9} /> {lowStock.length}
              </span>
            )}
          </div>
        )}

        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--surface-container)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          flexShrink: 0
        }}>
          <ChevronDown size={14} color="var(--on-surface-variant)" />
        </div>
      </button>

      {/* Content */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', animation: 'slideDown 0.25s ease' }}>
          {/* Toolbar */}
          <div style={{
            padding: '10px 22px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(255,255,255,0.01)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {lastSync && (
                <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                  {formatSyncTime()}
                </span>
              )}
            </div>
            {isConnected && onRefresh && (
              <button
                onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                disabled={isRefreshing}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 8,
                  background: 'var(--surface-container)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--on-surface-variant)',
                  fontSize: 10, fontWeight: 600,
                  cursor: isRefreshing ? 'wait' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (!isRefreshing) { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.color = '#60a5fa'; }}}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-container)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--on-surface-variant)'; }}
              >
                <RefreshCw size={11} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                {isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </button>
            )}
          </div>

          <div style={{ padding: '14px 22px 18px', maxHeight: 460, overflowY: 'auto' }}>
            {!isConnected ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', color: 'var(--on-surface-variant)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, opacity: 0.4 }}>
                  <Package size={18} />
                </div>
                <p style={{ fontSize: 12, opacity: 0.5, margin: 0, textAlign: 'center' }}>Conectá tu tienda TiendaNube para ver el stock real</p>
              </div>
            ) : !hasProducts ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', color: 'var(--on-surface-variant)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, opacity: 0.4, animation: 'pulse 1.5s ease infinite' }}>
                  <Package size={18} />
                </div>
                <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>Cargando productos de TiendaNube...</p>
              </div>
            ) : totalAlerts === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <CheckCircle size={18} color="#10b981" />
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981', margin: 0 }}>Todo bien</p>
                <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', margin: '4px 0 0', opacity: 0.6 }}>{totalProducts} productos con stock suficiente</p>
              </div>
            ) : (
              <>
                {/* ── Summary Stats ── */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[
                    { count: outOfStock.length, label: 'Sin stock', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: <PackageX size={13} /> },
                    { count: lowStock.filter(i => i.status === 'high_value').length, label: 'Alto valor', color: '#a78bfa', bg: 'rgba(139,92,246,0.08)', icon: <DollarSign size={13} /> },
                    { count: lowStock.filter(i => i.status !== 'high_value').length, label: 'Stock bajo', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: <AlertTriangle size={13} /> },
                    { count: inStockCount, label: 'Con stock', color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: <CheckCircle size={13} /> },
                  ].map((s, i) => (
                    <div key={i} style={{
                      flex: 1, padding: '8px 6px', borderRadius: 8,
                      background: s.bg, textAlign: 'center',
                      border: `1px solid ${s.color}15`
                    }}>
                      <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: 3 }}>{s.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.count}</div>
                      <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Filter Tabs ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <div style={{
                    display: 'flex', borderRadius: 8, padding: 2,
                    background: 'var(--surface-container)', border: '1px solid var(--border-subtle)'
                  }}>
                    {FILTERS.map(f => {
                      const isActive = filter === f.key;
                      const count = f.key === 'all' ? totalAlerts : f.key === 'out' ? outOfStock.length : f.key === 'low' ? lowStock.length : outOfStock.length + lowStock.length;
                      return (
                        <button key={f.key}
                          onClick={(e) => { e.stopPropagation(); setFilter(f.key); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '5px 10px', borderRadius: 6,
                            background: isActive ? 'var(--on-surface)' : 'transparent',
                            color: isActive ? 'var(--surface)' : 'var(--on-surface-variant)',
                            fontSize: 10, fontWeight: 600,
                            border: 'none', cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {f.label}
                          <span style={{
                            fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                            padding: '1px 5px', borderRadius: 4,
                            background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--surface)',
                            minWidth: 16, textAlign: 'center'
                          }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search */}
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 8,
                    background: 'var(--surface-container)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'border-color 0.2s'
                  }}>
                    <Search size={12} color="var(--on-surface-variant)" style={{ opacity: 0.5, flexShrink: 0 }} />
                    <input
                      type="text"
                      placeholder="Buscar producto..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{
                        flex: 1, border: 'none', background: 'transparent',
                        color: 'var(--on-surface)', fontSize: 11,
                        outline: 'none', fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>

                {/* ── Product List ── */}
                {allItems.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <Filter size={18} color="var(--on-surface-variant)" style={{ opacity: 0.3, marginBottom: 6 }} />
                    <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.5, margin: 0 }}>
                      {search ? 'No se encontraron productos' : 'Sin productos en esta categoría'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {allItems.map((item, idx) => {
                      const isOut = item._type === 'out';
                      const isHighValue = item.status === 'high_value';
                      const isCritical = item.status === 'critical';
                      const stockPct = isOut ? 0 : Math.min((item.stock / 5) * 100, 100);

                      const borderColor = isOut ? 'rgba(239,68,68,0.12)' : (isHighValue ? 'rgba(139,92,246,0.12)' : (isCritical ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)'));
                      const iconBg = isOut ? 'rgba(239,68,68,0.1)' : (isHighValue ? 'rgba(139,92,246,0.1)' : (isCritical ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)'));
                      const iconColor = isOut ? '#ef4444' : (isHighValue ? '#a78bfa' : (isCritical ? '#ef4444' : '#f59e0b'));
                      const barBg = isOut ? '#ef4444' : (isHighValue ? 'linear-gradient(90deg, #8b5cf6, #a78bfa)' : (isCritical ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)'));

                      return (
                        <div key={item.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 10,
                            border: `1px solid ${borderColor}`,
                            background: `${iconBg}33`,
                            transition: 'all 0.15s',
                            animation: `slideUp 0.25s ease ${idx * 0.03}s both`
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(3px)'; e.currentTarget.style.background = `${iconBg}66`; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = `${iconBg}33`; }}
                        >
                          {/* Icon */}
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, background: iconBg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isOut ? <PackageX size={14} color={iconColor} /> : (isHighValue ? <DollarSign size={14} color={iconColor} /> : <AlertTriangle size={14} color={iconColor} />)}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {item.demand > 0 && <span>{item.demand} vendidos</span>}
                              {item.avgTicket > 0 && <span style={{ color: '#a78bfa' }}>{formatCurrency(item.avgTicket)}</span>}
                              {item.demand === 0 && <span style={{ opacity: 0.5 }}>Sin ventas</span>}
                            </div>
                          </div>

                          {/* Reorder Badge + Stock Badge + Bar */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                            {!isOut && item.stock <= 5 && (
                              <span style={{
                                fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
                                padding: '2px 6px', borderRadius: 4,
                                background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                                letterSpacing: '0.5px',
                              }}>
                                Reponer
                              </span>
                            )}
                            <span style={{
                              fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                              padding: '3px 8px', borderRadius: 6,
                              background: isOut ? 'rgba(239,68,68,0.1)' : (isHighValue ? 'rgba(139,92,246,0.1)' : (isCritical ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)')),
                              color: iconColor
                            }}>
                              {isOut ? '0' : item.stock} uds
                            </span>
                            {!isOut && (
                              <div style={{ width: 48, height: 3, borderRadius: 2, background: 'var(--surface-container)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 2, width: `${stockPct}%`, background: barBg }} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 600px; } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
