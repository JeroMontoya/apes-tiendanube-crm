import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Search, Filter, Grid, List, Plus, Edit3, Eye, Trash2,
  ChevronLeft, ChevronRight, X, Save, ArrowUpDown, Download,
  ArrowLeftRight, CheckCircle, AlertTriangle, XCircle, Image,
  RefreshCw, MoreHorizontal, BarChart3,
} from 'lucide-react';

function formatCurrency(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
}

function formatNumber(v) {
  return new Intl.NumberFormat('es-CO').format(v || 0);
}

const STATUS_CONFIG = {
  in_stock: { label: 'En Stock', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  low_stock: { label: 'Stock Bajo', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  out_of_stock: { label: 'Sin Stock', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  unlimited: { label: 'Ilimitado', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
};

function StockMiniBar({ stock, max, color }) {
  const pct = max > 0 ? Math.min(100, (stock / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '80px' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '3px', width: `${pct}%`, background: color, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: '700', color, fontFamily: "'JetBrains Mono', monospace", minWidth: '24px', textAlign: 'right' }}>
        {stock}
      </span>
    </div>
  );
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ProductModal({ product, locations, onSave, onClose, isNew }) {
  const [form, setForm] = useState(() => ({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    category: product?.category || '',
    color: product?.color || '',
    size: product?.size || '',
    image_url: product?.image_url || product?.image || '',
    supplier: product?.supplier || '',
    unit_cost: product?.unit_cost || 0,
    sell_price: product?.sell_price || 0,
    min_stock_r5: product?.min_stock_r5 || 5,
    min_stock_apes: product?.min_stock_apes || 5,
    min_stock_web: product?.min_stock_web || 0,
  }));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const fieldStyle = {
    width: '100%', height: '38px', borderRadius: '8px',
    border: '1px solid var(--border-subtle)', background: 'var(--surface)',
    color: 'var(--on-surface)', padding: '0 12px', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  };
  const labelStyle = {
    fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)',
    marginBottom: '6px', display: 'block',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div
        style={{ width: '640px', maxHeight: '85vh', overflow: 'auto', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--on-surface)' }}>
            {isNew ? 'Nuevo Producto' : 'Editar Producto'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input style={fieldStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del producto" />
            </div>
            <div>
              <label style={labelStyle}>SKU *</label>
              <input style={fieldStyle} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-00001" />
            </div>
            <div>
              <label style={labelStyle}>Código de Barras</label>
              <input style={fieldStyle} value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="7790000000000" />
            </div>
            <div>
              <label style={labelStyle}>Categoría</label>
              <input style={fieldStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Camisetas" />
            </div>
            <div>
              <label style={labelStyle}>Color</label>
              <input style={fieldStyle} value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Negro" />
            </div>
            <div>
              <label style={labelStyle}>Talla</label>
              <input style={fieldStyle} value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="M" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>URL de Imagen</label>
              <input style={fieldStyle} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label style={labelStyle}>Proveedor</label>
              <input style={fieldStyle} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Proveedor XYZ" />
            </div>
            <div>
              <label style={labelStyle}>Costo Unitario</label>
              <input style={fieldStyle} type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label style={labelStyle}>Precio de Venta</label>
              <input style={fieldStyle} type="number" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--surface-container-low, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '10px' }}>Umbrales de Stock Mínimo</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {locations.map((loc) => (
                <div key={loc.id}>
                  <label style={{ ...labelStyle, fontSize: '11px' }}>Mín. {loc.name}</label>
                  <input style={{ ...fieldStyle, height: '34px' }} type="number" value={form[`min_stock_${loc.id}`] || 0} onChange={(e) => setForm({ ...form, [`min_stock_${loc.id}`]: parseInt(e.target.value) || 0 })} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !form.name || !form.sku} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: !form.name || !form.sku ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {isNew ? 'Crear' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductDetailModal({ product, locations, stock, movements, onClose, onEdit, onAdjust }) {
  const [activeTab, setActiveTab] = useState('info');
  const tabs = [
    { key: 'info', label: 'Información' },
    { key: 'stock', label: 'Stock' },
    { key: 'history', label: 'Historial' },
  ];

  const productStock = useMemo(() => {
    if (!stock || !product) return [];
    return stock.filter((s) => s.product_id === product.id);
  }, [stock, product]);

  const productMovements = useMemo(() => {
    if (!movements || !product) return [];
    return movements.filter((m) => m.product_id === product?.id).slice(0, 20);
  }, [movements, product]);

  if (!product) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div
        style={{ width: '700px', maxHeight: '85vh', overflow: 'auto', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {product.image_url ? (
              <img src={product.image_url} alt="" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'var(--surface-container, rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={22} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} />
              </div>
            )}
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--on-surface)' }}>{product.name}</h3>
              <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontFamily: "'JetBrains Mono', monospace" }}>{product.sku}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', padding: '8px 24px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 16px', borderRadius: '8px 8px 0 0', border: 'none',
                background: activeTab === t.key ? 'var(--surface)' : 'transparent',
                color: activeTab === t.key ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                fontSize: '13px', fontWeight: activeTab === t.key ? '700' : '500',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 24px' }}>
          {activeTab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[
                ['Nombre', product.name],
                ['SKU', product.sku],
                ['Código de Barras', product.barcode || '—'],
                ['Categoría', product.category || '—'],
                ['Color', product.color || '—'],
                ['Talla', product.size || '—'],
                ['Proveedor', product.supplier || '—'],
                ['Costo Unitario', formatCurrency(product.unit_cost)],
                ['Precio de Venta', formatCurrency(product.sell_price)],
                ['Valor Total', formatCurrency((product.total_stock || 0) * (product.unit_cost || 0))],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)' }}>{value}</div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'stock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {locations.map((loc) => {
                const s = productStock.find((ps) => ps.location_id === loc.id);
                const qty = s?.quantity || 0;
                const minQty = s?.min_stock || 0;
                let status = 'in_stock';
                if (qty === 0) status = 'out_of_stock';
                else if (qty <= minQty) status = 'low_stock';
                const sc = STATUS_CONFIG[status];
                return (
                  <div key={loc.id} style={{
                    padding: '14px', borderRadius: '10px',
                    border: `1px solid ${loc.color}30`,
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <div style={{ width: '8px', height: '32px', borderRadius: '4px', background: loc.color }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)' }}>{loc.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>Mín: {minQty}</div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--on-surface)', fontFamily: "'JetBrains Mono', monospace" }}>{qty}</div>
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    <button onClick={() => onAdjust?.(product, loc.id)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', cursor: 'pointer' }}>
                      <ArrowUpDown size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {activeTab === 'history' && (
            <div>
              {productMovements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--on-surface-variant)' }}>
                  <BarChart3 size={28} style={{ opacity: 0.2, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Sin movimientos registrados</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {productMovements.map((m, i) => (
                    <div key={m.id || i} style={{ padding: '10px', borderRadius: '8px', background: 'var(--surface-container-low, rgba(255,255,255,0.03))', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                      <span style={{ fontWeight: '600', color: m.quantity > 0 ? '#10b981' : '#ef4444' }}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </span>
                      <span style={{ color: 'var(--on-surface-variant)' }}>{m.type}</span>
                      <span style={{ flex: 1, color: 'var(--on-surface-variant)' }}>{m.notes || ''}</span>
                      <span style={{ color: 'var(--on-surface-variant)', fontSize: '11px' }}>
                        {new Date(m.created_at || m.createdAt).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={() => onEdit?.(product)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Edit3 size={13} /> Editar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductList({ products, locations, stock, onAdjust, onTransfer, onCreate, onUpdate, onDelete, onRefresh, loading }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [locationFilter, setLocationFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('table');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 768) setViewMode('grid');
    };
    window.addEventListener('resize', handleResize);
    if (window.innerWidth < 768) setViewMode('grid');
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const categories = useMemo(() => {
    const cats = new Set();
    (products || []).forEach((p) => { if (p.category) cats.add(p.category); });
    return [...cats].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...(products || [])];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }
    if (locationFilter !== 'all') {
      const locStock = (stock || []).filter((s) => s.location_id === locationFilter);
      const productIds = new Set(locStock.map((s) => s.product_id));
      result = result.filter((p) => productIds.has(p.id));
    }
    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (statusFilter !== 'all') {
      result = result.filter((p) => {
        const totalStock = p.total_stock ?? 0;
        if (statusFilter === 'out_of_stock') return totalStock === 0;
        if (statusFilter === 'low_stock') return totalStock > 0 && totalStock <= 5;
        if (statusFilter === 'in_stock') return totalStock > 5;
        return true;
      });
    }
    result.sort((a, b) => {
      let va, vb;
      if (sortBy === 'name') { va = a.name || ''; vb = b.name || ''; }
      else if (sortBy === 'sku') { va = a.sku || ''; vb = b.sku || ''; }
      else if (sortBy === 'stock') { va = a.total_stock || 0; vb = b.total_stock || 0; }
      else if (sortBy === 'value') { va = (a.total_stock || 0) * (a.unit_cost || 0); vb = (b.total_stock || 0) * (b.unit_cost || 0); }
      else { va = a[sortBy] || ''; vb = b[sortBy] || ''; }
      if (typeof va === 'string') return va.localeCompare(vb);
      return va - vb;
    });
    return result;
  }, [products, stock, debouncedSearch, locationFilter, categoryFilter, statusFilter, sortBy]);

  const pageSize = 50;
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [debouncedSearch, locationFilter, categoryFilter, statusFilter, sortBy]);

  const toggleSelect = (id) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === paginatedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(paginatedProducts.map((p) => p.id)));
    }
  };

  const getStockForProduct = useCallback((productId) => {
    const locStock = {};
    (locations || []).forEach((l) => { locStock[l.id] = 0; });
    (stock || []).filter((s) => s.product_id === productId).forEach((s) => {
      locStock[s.location_id] = s.quantity || 0;
    });
    return locStock;
  }, [stock, locations]);

  const maxLocationStock = useMemo(() => {
    let max = 1;
    (stock || []).forEach((s) => { if ((s.quantity || 0) > max) max = s.quantity; });
    return max;
  }, [stock]);

  const handleSaveProduct = async (data) => {
    if (editingProduct) {
      await onUpdate?.(editingProduct.id, data);
      setEditingProduct(null);
    } else {
      await onCreate?.(data);
      setShowCreateModal(false);
    }
  };

  const inputStyle = {
    width: '100%', height: '36px', borderRadius: '8px',
    border: '1px solid var(--border-subtle)', background: 'var(--surface)',
    color: 'var(--on-surface)', fontSize: '13px', fontFamily: 'inherit', outline: 'none',
  };
  const selectStyle = {
    height: '36px', borderRadius: '8px',
    border: '1px solid var(--border-subtle)', background: 'var(--surface)',
    color: 'var(--on-surface)', fontSize: '12px', fontFamily: 'inherit', padding: '0 8px',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={16} color="var(--on-surface-variant)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            style={{ ...inputStyle, paddingLeft: '36px', boxSizing: 'border-box' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, SKU, código de barras..."
          />
        </div>
        <select style={selectStyle} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
          <option value="all">Todas las ubicaciones</option>
          {(locations || []).map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select style={selectStyle} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select style={selectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="in_stock">En Stock</option>
          <option value="low_stock">Stock Bajo</option>
          <option value="out_of_stock">Sin Stock</option>
        </select>
        <select style={selectStyle} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Nombre</option>
          <option value="sku">SKU</option>
          <option value="stock">Stock</option>
          <option value="value">Valor</option>
        </select>
        <div style={{ display: 'flex', gap: '4px', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          <button onClick={() => setViewMode('table')} style={{ padding: '6px 10px', border: 'none', background: viewMode === 'table' ? '#3b82f6' : 'transparent', color: viewMode === 'table' ? '#fff' : 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <List size={14} />
          </button>
          <button onClick={() => setViewMode('grid')} style={{ padding: '6px 10px', border: 'none', background: viewMode === 'grid' ? '#3b82f6' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Grid size={14} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
          {filteredProducts.length} productos
          {selectedProducts.size > 0 && ` · ${selectedProducts.size} seleccionados`}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selectedProducts.size > 0 && (
            <button style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={13} /> Exportar ({selectedProducts.size})
            </button>
          )}
          <button onClick={onRefresh} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={() => setShowCreateModal(true)} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={13} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && !isMobile && (
        <div style={{ borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden', background: 'var(--surface)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 48px 1.5fr 100px 120px 0.7fr repeat(' + locations.length + ', 100px) 100px 90px 80px', gap: '0', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-container-low, rgba(255,255,255,0.03))', fontSize: '10px', fontWeight: '700', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', alignItems: 'center' }}>
            <input type="checkbox" checked={selectedProducts.size === paginatedProducts.length && paginatedProducts.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
            <span></span>
            <span>Producto</span>
            <span>SKU</span>
            <span>Categoría</span>
            {(locations || []).map((l) => <span key={l.id} style={{ color: l.color }}>{l.name}</span>)}
            <span>Valor</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>
          {loading && paginatedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
              <p style={{ margin: '10px 0 0', fontSize: '13px' }}>Cargando productos...</p>
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
              <Package size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>No hay productos</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Agrega tu primer producto o ajusta los filtros</p>
            </div>
          ) : (
            paginatedProducts.map((product) => {
              const locStock = getStockForProduct(product.id);
              const totalStock = Object.values(locStock).reduce((s, v) => s + v, 0);
              const value = totalStock * (product.unit_cost || 0);
              let status = 'in_stock';
              if (totalStock === 0) status = 'out_of_stock';
              else if (totalStock <= 5) status = 'low_stock';
              const sc = STATUS_CONFIG[status];
              return (
                <div
                  key={product.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '40px 48px 1.5fr 100px 120px 0.7fr repeat(' + locations.length + ', 100px) 100px 90px 80px', gap: '0', padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', fontSize: '12px', transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-container-low, rgba(255,255,255,0.03))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggleSelect(product.id)} style={{ cursor: 'pointer' }} />
                  {product.image_url ? (
                    <img src={product.image_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--surface-container, rgba(255,255,255,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={14} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>{product.color} {product.size}</div>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--on-surface-variant)' }}>{product.sku}</span>
                  <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{product.category}</span>
                  {(locations || []).map((l) => (
                    <StockMiniBar key={l.id} stock={locStock[l.id] || 0} max={maxLocationStock} color={l.color} />
                  ))}
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: '600', color: 'var(--on-surface)' }}>{formatCurrency(value)}</span>
                  <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: sc.bg, color: sc.color, textAlign: 'center' }}>{sc.label}</span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button onClick={() => setDetailProduct(product)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer' }} title="Ver detalle"><Eye size={14} /></button>
                    <button onClick={() => setEditingProduct(product)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer' }} title="Editar"><Edit3 size={14} /></button>
                    <button onClick={() => onAdjust?.(product)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer' }} title="Ajustar stock"><ArrowUpDown size={14} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' || isMobile ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {loading && paginatedProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
              <Package size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>No hay productos</p>
            </div>
          ) : (
            paginatedProducts.map((product) => {
              const locStock = getStockForProduct(product.id);
              const totalStock = Object.values(locStock).reduce((s, v) => s + v, 0);
              let status = 'in_stock';
              if (totalStock === 0) status = 'out_of_stock';
              else if (totalStock <= 5) status = 'low_stock';
              const sc = STATUS_CONFIG[status];
              return (
                <div
                  key={product.id}
                  onClick={() => setDetailProduct(product)}
                  style={{
                    borderRadius: '12px', border: '1px solid var(--border-subtle)',
                    background: 'var(--surface)', overflow: 'hidden', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'none'; }}
                >
                  {product.image_url ? (
                    <div style={{ height: '120px', background: '#1a1a2e', overflow: 'hidden' }}>
                      <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ height: '120px', background: 'var(--surface-container, rgba(255,255,255,0.03))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={32} color="var(--on-surface-variant)" style={{ opacity: 0.2 }} />
                    </div>
                  )}
                  <div style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', fontFamily: "'JetBrains Mono', monospace" }}>{product.sku}</div>
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {(locations || []).map((l) => (
                        <div key={l.id} style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--on-surface-variant)' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: l.color }} />
                          {locStock[l.id] || 0}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface)' }}>
                        {formatCurrency((product.sell_price || 0))}
                      </span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button onClick={(e) => { e.stopPropagation(); setEditingProduct(product); }} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer' }}><Edit3 size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onAdjust?.(product); }} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer' }}><ArrowUpDown size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: page <= 1 ? 'var(--on-surface-variant)' : 'var(--on-surface)', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontFamily: 'inherit' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
            Página {page} de {totalPages} ({filteredProducts.length} total)
          </span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: page >= totalPages ? 'var(--on-surface-variant)' : 'var(--on-surface)', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontFamily: 'inherit' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Modals */}
      {(showCreateModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          locations={locations}
          onSave={handleSaveProduct}
          onClose={() => { setShowCreateModal(false); setEditingProduct(null); }}
          isNew={!editingProduct}
        />
      )}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          locations={locations}
          stock={stock}
          movements={[]}
          onClose={() => setDetailProduct(null)}
          onEdit={(p) => { setDetailProduct(null); setEditingProduct(p); }}
          onAdjust={(p) => { setDetailProduct(null); onAdjust?.(p); }}
        />
      )}
    </div>
  );
}
