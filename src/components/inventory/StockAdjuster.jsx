import React, { useState, useMemo, useCallback } from 'react';
import {
  Package, Search, MapPin, Plus, Minus, RotateCcw, Truck,
  ArrowUpDown, CheckCircle, X, RefreshCw, AlertTriangle, Factory,
} from 'lucide-react';

const ADJUSTMENT_TYPES = [
  { id: 'receive', label: 'Recepción', color: '#10b981', icon: Package, desc: 'Ingreso de mercadería' },
  { id: 'dispatch', label: 'Despacho', color: '#ef4444', icon: Truck, desc: 'Envío a cliente' },
  { id: 'return', label: 'Devolución', color: 'var(--primary-container)', icon: RotateCcw, desc: 'Devolución de cliente' },
  { id: 'adjustment', label: 'Ajuste', color: '#3b82f6', icon: ArrowUpDown, desc: 'Corrección manual' },
  { id: 'production_in', label: 'Producción', color: '#06b6d4', icon: Factory, desc: 'Ingreso de taller' },
];

export default function StockAdjuster({ products, locations, onAdjust, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(locations?.[0]?.id || 'r5');
  const [adjustType, setAdjustType] = useState('receive');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const searchResults = useMemo(() => {
    if (!search || search.length < 2) return [];
    const q = search.toLowerCase();
    return (products || []).filter((p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [products, search]);

  const currentStock = useMemo(() => {
    if (!selectedProduct) return 0;
    return selectedProduct.stock_by_location?.[selectedLocation] || 0;
  }, [selectedProduct, selectedLocation]);

  const typeConfig = ADJUSTMENT_TYPES.find((t) => t.id === adjustType) || ADJUSTMENT_TYPES[0];
  const isPositive = ['receive', 'return', 'production_in'].includes(adjustType);
  const afterStock = isPositive ? currentStock + quantity : Math.max(0, currentStock - quantity);

  const handleConfirm = async () => {
    if (!selectedProduct || quantity <= 0) return;
    setSaving(true);
    try {
      const result = await onAdjust?.(
        selectedProduct.id,
        selectedLocation,
        isPositive ? quantity : -quantity,
        adjustType,
        notes
      );
      if (result?.success !== false) {
        setToast({ type: 'success', message: 'Stock actualizado correctamente' });
        setTimeout(() => onClose?.(), 1500);
      } else {
        setToast({ type: 'error', message: result?.error || 'Error al ajustar stock' });
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Error al ajustar stock' });
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  const reset = () => {
    setSelectedProduct(null);
    setSearch('');
    setQuantity(1);
    setNotes('');
    setConfirming(false);
  };

  const fieldStyle = {
    width: '100%', height: '40px', borderRadius: '10px',
    border: '1px solid var(--border-subtle)', background: 'var(--surface)',
    color: 'var(--on-surface)', fontSize: '14px', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = {
    fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)',
    marginBottom: '6px', display: 'block',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div
        style={{ width: '520px', maxHeight: '90vh', overflow: 'auto', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
            padding: '10px 20px', borderRadius: '10px',
            background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
            color: 'var(--on-surface)', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 10, whiteSpace: 'nowrap',
          }}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${typeConfig.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <typeConfig.icon size={20} color={typeConfig.color} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--on-surface)' }}>Ajustar Stock</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--on-surface-variant)' }}>{typeConfig.desc}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Product Search/Select */}
          {!selectedProduct ? (
            <div>
              <label style={labelStyle}>Buscar Producto *</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} color="var(--on-surface-variant)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  style={{ ...fieldStyle, paddingLeft: '36px' }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre, SKU o código de barras..."
                  autoFocus
                />
              </div>
              {searchResults.length > 0 && (
                <div style={{ marginTop: '8px', borderRadius: '10px', border: '1px solid var(--border-subtle)', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setSearch(''); }}
                      style={{
                        width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border-subtle)',
                        background: 'transparent', color: 'var(--on-surface)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', fontFamily: 'inherit',
                      }}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--surface-container, var(--border-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package size={14} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{p.sku} · {p.category}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-container-low, var(--surface-container-low))', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {selectedProduct.image_url ? (
                <img src={selectedProduct.image_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--surface-container, var(--border-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={18} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)' }}>{selectedProduct.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{selectedProduct.sku}</div>
              </div>
              <button onClick={reset} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface-variant)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cambiar
              </button>
            </div>
          )}

          {/* Location */}
          <div>
            <label style={labelStyle}>Ubicación</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(locations || []).map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLocation(l.id)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${selectedLocation === l.id ? l.color : 'var(--border-subtle)'}`,
                    background: selectedLocation === l.id ? `${l.color}15` : 'transparent',
                    color: selectedLocation === l.id ? l.color : 'var(--on-surface)',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    transition: 'all 0.15s',
                  }}
                >
                  <MapPin size={13} />
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          {/* Adjustment Type */}
          <div>
            <label style={labelStyle}>Tipo de Ajuste</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ADJUSTMENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setAdjustType(t.id)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px',
                    border: `1px solid ${adjustType === t.id ? t.color : 'var(--border-subtle)'}`,
                    background: adjustType === t.id ? `${t.color}15` : 'transparent',
                    color: adjustType === t.id ? t.color : 'var(--on-surface)',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    transition: 'all 0.15s',
                  }}
                >
                  <t.icon size={13} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label style={labelStyle}>Cantidad</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  border: '1px solid var(--border-subtle)', background: 'var(--surface)',
                  color: 'var(--on-surface)', fontSize: '20px', fontWeight: '700',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                <Minus size={18} />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  flex: 1, height: '44px', borderRadius: '10px',
                  border: '2px solid var(--border-subtle)', background: 'var(--surface)',
                  color: 'var(--on-surface)', fontSize: '22px', fontWeight: '800',
                  textAlign: 'center', fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none',
                }}
                min="1"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  border: '1px solid var(--border-subtle)', background: 'var(--surface)',
                  color: 'var(--on-surface)', fontSize: '20px', fontWeight: '700',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Motivo del ajuste..."
              style={{
                width: '100%', borderRadius: '10px',
                border: '1px solid var(--border-subtle)', background: 'var(--surface)',
                color: 'var(--on-surface)', padding: '10px 12px', resize: 'none',
                fontFamily: 'inherit', fontSize: '13px', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Stock Preview */}
          {selectedProduct && (
            <div style={{
              padding: '16px', borderRadius: '12px',
              background: 'var(--surface-container-low, var(--surface-container-low))',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--on-surface)', marginBottom: '12px' }}>Vista Previa del Stock</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--on-surface)', fontFamily: "'JetBrains Mono', monospace" }}>{currentStock}</div>
                  <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Actual</div>
                </div>
                <div style={{ fontSize: '20px', color: typeConfig.color }}>→</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: typeConfig.color, fontFamily: "'JetBrains Mono', monospace" }}>{afterStock}</div>
                  <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>Después</div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: '6px',
                  background: isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: isPositive ? '#10b981' : '#ef4444',
                  fontSize: '13px', fontWeight: '700',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {isPositive ? '+' : '-'}{quantity}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
            {confirming ? (
              <button onClick={handleConfirm} disabled={saving} style={{
                padding: '12px 24px', borderRadius: '10px', border: 'none',
                background: '#10b981', color: 'var(--on-surface)', fontSize: '13px', fontWeight: '700',
                cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
                {saving ? 'Procesando...' : 'Confirmar Ajuste'}
              </button>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                disabled={!selectedProduct || quantity <= 0}
                style={{
                  padding: '12px 24px', borderRadius: '10px', border: 'none',
                  background: '#3b82f6', color: 'var(--on-surface)', fontSize: '13px', fontWeight: '700',
                  cursor: !selectedProduct || quantity <= 0 ? 'default' : 'pointer',
                  fontFamily: 'inherit', opacity: !selectedProduct || quantity <= 0 ? 0.5 : 1,
                }}
              >
                Revisar y Ajustar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
