import React, { useMemo, useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Warehouse, RefreshCw, Search, PackageX, AlertTriangle, CheckCircle,
  Package, Edit3, Save, X, ArrowUpDown, Filter, TrendingUp,
  Clock, Truck, Wrench, Infinity, ChevronDown, ChevronRight, Layers, Ruler
} from 'lucide-react';

const STATUS_OPTIONS = [
  { key: 'unlimited', label: 'Stock ilimitado', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { key: 'in_stock', label: 'En stock', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { key: 'in_production', label: 'En producción', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { key: 'low_stock', label: 'Stock bajo', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { key: 'out_of_stock', label: 'Sin stock', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { key: 'ready_to_ship', label: 'Listo para despachar', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
];

const FILTER_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'unlimited', label: 'Ilimitados' },
  { key: 'out_of_stock', label: 'Sin Stock' },
  { key: 'low_stock', label: 'Stock Bajo' },
  { key: 'in_production', label: 'En Producción' },
  { key: 'ready_to_ship', label: 'Para Despachar' },
];

const COLOR_MAP = {
  'negro': '#1a1a2e', 'black': '#1a1a2e', 'azul': '#3b82f6', 'blue': '#3b82f6',
  'rojo': '#ef4444', 'red': '#ef4444', 'blanco': '#f1f5f9', 'white': '#f1f5f9',
  'verde': '#10b981', 'green': '#10b981', 'amarillo': '#f59e0b', 'yellow': '#f59e0b',
  'rosa': '#ec4899', 'pink': '#ec4899', 'morado': '#8b5cf6', 'purple': '#8b5cf6',
  'gris': '#64748b', 'gray': '#64748b', 'grey': '#64748b', 'naranja': '#f97316', 'orange': '#f97316',
  'beige': '#d4c5a9', 'crema': '#fef3c7', 'turquesa': '#06b6d4', 'cyan': '#06b6d4',
  'marino': '#1e3a5f', 'navy': '#1e3a5f', 'camel': '#c4a35a', 'dorado': '#eab308',
  'plateado': '#94a3b8', 'silver': '#94a3b8', 'burdeos': '#7f1d1d', 'bordeaux': '#7f1d1d',
  'oliva': '#4d7c0f', 'olive': '#4d7c0f', 'arena': '#d2b48c', 'sand': '#d2b48c',
};

function getColorHex(colorName) {
  if (!colorName) return null;
  const lower = colorName.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  if (lower.startsWith('#')) return lower;
  return null;
}

function parseVariantOptions(variant, productAttributes) {
  let color = null;
  let size = null;

  // Method 1: Tiendanube format — variant.values = [{ es: "Azul" }, { es: "M" }]
  //           product.attributes = [{ name: "Color", ... }, { name: "Talla", ... }]
  const values = variant.values || [];
  const attrs = productAttributes || [];

  if (values.length > 0) {
    values.forEach((val, i) => {
      const text = val?.es || val?.pt || val?.en || Object.values(val || {})[0] || '';
      const attrName = (attrs[i]?.name || attrs[i]?.es || '').toLowerCase();
      if (attrName.includes('color') || attrName.includes('colour')) {
        color = text;
      } else if (attrName.includes('talla') || attrName.includes('size') || attrName.includes('tamano')) {
        size = text;
      } else if (!color) {
        color = text;
      } else if (!size) {
        size = text;
      }
    });
  }

  // Method 2: Parse from variant name (e.g., "Azul - M")
  if (!color && !size && variant.name) {
    const sizePattern = /^(xs|s|m|l|xl|xxl|xxxl|xxxxl|\d+xl)$/i;
    const separators = [' - ', ' / ', ' | ', '/', '-', '|'];
    for (const sep of separators) {
      if (variant.name.includes(sep)) {
        const parts = variant.name.split(sep).map(p => p.trim());
        for (const p of parts) {
          if (sizePattern.test(p)) size = p;
          else if (!color) color = p;
        }
        break;
      }
    }
  }

  // Method 3: Fallback — use full variant name as color
  if (!color && !size && variant.name) color = variant.name.trim();

  return { color, size };
}

export default function InventoryPage({ products, onRefresh, isRefreshing, lastSync, isConnected, onUpdateStock }) {
  const { addToast } = useNotifications();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [localStatuses, setLocalStatuses] = useState({});
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [editingVariant, setEditingVariant] = useState(null);
  const [editStock, setEditStock] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('grouped');
  const [colorFilter, setColorFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');

  const productData = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.map(prod => {
      const name = prod.name?.es || prod.name || 'Producto';
      const attributes = prod.attributes || [];
      const allVariants = (prod.variants || []).map(v => {
        const stock = v.stock === null ? null : parseInt(v.stock, 10);
        const { color, size } = parseVariantOptions(v, attributes);
        return { id: v.id, name: v.name, stock, sku: v.sku, color, size, options: v.options || [] };
      });
      const totalStock = allVariants.reduce((s, v) => s + (v.stock === null ? 0 : v.stock), 0);
      const hasInfinite = allVariants.some(v => v.stock === null);
      const isUnlimited = hasInfinite && totalStock === 0;
      const computedStatus = isUnlimited ? 'unlimited' : totalStock === 0 ? 'out_of_stock' : totalStock <= 5 ? 'low_stock' : 'in_stock';
      const status = localStatuses[prod.id] || computedStatus;
      const colors = [...new Set(allVariants.map(v => v.color).filter(Boolean))];
      const sizes = [...new Set(allVariants.map(v => v.size).filter(Boolean))];
      return { id: prod.id, name, totalStock, variants: allVariants, status, computedStatus, hasInfinite, image: prod.images?.[0]?.src || null, colors, sizes };
    });
  }, [products, localStatuses]);

  const allColors = useMemo(() => [...new Set(productData.flatMap(p => p.colors))].sort(), [productData]);
  const allSizes = useMemo(() => {
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
    const found = [...new Set(productData.flatMap(p => p.sizes))];
    return found.sort((a, b) => {
      const ai = sizeOrder.indexOf(a?.toUpperCase());
      const bi = sizeOrder.indexOf(b?.toUpperCase());
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return (a || '').localeCompare(b || '');
    });
  }, [productData]);

  const flatVariants = useMemo(() => {
    let rows = [];
    productData.forEach(p => {
      p.variants.forEach(v => {
        rows.push({ ...v, productName: p.name, productImage: p.image, productId: p.id, productStatus: p.status });
      });
    });
    if (colorFilter !== 'all') rows = rows.filter(r => r.color === colorFilter);
    if (sizeFilter !== 'all') rows = rows.filter(r => r.size === sizeFilter);
    if (search) { const q = search.toLowerCase(); rows = rows.filter(r => r.productName.toLowerCase().includes(q) || r.color?.toLowerCase().includes(q) || r.size?.toLowerCase().includes(q)); }
    if (filter !== 'all') rows = rows.filter(r => r.productStatus === filter);
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.productName.localeCompare(b.productName);
      else if (sortKey === 'stock') cmp = (a.stock || 0) - (b.stock || 0);
      else if (sortKey === 'color') cmp = (a.color || '').localeCompare(b.color || '');
      else if (sortKey === 'size') cmp = (a.size || '').localeCompare(b.size || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [productData, colorFilter, sizeFilter, search, filter, sortKey, sortDir]);

  const groupedData = useMemo(() => {
    let items = productData;
    if (filter !== 'all') items = items.filter(i => i.status === filter);
    if (search) { const q = search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q)); }
    if (colorFilter !== 'all') items = items.filter(i => i.variants.some(v => v.color === colorFilter));
    if (sizeFilter !== 'all') items = items.filter(i => i.variants.some(v => v.size === sizeFilter));
    items.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'stock') cmp = a.totalStock - b.totalStock;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [productData, filter, search, colorFilter, sizeFilter, sortKey, sortDir]);

  const stats = useMemo(() => {
    const totalVariants = productData.reduce((s, p) => s + p.variants.length, 0);
    const outVariants = productData.reduce((s, p) => s + p.variants.filter(v => v.stock === 0).length, 0);
    const lowVariants = productData.reduce((s, p) => s + p.variants.filter(v => v.stock > 0 && v.stock <= 5).length, 0);
    const infVariants = productData.reduce((s, p) => s + p.variants.filter(v => v.stock === null).length, 0);
    return {
      total: productData.length, totalVariants, outVariants, lowVariants, infVariants,
      unlimited: productData.filter(i => i.status === 'unlimited').length,
      inStock: productData.filter(i => i.status === 'in_stock').length,
      lowStock: productData.filter(i => i.status === 'low_stock').length,
      outOfStock: productData.filter(i => i.status === 'out_of_stock').length,
      inProduction: productData.filter(i => i.status === 'in_production').length,
      readyToShip: productData.filter(i => i.status === 'ready_to_ship').length,
    };
  }, [productData]);

  const cycleSort = (key) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); } };
  const getStatusInfo = (status) => STATUS_OPTIONS.find(s => s.key === status) || STATUS_OPTIONS[0];
  const toggleExpand = (id) => setExpandedProducts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const startEditVariant = (v) => { setEditingVariant(v.id); setEditStock(String(v.stock ?? 0)); };
  const saveVariant = async (v) => {
    setSaving(true);
    try {
      if (onUpdateStock) {
        await onUpdateStock(v.productId, v.id, parseInt(editStock, 10) || 0);
        addToast({ type: 'success', title: 'Stock actualizado', message: `${v.productName} — ${v.color || ''} ${v.size || ''}: ${editStock}` });
      }
      setEditingVariant(null);
    } catch (e) {
      console.error('[Inventory] saveVariant error:', e);
      addToast({ type: 'error', title: 'Error al guardar', message: e.message || 'Intenta de nuevo' });
    }
    setSaving(false);
  };

  const quickStockChange = async (productId, variantId, variant, delta) => {
    try {
      const newStock = Math.max(0, (variant.stock || 0) + delta);
      if (onUpdateStock) {
        await onUpdateStock(productId, variantId, newStock);
        addToast({ type: 'success', title: 'Stock actualizado', message: `${variant.productName || ''} → ${newStock}` });
      }
    } catch (e) {
      console.error('[Inventory] quickStockChange error:', e);
      addToast({ type: 'error', title: 'Error', message: 'No se pudo actualizar stock' });
    }
  };

  const formatSyncTime = () => {
    if (!lastSync) return null;
    const diff = Date.now() - new Date(lastSync).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins} min`;
    return `Hace ${Math.floor(mins / 60)}h`;
  };

  return (
    <div style={{ padding: '0 0 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(245,158,11,0.25)' }}>
              <Warehouse size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--on-surface)' }}>Inventario</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                Control por variante · color · talla · TiendaNube
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastSync && <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.5 }}>{formatSyncTime()}</span>}
            {isConnected && onRefresh && (
              <button onClick={onRefresh} disabled={isRefreshing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--on-surface)', fontSize: 12, fontWeight: 600, cursor: isRefreshing ? 'wait' : 'pointer' }}>
                <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                {isRefreshing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { count: stats.total, sub: `${stats.totalVariants} variantes`, label: 'Productos', color: 'var(--on-surface)', bg: 'var(--surface-container)', icon: <Package size={14} /> },
            { count: stats.infVariants, label: 'Ilimitados', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', icon: <Infinity size={14} /> },
            { count: stats.totalVariants - stats.outVariants - stats.lowVariants - stats.infVariants, label: 'En stock', color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: <CheckCircle size={14} /> },
            { count: stats.lowVariants, label: 'Stock bajo', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', icon: <AlertTriangle size={14} /> },
            { count: stats.outVariants, label: 'Sin stock', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: <PackageX size={14} /> },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '10px 8px', borderRadius: 10, background: s.bg, textAlign: 'center', border: `1px solid ${s.color}18` }}>
              <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.count}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px', marginTop: 2 }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: 9, color: 'var(--on-surface-variant)', opacity: 0.5 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* View Mode + Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', borderRadius: 8, padding: 2, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            {[{ key: 'grouped', label: 'Por Producto', icon: Layers }, { key: 'flat', label: 'Por Variante', icon: Ruler }].map(m => (
              <button key={m.key} onClick={() => setViewMode(m.key)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: 'none', background: viewMode === m.key ? 'var(--on-surface)' : 'transparent', color: viewMode === m.key ? 'var(--surface)' : 'var(--on-surface-variant)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                <m.icon size={12} /> {m.label}
              </button>
            ))}
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', borderRadius: 10, padding: 3, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            {FILTER_TABS.map(f => {
              const isActive = filter === f.key;
              const count = f.key === 'all' ? stats.total : f.key === 'unlimited' ? stats.unlimited : f.key === 'out_of_stock' ? stats.outOfStock : f.key === 'low_stock' ? stats.lowStock : f.key === 'in_production' ? stats.inProduction : stats.readyToShip;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, background: isActive ? 'var(--on-surface)' : 'transparent', color: isActive ? 'var(--surface)' : 'var(--on-surface-variant)', fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {f.label} <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", padding: '1px 5px', borderRadius: 4, background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--surface)' }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Color Filter */}
          {allColors.length > 0 && (
            <select value={colorFilter} onChange={e => setColorFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--on-surface)', fontSize: 11, cursor: 'pointer' }}>
              <option value="all">Todos los colores</option>
              {allColors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* Size Filter */}
          {allSizes.length > 0 && (
            <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--on-surface)', fontSize: 11, cursor: 'pointer' }}>
              <option value="all">Todas las tallas</option>
              {allSizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {/* Search */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <Search size={14} color="var(--on-surface-variant)" style={{ opacity: 0.5 }} />
            <input type="text" placeholder="Buscar producto, color, talla..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--on-surface)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>
      </div>

      {/* ═══════ GROUPED VIEW ═══════ */}
      {viewMode === 'grouped' && (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: 16, overflow: 'hidden' }}>
          {groupedData.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}><Package size={28} color="var(--on-surface-variant)" style={{ opacity: 0.2, marginBottom: 8 }} /><p style={{ fontSize: 13, color: 'var(--on-surface-variant)', opacity: 0.5, margin: 0 }}>No se encontraron productos</p></div>
          ) : groupedData.map((item, idx) => {
            const isExpanded = expandedProducts.has(item.id);
            const statusInfo = getStatusInfo(item.status);
            return (
              <div key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', animation: `fadeIn 0.2s ease ${idx * 0.02}s both` }}>
                {/* Product Row */}
                <div onClick={() => toggleExpand(item.id)} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 100px 60px 30px', padding: '12px 20px', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    {item.image ? <img src={item.image} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                      : <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={12} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} /></div>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', opacity: 0.6, marginTop: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
                      {item.colors.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Layers size={9} /> {item.colors.join(', ')}</span>}
                      {item.sizes.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Ruler size={9} /> {item.sizes.join(', ')}</span>}
                      <span>· {item.variants.length} variantes</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: item.status === 'unlimited' ? '#06b6d4' : item.status === 'out_of_stock' ? '#ef4444' : item.status === 'low_stock' ? '#f59e0b' : 'var(--on-surface)', textAlign: 'center' }}>
                    {item.status === 'unlimited' ? '∞' : item.totalStock}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: statusInfo.bg, color: statusInfo.color, border: `1px solid ${statusInfo.color}20` }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusInfo.color, display: 'inline-block', marginRight: 4 }} />
                      {statusInfo.label}
                    </span>
                  </div>
                  <div>
                    {item.status === 'in_production' && <Wrench size={12} color="#3b82f6" />}
                    {item.status === 'ready_to_ship' && <Truck size={12} color="#8b5cf6" />}
                    {item.status === 'out_of_stock' && <Clock size={12} color="#ef4444" />}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {isExpanded ? <ChevronDown size={14} color="var(--on-surface-variant)" /> : <ChevronRight size={14} color="var(--on-surface-variant)" />}
                  </div>
                </div>

                {/* Expanded Variants */}
                {isExpanded && (
                  <div style={{ background: 'rgba(255,255,255,0.01)', borderTop: '1px solid var(--border-subtle)', animation: 'slideDown 0.2s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '32px 100px 70px 100px 90px 100px 70px', padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <span></span><span>Color</span><span>Talla</span><span>SKU</span><span>Stock</span><span>Estado</span><span></span>
                    </div>
                    {item.variants.map((v, vi) => {
                      const vStatus = v.stock === null ? 'unlimited' : v.stock === 0 ? 'out_of_stock' : v.stock <= 5 ? 'low_stock' : 'in_stock';
                      const vInfo = getStatusInfo(vStatus);
                      const isEditing = editingVariant === v.id;
                      const colorHex = getColorHex(v.color);
                      return (
                        <div key={v.id || vi} style={{ display: 'grid', gridTemplateColumns: '32px 100px 70px 100px 90px 100px 70px', padding: '8px 20px', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div>{colorHex && <div style={{ width: 18, height: 18, borderRadius: 4, background: colorHex, border: '1px solid rgba(255,255,255,0.15)' }} />}</div>
                          <div style={{ fontWeight: 600, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {v.color || (v.name ? <span style={{ fontSize: 10, opacity: 0.6 }}>{v.name}</span> : <span style={{ opacity: 0.3 }}>—</span>)}
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--on-surface)', fontFamily: "'JetBrains Mono', monospace" }}>{v.size || '—'}</div>
                          <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', opacity: 0.5, fontFamily: "'JetBrains Mono', monospace" }}>{v.sku || '—'}</div>
                          <div>
                            {isEditing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && saveVariant(v)} style={{ width: 55, padding: '3px 6px', borderRadius: 5, background: 'var(--surface-container)', border: '1px solid var(--border-subtle)', color: 'var(--on-surface)', fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', outline: 'none' }} />
                                <button onClick={() => saveVariant(v)} disabled={saving} style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(16,185,129,0.1)', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Save size={10} /></button>
                                <button onClick={() => setEditingVariant(null)} style={{ width: 22, height: 22, borderRadius: 4, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={10} /></button>
                              </div>
                            ) : (
                              <span onClick={() => startEditVariant(v)} style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: v.stock === null ? '#06b6d4' : v.stock === 0 ? '#ef4444' : v.stock <= 5 ? '#f59e0b' : 'var(--on-surface)', cursor: 'pointer' }}>
                                {v.stock === null ? '∞' : v.stock}
                              </span>
                            )}
                          </div>
                          <div><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 600, background: vInfo.bg, color: vInfo.color }}>{vInfo.label}</span></div>
                          <div>
                            {!isEditing && v.stock !== null && (
                              <div style={{ display: 'flex', gap: 3 }}>
                                <button onClick={() => quickStockChange(item.id, v.id, v, -1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                <button onClick={() => quickStockChange(item.id, v.id, v, 1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ FLAT VIEW (all variants) ═══════ */}
      {viewMode === 'flat' && (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1.5fr 80px 60px 1fr 90px 100px 70px', padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
            {[{ key: null, label: '' }, { key: 'name', label: 'Producto' }, { key: 'color', label: 'Color' }, { key: 'size', label: 'Talla' }, { key: null, label: 'SKU' }, { key: 'stock', label: 'Stock' }, { key: null, label: 'Estado' }, { key: null, label: '' }].map((col, i) => (
              <div key={i} onClick={() => col.key && cycleSort(col.key)} style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 3, cursor: col.key ? 'pointer' : 'default' }}>
                {col.label}
                {col.key && sortKey === col.key && <ArrowUpDown size={9} style={{ opacity: 0.5, transform: sortDir === 'desc' ? 'rotate(180deg)' : 'none' }} />}
              </div>
            ))}
          </div>
          {flatVariants.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}><Package size={28} color="var(--on-surface-variant)" style={{ opacity: 0.2, marginBottom: 8 }} /><p style={{ fontSize: 13, color: 'var(--on-surface-variant)', opacity: 0.5, margin: 0 }}>No hay variantes</p></div>
          ) : flatVariants.map((v, idx) => {
            const vStatus = v.stock === null ? 'unlimited' : v.stock === 0 ? 'out_of_stock' : v.stock <= 5 ? 'low_stock' : 'in_stock';
            const vInfo = getStatusInfo(vStatus);
            const colorHex = getColorHex(v.color);
            const isEditing = editingVariant === v.id;
            return (
              <div key={v.id || idx} style={{ display: 'grid', gridTemplateColumns: '28px 1.5fr 80px 60px 1fr 90px 100px 70px', padding: '8px 20px', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, animation: `fadeIn 0.15s ease ${idx * 0.01}s both`, transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div>{colorHex && <div style={{ width: 16, height: 16, borderRadius: 3, background: colorHex, border: '1px solid rgba(255,255,255,0.15)' }} />}</div>
                <div style={{ fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 }}>{v.productName}</div>
                <div style={{ fontWeight: 600, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {colorHex && <div style={{ width: 10, height: 10, borderRadius: 2, background: colorHex, border: '1px solid rgba(255,255,255,0.1)' }} />}
                  {v.color || (v.name ? <span style={{ fontSize: 10, opacity: 0.6 }}>{v.name}</span> : <span style={{ opacity: 0.3 }}>—</span>)}
                </div>
                <div style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: 'var(--on-surface)' }}>{v.size || '—'}</div>
                <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', opacity: 0.5, fontFamily: "'JetBrains Mono', monospace" }}>{v.sku || '—'}</div>
                <div>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && saveVariant(v)} style={{ width: 50, padding: '3px 5px', borderRadius: 5, background: 'var(--surface-container)', border: '1px solid var(--border-subtle)', color: 'var(--on-surface)', fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', outline: 'none' }} />
                      <button onClick={() => saveVariant(v)} style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(16,185,129,0.1)', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Save size={9} /></button>
                      <button onClick={() => setEditingVariant(null)} style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={9} /></button>
                    </div>
                  ) : (
                    <span onClick={() => startEditVariant(v)} style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: v.stock === null ? '#06b6d4' : v.stock === 0 ? '#ef4444' : v.stock <= 5 ? '#f59e0b' : 'var(--on-surface)', cursor: 'pointer' }}>
                      {v.stock === null ? '∞' : v.stock}
                    </span>
                  )}
                </div>
                <div><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 9, fontWeight: 600, background: vInfo.bg, color: vInfo.color }}>{vInfo.label}</span></div>
                <div>
                  {!isEditing && v.stock !== null && (
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button onClick={() => quickStockChange(v.productId, v.id, v, -1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <button onClick={() => quickStockChange(v.productId, v.id, v, 1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 2000px; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
