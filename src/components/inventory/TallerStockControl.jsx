import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Truck, Factory, RotateCcw, Plus, Minus, Save, X,
  CheckCircle, AlertTriangle, RefreshCw, Wifi, WifiOff, Zap,
  Package, MapPin
} from 'lucide-react';

const LOCATIONS = [
  { code: 'R5', label: 'R5', color: '#6366f1', desc: 'Local Principal' },
  { code: 'APES', label: 'APES', color: '#8b5cf6', desc: 'Local Secundario' },
  { code: 'WEB', label: 'WEB', color: '#06B6D4', desc: 'tiendaapes.com' },
];

export default function TallerStockControl({ session }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [syncStatus, setSyncStatus] = useState({}); // product_id -> {success, error, stock}
  const [showOnlyMapped, setShowOnlyMapped] = useState(true);
  const [sortBy, setSortBy] = useState('name');

  const getAuthHeaders = useCallback(() => {
    const token = session?.access_token;
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }, [session]);

  // Transform API data to expected format
  const transformProducts = (apiProducts) => {
    return (apiProducts || []).map(p => {
      const stock_by_location = {};
      const available_by_location = {};
      const reserved_by_location = {};
      
      (p.inventory_stock || []).forEach(s => {
        const loc = s.inventory_locations;
        if (!loc) return;
        const code = loc.code;
        const qty = s.quantity || 0;
        const reserved = s.reserved || 0;
        stock_by_location[code] = qty;
        reserved_by_location[code] = reserved;
        available_by_location[code] = s.unlimited_stock ? 999999 : Math.max(0, qty - reserved);
      });
      
      // Ensure all 3 locations exist
      ['R5', 'APES', 'WEB'].forEach(code => {
        if (stock_by_location[code] === undefined) stock_by_location[code] = 0;
        if (available_by_location[code] === undefined) available_by_location[code] = 0;
        if (reserved_by_location[code] === undefined) reserved_by_location[code] = 0;
      });
      
      const total_available = Object.values(available_by_location).reduce((a, b) => a + b, 0);
      
      return {
        ...p,
        stock_by_location,
        available_by_location,
        reserved_by_location,
        total_available,
      };
    });
  };

  // Fetch all products with stock for 3 locations
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/products?limit=500', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(transformProducts(data.products || []));
    } catch (err) {
      console.error('[TallerStock] Fetch error:', err);
      showToast('error', 'Error cargando productos');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Stock adjustment for a single cell
  const handleAdjust = async (product, locationCode, delta) => {
    const key = `${product.id}-${locationCode}`;
    setSaving(prev => new Set(prev).add(key));
    
    try {
      const res = await fetch('/api/inventory/taller-sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_id: product.id,
          location_code: locationCode,
          quantity_change: delta,
          movement_type: delta > 0 ? 'production_in' : 'adjustment',
          reference_type: 'taller_manual',
          notes: `Ajuste manual taller: ${delta > 0 ? '+' : ''}${delta} en ${locationCode}`,
          performed_by_name: 'Taller Manual'
        })
      });
      
      const result = await res.json();
      
      if (result.success) {
        // Optimistic update
        setProducts(prev => prev.map(p => {
          if (p.id !== product.id) return p;
          const newStockByLoc = { ...p.stock_by_location };
          const newAvailableByLoc = { ...p.available_by_location };
          const newReservedByLoc = { ...p.reserved_by_location };
          const current = newStockByLoc[locationCode] || 0;
          const newQty = Math.max(0, current + delta);
          newStockByLoc[locationCode] = newQty;
          newAvailableByLoc[locationCode] = newQty - (newReservedByLoc[locationCode] || 0);
          return { ...p, stock_by_location: newStockByLoc, available_by_location: newAvailableByLoc, reserved_by_location: newReservedByLoc, total_available: Object.values(newAvailableByLoc).reduce((a, b) => a + b, 0) };
        }));
        
        // Update sync status
        if (result.tiendanube_sync) {
          setSyncStatus(prev => ({
            ...prev,
            [product.id]: { ...prev[product.id], ...result.tiendanube_sync }
          }));
          if (result.tiendanube_sync.success) {
            showToast('success', `Stock WEB sincronizado: ${result.tiendanube_sync.stock_pushed}`);
          } else {
            showToast('error', `Error sync TiendaNube: ${result.tiendanube_sync.error || 'unknown'}`);
          }
        } else {
          showToast('success', 'Stock actualizado');
        }
      } else {
        showToast('error', result.error || 'Error al ajustar stock');
      }
    } catch (err) {
      console.error('[TallerStock] Adjust error:', err);
      showToast('error', 'Error de conexión');
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  // Filter & sort
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    if (showOnlyMapped) {
      result = result.filter(p => p.tiendanube_product_id);
    }
    
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    }
    
    result.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'sku') return (a.sku || '').localeCompare(b.sku || '');
      if (sortBy === 'web') return (b.available_by_location?.WEB || 0) - (a.available_by_location?.WEB || 0);
      if (sortBy === 'total') return (b.total_available || 0) - (a.total_available || 0);
      return 0;
    });
    
    return result;
  }, [products, search, showOnlyMapped, sortBy]);

  // Cell rendering
  const getStockValue = (product, locCode) => {
    const available = product.available_by_location?.[locCode] ?? 0;
    const reserved = product.reserved_by_location?.[locCode] ?? 0;
    const total = product.stock_by_location?.[locCode] ?? 0;
    return { available, reserved, total };
  };

  const getSyncIndicator = (productId) => {
    const status = syncStatus[productId];
    if (!status) return null;
    if (status.success) return <CheckCircle size={14} color="#06B6D4" title="Sincronizado con TiendaNube" />;
    if (status.error) return <AlertTriangle size={14} color="#E11D48" title={`Error: ${status.error}`} />;
    return null;
  };

  const isSaving = (productId, locCode) => saving.has(`${productId}-${locCode}`);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'var(--on-surface-variant)' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
        <p>Cargando inventario...</p>
      </div>
    );
  }

  const inputStyle = (isError = false) => ({
    width: '100%', height: '36px', borderRadius: '8px',
    border: `1px solid ${isError ? '#E11D48' : 'var(--border-subtle)'}`,
    background: 'var(--surface)', color: 'var(--on-surface)',
    fontSize: '14px', fontWeight: '600', textAlign: 'center',
    fontFamily: "'JetBrains Mono', monospace", outline: 'none',
    boxSizing: 'border-box', padding: '0 8px',
  });

  const btnStyle = (color, disabled = false) => ({
    width: '32px', height: '32px', borderRadius: '6px',
    border: 'none', background: disabled ? 'var(--border-subtle)' : color,
    color: 'var(--on-surface)', fontSize: '16px', fontWeight: '700',
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: disabled ? 0.5 : 1, transition: 'all 0.1s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', padding: '16px', boxSizing: 'border-box' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Factory size={20} color="#06B6D4" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--on-surface)' }}>Control de Stock - Taller</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
              {filteredProducts.length} productos · Ajuste inmediato a TiendaNube en columna WEB
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showOnlyMapped} onChange={e => setShowOnlyMapped(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#06B6D4' }} />
            Solo con TiendaNube
          </label>
          
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} color="var(--on-surface-variant)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              style={{ ...inputStyle(), paddingLeft: '36px' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, SKU, código..."
            />
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '12px', fontFamily: 'inherit' }}
          >
            <option value="name">Ordenar: Nombre</option>
            <option value="sku">Ordenar: SKU</option>
            <option value="web">Ordenar: Stock WEB ↓</option>
            <option value="total">Ordenar: Total ↓</option>
          </select>

          <button
            onClick={fetchProducts}
            disabled={loading}
            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#6366f1', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '600', cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : '' }} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 1000,
          padding: '12px 20px', borderRadius: '10px',
          background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
          color: 'var(--on-surface)', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', animation: 'slideIn 0.2s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '12px', background: 'var(--surface)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-container-low, rgba(255,255,255,0.02))', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: 'var(--on-surface)', whiteSpace: 'nowrap', minWidth: '280px' }}>Producto</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: 'var(--on-surface)', whiteSpace: 'nowrap', width: '90px' }}>SKU</th>
                
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#6366f1', whiteSpace: 'nowrap', width: '110px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <MapPin size={12} />
                    R5
                  </div>
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#8b5cf6', whiteSpace: 'nowrap', width: '110px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <MapPin size={12} />
                    APES
                  </div>
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#06B6D4', whiteSpace: 'nowrap', width: '130px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Zap size={12} />
                    WEB
                    <Wifi size={10} color="#06B6D4" title="Sincroniza con TiendaNube" />
                  </div>
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: 'var(--on-surface)', whiteSpace: 'nowrap', width: '90px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                    No hay productos para mostrar
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const r5 = getStockValue(product, 'R5');
                  const apes = getStockValue(product, 'APES');
                  const web = getStockValue(product, 'WEB');
                  const total = r5.total + apes.total + web.total;
                  
                  return (
                    <tr key={product.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {product.image_url ? (
                            <img src={product.image_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--surface-container, var(--border-subtle))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Package size={16} color="var(--on-surface-variant)" style={{ opacity: 0.4 }} />
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {product.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                              {product.color && `${product.color} `}{product.size && `/ ${product.size}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '11px', fontFamily: 'monospace' }}>
                        {product.sku || '—'}
                      </td>

                      {/* R5 */}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button
                            onClick={() => !isSaving(product.id, 'R5') && quickAdjust(product, 'R5', -1)}
                            disabled={isSaving(product.id, 'R5') || r5.available <= 0}
                            style={btnStyle('#E11D48', isSaving(product.id, 'R5') || r5.available <= 0)}
                            title="Restar 1"
                          ><Minus size={12} /></button>
                          
                          <input
                            type="number"
                            value={r5.available}
                            onChange={e => {
                              const newVal = Math.max(0, parseInt(e.target.value) || 0);
                              const delta = newVal - r5.available;
                              if (delta !== 0) quickAdjust(product, 'R5', delta);
                            }}
                            onBlur={e => {
                              const newVal = Math.max(0, parseInt(e.target.value) || 0);
                              const delta = newVal - r5.available;
                              if (delta !== 0) quickAdjust(product, 'R5', delta);
                            }}
                            style={inputStyle(r5.available < 0)}
                            min="0"
                          />
                          
                          <button
                            onClick={() => !isSaving(product.id, 'R5') && quickAdjust(product, 'R5', 1)}
                            disabled={isSaving(product.id, 'R5')}
                            style={btnStyle('#06B6D4', isSaving(product.id, 'R5'))}
                            title="Sumar 1"
                          ><Plus size={12} /></button>
                        </div>
                        {r5.reserved > 0 && (
                          <div style={{ fontSize: '9px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                            ({r5.reserved} reservados)
                          </div>
                        )}
                      </td>

                      {/* APES */}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button
                            onClick={() => !isSaving(product.id, 'APES') && quickAdjust(product, 'APES', -1)}
                            disabled={isSaving(product.id, 'APES') || apes.available <= 0}
                            style={btnStyle('#E11D48', isSaving(product.id, 'APES') || apes.available <= 0)}
                            title="Restar 1"
                          ><Minus size={12} /></button>
                          
                          <input
                            type="number"
                            value={apes.available}
                            onChange={e => {
                              const newVal = Math.max(0, parseInt(e.target.value) || 0);
                              const delta = newVal - apes.available;
                              if (delta !== 0) quickAdjust(product, 'APES', delta);
                            }}
                            onBlur={e => {
                              const newVal = Math.max(0, parseInt(e.target.value) || 0);
                              const delta = newVal - apes.available;
                              if (delta !== 0) quickAdjust(product, 'APES', delta);
                            }}
                            style={inputStyle(apes.available < 0)}
                            min="0"
                          />
                          
                          <button
                            onClick={() => !isSaving(product.id, 'APES') && quickAdjust(product, 'APES', 1)}
                            disabled={isSaving(product.id, 'APES')}
                            style={btnStyle('#06B6D4', isSaving(product.id, 'APES'))}
                            title="Sumar 1"
                          ><Plus size={12} /></button>
                        </div>
                        {apes.reserved > 0 && (
                          <div style={{ fontSize: '9px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                            ({apes.reserved} reservados)
                          </div>
                        )}
                      </td>

                      {/* WEB - with sync indicator */}
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button
                            onClick={() => !isSaving(product.id, 'WEB') && quickAdjust(product, 'WEB', -1)}
                            disabled={isSaving(product.id, 'WEB') || web.available <= 0}
                            style={btnStyle('#E11D48', isSaving(product.id, 'WEB') || web.available <= 0)}
                            title="Restar 1 (sincroniza con TiendaNube)"
                          ><Minus size={12} /></button>
                          
                          <input
                            type="number"
                            value={web.available}
                            onChange={e => {
                              const newVal = Math.max(0, parseInt(e.target.value) || 0);
                              const delta = newVal - web.available;
                              if (delta !== 0) quickAdjust(product, 'WEB', delta);
                            }}
                            onBlur={e => {
                              const newVal = Math.max(0, parseInt(e.target.value) || 0);
                              const delta = newVal - web.available;
                              if (delta !== 0) quickAdjust(product, 'WEB', delta);
                            }}
                            style={inputStyle(web.available < 0)}
                            min="0"
                          />
                          
                          <button
                            onClick={() => !isSaving(product.id, 'WEB') && quickAdjust(product, 'WEB', 1)}
                            disabled={isSaving(product.id, 'WEB')}
                            style={btnStyle('#06B6D4', isSaving(product.id, 'WEB'))}
                            title="Sumar 1 (sincroniza con TiendaNube)"
                          ><Plus size={12} /></button>
                        </div>
                        
                        {/* Sync status indicator */}
                        {getSyncIndicator(product.id)}
                        
                        {web.reserved > 0 && (
                          <div style={{ fontSize: '9px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                            ({web.reserved} reservados)
                          </div>
                        )}
                        
                        {!product.tiendanube_product_id && (
                          <div style={{ fontSize: '9px', color: 'var(--primary-container)', marginTop: '2px' }}>
                            ⚠ Sin mapear TN
                          </div>
                        )}
                      </td>

                      {/* Total */}
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '700', fontSize: '14px', color: 'var(--on-surface)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {total}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
