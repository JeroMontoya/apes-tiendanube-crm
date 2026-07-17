import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight, Search, Package, MapPin, Plus, X, RefreshCw,
  CheckCircle, AlertTriangle, ArrowRightLeft, History,
} from 'lucide-react';

function formatNumber(v) {
  return new Intl.NumberFormat('es-CO').format(v || 0);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

function ProductSearch({ products, locations, onSelect, sourceLocation }) {
  const [search, setSearch] = useState('');

  const results = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return (products || []).filter((p) => {
      if (sourceLocation && p.location_id === sourceLocation) return false;
      return (p.name || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
    }).slice(0, 8);
  }, [products, search, sourceLocation]);

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <Search size={16} color="var(--on-surface-variant)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          style={{
            width: '100%', height: '40px', borderRadius: '10px',
            border: '1px solid var(--border-subtle)', background: 'var(--surface)',
            color: 'var(--on-surface)', paddingLeft: '36px', paddingRight: '12px',
            fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
        />
      </div>
      {results.length > 0 && (
        <div style={{ marginTop: '6px', borderRadius: '10px', border: '1px solid var(--border-subtle)', overflow: 'hidden', maxHeight: '180px', overflowY: 'auto' }}>
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); setSearch(''); }}
              style={{
                width: '100%', padding: '10px 14px', border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'transparent', color: 'var(--on-surface)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: '10px', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <Package size={14} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>{p.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>{p.sku}</div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#10b981', fontFamily: "'JetBrains Mono', monospace" }}>
                {p.total_stock || 0} disp.
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TransferItem({ item, locations, stock, onQuantityChange, onRemove }) {
  const maxStock = useMemo(() => {
    if (!stock || !item.product?.id) return 999;
    const s = stock.find((s) => s.product_id === item.product.id && s.location_id === item.fromLocation);
    return s?.quantity || 0;
  }, [stock, item]);

  return (
    <div style={{
      padding: '14px', borderRadius: '10px',
      border: '1px solid var(--border-subtle)',
      background: 'var(--surface-container-low, rgba(255,255,255,0.03))',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Package size={16} color="var(--on-surface-variant)" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product?.name}</div>
          <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>{item.product?.sku}</div>
        </div>
        <button onClick={() => onRemove(item.id)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>Máx disponible: {maxStock}</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontSize: '16px' }}>-</button>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => onQuantityChange(item.id, Math.min(maxStock, Math.max(1, parseInt(e.target.value) || 1)))}
              style={{
                width: '60px', height: '32px', borderRadius: '6px',
                border: '1px solid var(--border-subtle)', background: 'var(--surface)',
                color: 'var(--on-surface)', textAlign: 'center', fontSize: '14px',
                fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", outline: 'none',
              }}
              min="1"
              max={maxStock}
            />
            <button onClick={() => onQuantityChange(item.id, Math.min(maxStock, item.quantity + 1))} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', fontSize: '16px' }}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StockTransfer({ products, locations, stock, onTransfer, onClose }) {
  const [fromLocation, setFromLocation] = useState(locations?.[0]?.id || 'r5');
  const [toLocation, setToLocation] = useState(locations?.[1]?.id || 'apes');
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const swapLocations = () => {
    setFromLocation(toLocation);
    setToLocation(fromLocation);
  };

  const handleAddProduct = (product) => {
    if (items.some((i) => i.product?.id === product.id)) {
      setToast({ type: 'warning', message: 'Producto ya agregado' });
      return;
    }
    setItems((prev) => [...prev, { id: `item-${Date.now()}`, product, quantity: 1 }]);
    setShowProductSearch(false);
  };

  const handleQuantityChange = (itemId, qty) => {
    setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, quantity: qty } : i));
  };

  const handleRemoveItem = (itemId) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleTransfer = async () => {
    if (items.length === 0 || fromLocation === toLocation) return;
    setSaving(true);
    try {
      for (const item of items) {
        await onTransfer?.(item.product.id, fromLocation, toLocation, item.quantity, notes);
      }
      setToast({ type: 'success', message: `${items.length} producto(s) transferido(s)` });
      setTimeout(() => onClose?.(), 1500);
    } catch (err) {
      setToast({ type: 'error', message: 'Error en la transferencia' });
    } finally {
      setSaving(false);
    }
  };

  const fromName = locations?.find((l) => l.id === fromLocation)?.name || fromLocation;
  const toName = locations?.find((l) => l.id === toLocation)?.name || toLocation;
  const fromColor = locations?.find((l) => l.id === fromLocation)?.color || '#3b82f6';
  const toColor = locations?.find((l) => l.id === toLocation)?.color || '#10b981';
  const valid = items.length > 0 && fromLocation !== toLocation;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div
        style={{ width: '560px', maxHeight: '90vh', overflow: 'auto', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
            padding: '10px 20px', borderRadius: '10px',
            background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : toast.type === 'warning' ? 'rgba(245,158,11,0.95)' : 'rgba(239,68,68,0.95)',
            color: '#fff', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 10,
          }}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeftRight size={20} color="#8b5cf6" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--on-surface)' }}>Transferir Stock</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--on-surface-variant)' }}>Entre ubicaciones</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Locations */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Desde</label>
              <select
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                style={{
                  width: '100%', height: '40px', borderRadius: '10px',
                  border: `1px solid ${fromColor}40`, background: `${fromColor}10`,
                  color: 'var(--on-surface)', fontSize: '13px', fontWeight: '600',
                  fontFamily: 'inherit', padding: '0 10px', cursor: 'pointer',
                }}
              >
                {(locations || []).map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <button onClick={swapLocations} style={{ marginTop: '16px', width: '36px', height: '36px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowRightLeft size={16} />
            </button>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Hacia</label>
              <select
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                style={{
                  width: '100%', height: '40px', borderRadius: '10px',
                  border: `1px solid ${toColor}40`, background: `${toColor}10`,
                  color: 'var(--on-surface)', fontSize: '13px', fontWeight: '600',
                  fontFamily: 'inherit', padding: '0 10px', cursor: 'pointer',
                }}
              >
                {(locations || []).map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Products */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)' }}>Productos a Transferir</label>
              <button
                onClick={() => setShowProductSearch(!showProductSearch)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={13} /> Agregar
              </button>
            </div>
            {showProductSearch && (
              <div style={{ marginBottom: '10px' }}>
                <ProductSearch products={products} locations={locations} onSelect={handleAddProduct} sourceLocation={fromLocation} />
              </div>
            )}
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', border: '2px dashed var(--border-subtle)', borderRadius: '12px', color: 'var(--on-surface-variant)' }}>
                <Package size={28} style={{ opacity: 0.2, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Agrega productos para transferir</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((item) => (
                  <TransferItem
                    key={item.id}
                    item={item}
                    locations={locations}
                    stock={stock}
                    onQuantityChange={handleQuantityChange}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block' }}>Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Motivo de la transferencia..."
              style={{
                width: '100%', borderRadius: '10px',
                border: '1px solid var(--border-subtle)', background: 'var(--surface)',
                color: 'var(--on-surface)', padding: '10px 12px', resize: 'none',
                fontFamily: 'inherit', fontSize: '13px', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div style={{
              padding: '14px', borderRadius: '10px',
              background: 'var(--surface-container-low, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: fromColor }}>{fromName}</div>
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>-{items.reduce((s, i) => s + i.quantity, 0)} und.</div>
              </div>
              <ArrowLeftRight size={18} color="var(--on-surface-variant)" />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: toColor }}>{toName}</div>
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>+{items.reduce((s, i) => s + i.quantity, 0)} und.</div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
                {items.length} producto{items.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button
              onClick={handleTransfer}
              disabled={!valid || saving}
              style={{
                padding: '12px 24px', borderRadius: '10px', border: 'none',
                background: valid ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'var(--surface-container, rgba(255,255,255,0.05))',
                color: valid ? '#fff' : 'var(--on-surface-variant)',
                fontSize: '13px', fontWeight: '700',
                cursor: valid && !saving ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowLeftRight size={14} />}
              {saving ? 'Transfiriendo...' : 'Transferir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
