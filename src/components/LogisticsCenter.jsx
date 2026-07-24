import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Package, Plus, ArrowDown, ArrowUp, ArrowLeftRight, RefreshCw,
  Search, Filter, MapPin, AlertTriangle, CheckCircle2, XCircle,
  Camera, Edit3, Trash2, Eye, Clock, Truck, Warehouse, RotateCcw,
  ChevronDown, ChevronUp, Loader2, Box, Scan, Tag, Layers, Cloud
} from 'lucide-react';

const C = {
  primary: '#6366F1', success: '#10B981', warning: 'var(--primary-container)',
  danger: '#EF4444', info: '#0EA5E9', purple: '#8B5CF6',
  teal: '#14B8A6', pink: '#EC4899', orange: '#F97316',
};

const MOVEMENT_TYPES = [
  { id: 'receive', label: 'Recibir', icon: ArrowDown, color: C.success, desc: 'Producto nuevo al inventario' },
  { id: 'dispatch', label: 'Despachar', icon: Truck, color: C.info, desc: 'Enviar producto' },
  { id: 'transfer', label: 'Transferir', icon: ArrowLeftRight, color: C.purple, desc: 'Mover entre ubicaciones' },
  { id: 'production_in', label: 'Producción', icon: Package, color: C.orange, desc: 'Ingresar de taller' },
  { id: 'return', label: 'Devolución', icon: RotateCcw, color: C.warning, desc: 'Producto devuelto' },
  { id: 'defect', label: 'Defecto', icon: AlertTriangle, color: C.danger, desc: 'Producto dañado/defectuoso' },
];

const CATEGORIES = [
  { value: 'producto_tn', label: 'TiendaNueve' },
  { value: 'camiseta', label: 'Camiseta' },
  { value: 'buzo', label: 'Buzo' },
  { value: 'pants', label: 'Pants' },
  { value: 'gorra', label: 'Gorra' },
  { value: 'short', label: 'Short' },
  { value: 'chaqueta', label: 'Chaqueta' },
  { value: 'accesorio', label: 'Accesorio' },
  { value: 'materia_prima', label: 'Materia Prima' },
  { value: 'otro', label: 'Otro' },
];

const SOURCE_TABS = [
  { id: 'all', label: 'Todos', icon: Package },
  { id: 'tiendanube', label: 'TiendaNueve', icon: Cloud },
  { id: 'local', label: 'R5', icon: MapPin },
  { id: 'other_store', label: 'APES', icon: Layers }
];

function Store() { return <Package size={14} />; }

function StockBar({ current, min }) {
  const pct = min > 0 ? Math.min(100, (current / min) * 100) : (current > 0 ? 100 : 0);
  const color = current === 0 ? C.danger : current <= min ? C.warning : C.success;
  return (
    <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'var(--glass-border)', overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(pct, 2)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function StockBadge({ stock, min }) {
  const isZero = stock === 0;
  const isLow = stock > 0 && stock <= (min || 5);
  const bg = isZero ? 'rgba(239,68,68,0.15)' : isLow ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)';
  const color = isZero ? C.danger : isLow ? C.warning : C.success;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: bg, color, fontSize: 12, fontWeight: 700, minWidth: 40, justifyContent: 'center' }}>
      {isZero ? <XCircle size={12} /> : isLow ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
      {stock}
    </span>
  );
}

function MovementModal({ item, locations, onClose, onConfirm }) {
  const [type, setType] = useState('receive');
  const [qty, setQty] = useState(1);
  const [toLoc, setToLoc] = useState('Almacén General');
  const [fromLoc, setFromLoc] = useState('');
  const [notes, setNotes] = useState('');

  const mt = MOVEMENT_TYPES.find(m => m.id === type);

  const handleSubmit = async () => {
    if (qty <= 0) return;
    await onConfirm({
      inventory_item_id: item.id,
      movement_type: type,
      quantity: type === 'dispatch' || type === 'defect' ? -Math.abs(qty) : Math.abs(qty),
      to_location: toLoc,
      from_location: fromLoc,
      notes,
    });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border-subtle)', width: 420, maxWidth: '95vw', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `${mt.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <mt.icon size={20} color={mt.color} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>{mt.label} producto</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--on-surface-variant)' }}>{item.name} · {item.color} {item.size}</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: 4 }}><XCircle size={20} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Movement Type Grid */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Tipo de movimiento</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {MOVEMENT_TYPES.map(m => (
                <button key={m.id} onClick={() => setType(m.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 8px', borderRadius: 10, border: type === m.id ? `2px solid ${m.color}` : '1px solid var(--border-subtle)', background: type === m.id ? `${m.color}15` : 'transparent', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                  <m.icon size={18} color={type === m.id ? m.color : 'var(--on-surface-variant)'} />
                  <span style={{ fontSize: 11, fontWeight: type === m.id ? 700 : 500, color: type === m.id ? m.color : 'var(--on-surface-variant)' }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 6, display: 'block' }}>Cantidad</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>-</button>
              <input type="number" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ flex: 1, height: 40, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', textAlign: 'center', fontSize: 18, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={() => setQty(qty + 1)} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}>+</button>
            </div>
          </div>

          {/* Locations */}
          {type === 'transfer' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 6, display: 'block' }}>Desde</label>
                <select value={fromLoc} onChange={e => setFromLoc(e.target.value)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 8px', fontFamily: 'inherit', fontSize: 13 }}>
                  <option value="">Seleccionar...</option>
                  {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 6, display: 'block' }}>Hacia</label>
                <select value={toLoc} onChange={e => setToLoc(e.target.value)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 8px', fontFamily: 'inherit', fontSize: 13 }}>
                  <option value="">Seleccionar...</option>
                  {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {type !== 'transfer' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 6, display: 'block' }}>{type === 'dispatch' ? 'Enviar a' : 'Ubicación destino'}</label>
              <select value={toLoc} onChange={e => setToLoc(e.target.value)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 8px', fontFamily: 'inherit', fontSize: 13 }}>
                <option value="">Seleccionar...</option>
                {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 6, display: 'block' }}>Notas (opcional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ej: Lote #123, cliente Juan..."
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '8px 12px', resize: 'none', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
          </div>

          {/* Submit */}
          <button onClick={handleSubmit}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 10, border: 'none', background: mt.color, color: 'var(--on-surface)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <mt.icon size={18} /> Confirmar {mt.label} ({qty} unidades)
          </button>
        </div>
      </div>
    </div>
  );
}

function AddProductModal({ locations, onClose, onConfirm }) {
  const [form, setForm] = useState({ name: '', source: 'local', category: 'otro', color: '', size: '', sku: '', cost_price: 0, sell_price: 0, current_stock: 0, min_stock: 5, location: 'Almacén General', description: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border-subtle)', width: 480, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={20} color={C.primary} /> Agregar producto</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}><XCircle size={20} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { key: 'name', label: 'Nombre *', type: 'text', placeholder: 'Nombre del producto' },
            { key: 'sku', label: 'SKU', type: 'text', placeholder: 'Código único' },
            { key: 'color', label: 'Color', type: 'text', placeholder: 'Ej: Negro, Azul' },
            { key: 'size', label: 'Talla', type: 'text', placeholder: 'Ej: M, L, XL' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 4, display: 'block' }}>{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 12px', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 4, display: 'block' }}>Fuente</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                style={{ flex: 1, height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 12px', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}>
                <option value="local">R5</option>
                <option value="other_store">APES</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 4, display: 'block' }}>Categoría</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 8px', fontFamily: 'inherit', fontSize: 13 }}>
                {CATEGORIES.filter(c => c.value !== 'producto_tn').map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 4, display: 'block' }}>Stock inicial</label>
              <input type="number" value={form.current_stock} onChange={e => set('current_stock', parseInt(e.target.value) || 0)}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 10px', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 4, display: 'block' }}>Stock mínimo</label>
              <input type="number" value={form.min_stock} onChange={e => set('min_stock', parseInt(e.target.value) || 0)}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 10px', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 4, display: 'block' }}>Ubicación</label>
              <select value={form.location} onChange={e => set('location', e.target.value)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 6px', fontFamily: 'inherit', fontSize: 12 }}>
                {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 4, display: 'block' }}>Costo unitario</label>
              <input type="number" value={form.cost_price} onChange={e => set('cost_price', parseFloat(e.target.value) || 0)}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 10px', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: 4, display: 'block' }}>Precio de venta</label>
              <input type="number" value={form.sell_price} onChange={e => set('sell_price', parseFloat(e.target.value) || 0)}
                style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 10px', fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <button onClick={() => { if (!form.name) return; onConfirm(form); onClose(); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 10, border: 'none', background: C.primary, color: 'var(--on-surface)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4 }}>
            <Plus size={18} /> Agregar al inventario
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN COMPONENT ═══
export default function LogisticsCenter({ session }) {
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceTab, setSourceTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState('grid'); // 'grid' | 'list' | 'timeline'
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [movementModal, setMovementModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, movRes, locRes] = await Promise.all([
        fetch('/api/taller/inventory').then(r => r.json()),
        fetch('/api/taller/movements?limit=100').then(r => r.json()),
        fetch('/api/taller/locations').then(r => r.json()),
      ]);
      if (itemsRes.ok) setItems(itemsRes.items);
      if (movRes.ok) setMovements(movRes.movements);
      if (locRes.ok) setLocations(locRes.locations);
    } catch (e) { console.error('[Logistics] Load error:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase.channel('logistics-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshop_inventory' }, () => loadData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stock_movements' }, () => loadData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadData]);

  const syncTN = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/taller/sync-tn', { method: 'POST' });
      const data = await res.json();
      if (data.ok) { await loadData(); }
    } catch (e) { console.error('[Sync TN]', e); }
    setSyncing(false);
  };

  const handleMovement = async (mov) => {
    await fetch('/api/taller/inventory/' + mov.inventory_item_id + '/adjust', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mov),
    });
    await loadData();
  };

  const handleAddProduct = async (form) => {
    await fetch('/api/taller/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    await loadData();
  };

  // Filter + sort
  const filtered = useMemo(() => {
    let result = items;
    if (sourceTab !== 'all') result = result.filter(i => i.source === sourceTab);
    if (statusFilter === 'low') result = result.filter(i => i.current_stock > 0 && i.current_stock <= (i.min_stock || 5));
    else if (statusFilter === 'out') result = result.filter(i => i.current_stock === 0);
    else if (statusFilter === 'ok') result = result.filter(i => i.current_stock > (i.min_stock || 5));
    if (search) {
      const t = search.toLowerCase();
      result = result.filter(i => (i.name?.toLowerCase().includes(t) || i.sku?.toLowerCase().includes(t) || i.color?.toLowerCase().includes(t)));
    }
    result = [...result].sort((a, b) => {
      let va, vb;
      if (sortBy === 'name') { va = a.name; vb = b.name; }
      else if (sortBy === 'stock') { va = a.current_stock; vb = b.current_stock; }
      else { va = a[sortBy] || ''; vb = b[sortBy] || ''; }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return result;
  }, [items, sourceTab, statusFilter, search, sortBy, sortDir]);

  const stats = useMemo(() => ({
    total: items.length,
    tnItems: items.filter(i => i.source === 'tiendanube').length,
    r5Items: items.filter(i => i.source === 'local').length,
    apesItems: items.filter(i => i.source === 'other_store').length,
    totalStock: items.reduce((s, i) => s + (i.current_stock || 0), 0),
    lowStock: items.filter(i => i.current_stock > 0 && i.current_stock <= (i.min_stock || 5)).length,
    outOfStock: items.filter(i => i.current_stock === 0).length,
  }), [items]);

  const recentMovements = movements.slice(0, 20);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #10B981, #0EA5E9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Warehouse size={28} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--on-surface)' }}>Centro de Logística</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--on-surface-variant)' }}>Inventario unificado · Taller y almacén</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={syncTN} disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', color: 'var(--on-surface)', border: '1px solid var(--border-subtle)', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            {syncing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
            {syncing ? 'Sincronizando...' : 'Sync TiendaNueve'}
          </button>
          <button onClick={() => setAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.primary, color: 'var(--on-surface)', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
            <Plus size={14} /> Agregar producto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Total productos', value: stats.total, color: C.primary, icon: Package },
          { label: 'TiendaNueve', value: stats.tnItems, color: C.info, icon: Tag },
          { label: 'R5', value: stats.r5Items, color: C.purple, icon: MapPin },
          { label: 'APES', value: stats.apesItems, color: C.warning, icon: Layers },
          { label: 'Stock total', value: stats.totalStock, color: C.success, icon: Box },
          { label: 'Stock bajo', value: stats.lowStock, color: C.warning, icon: AlertTriangle },
          { label: 'Sin stock', value: stats.outOfStock, color: C.danger, icon: XCircle },
        ].map((s, i) => (
          <div key={i} style={{ padding: 16, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--on-surface)' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content: Inventory + Movements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
        {/* Left: Inventory */}
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Search + View */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} color="var(--on-surface-variant)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU, color..."
                  style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', paddingLeft: 36, paddingRight: 12, fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', background: 'var(--surface-container)', borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                {[{ id: 'grid', icon: Package }, { id: 'list', icon: Layers }].map(v => (
                  <button key={v.id} onClick={() => setView(v.id)} style={{ width: 36, height: 36, border: 'none', background: view === v.id ? `${C.primary}22` : 'transparent', color: view === v.id ? C.primary : 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <v.icon size={16} />
                  </button>
                ))}
              </div>
            </div>
            {/* Source Tabs + Status Filter */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SOURCE_TABS.map(t => (
                <button key={t.id} onClick={() => setSourceTab(t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, border: sourceTab === t.id ? `1px solid ${C.primary}` : '1px solid var(--border-subtle)', background: sourceTab === t.id ? `${C.primary}15` : 'transparent', color: sourceTab === t.id ? C.primary : 'var(--on-surface-variant)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                {[{ id: 'all', label: 'Todos' }, { id: 'low', label: 'Bajo' }, { id: 'out', label: 'Agotado' }].map(f => (
                  <button key={f.id} onClick={() => setStatusFilter(f.id)}
                    style={{ padding: '5px 10px', borderRadius: 6, border: statusFilter === f.id ? `1px solid ${C.warning}` : '1px solid var(--border-subtle)', background: statusFilter === f.id ? `${C.warning}15` : 'transparent', color: statusFilter === f.id ? C.warning : 'var(--on-surface-variant)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid/List */}
          <div style={{ padding: 16, maxHeight: 'calc(100vh - 480px)', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--on-surface-variant)' }}><Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} /><br />Cargando inventario...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--on-surface-variant)' }}><Package size={40} style={{ opacity: 0.3, marginBottom: 12 }} /><br />No hay productos. Sincronizá TN o agregá uno nuevo.</div>
            ) : view === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {filtered.map(item => (
                  <div key={item.id} onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                    style={{ padding: 14, borderRadius: 12, border: selectedItem?.id === item.id ? `2px solid ${C.primary}` : '1px solid var(--border-subtle)', background: 'var(--surface-container)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={22} color={C.primary} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                          {item.color && <span>{item.color}</span>}
                          {item.color && item.size && <span> · </span>}
                          {item.size && <span>{item.size}</span>}
                          {!item.color && !item.size && <span>{item.sk}</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <StockBadge stock={item.current_stock} min={item.min_stock} />
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: item.source === 'tiendanube' ? 'rgba(14,165,233,0.12)' : 'rgba(139,92,246,0.12)', color: item.source === 'tiendanube' ? C.info : C.purple, fontWeight: 600 }}>
                        {item.source === 'tiendanube' ? 'TN' : item.source === 'local' ? 'R5' : 'APES'}
                      </span>
                    </div>
                    <StockBar current={item.current_stock} min={item.min_stock || 5} />
                    {/* Quick Actions */}
                    {selectedItem?.id === item.id && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        {MOVEMENT_TYPES.slice(0, 4).map(m => (
                          <button key={m.id} onClick={(e) => { e.stopPropagation(); setMovementModal(item); }}
                            style={{ flex: 1, padding: '6px 4px', borderRadius: 6, border: `1px solid ${m.color}33`, background: `${m.color}10`, color: m.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, fontFamily: 'inherit' }}>
                            <m.icon size={13} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 80px', padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span onClick={() => { setSortBy('name'); setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>Producto {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
                  <span style={{ textAlign: 'center' }}>Stock</span>
                  <span style={{ textAlign: 'center' }}>Mín</span>
                  <span>Ubicación</span>
                  <span style={{ textAlign: 'center' }}>Acción</span>
                </div>
                {filtered.map(item => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 80px', padding: '10px 12px', borderRadius: 8, alignItems: 'center', borderBottom: '1px solid var(--surface-container-low)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {item.image_url ? <img src={item.image_url} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} /> : <Package size={16} color="var(--on-surface-variant)" />}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{item.color} {item.size}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}><StockBadge stock={item.current_stock} min={item.min_stock} /></div>
                    <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--on-surface-variant)' }}>{item.min_stock || 5}</div>
                    <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{item.location || '—'}</div>
                    <div style={{ textAlign: 'center' }}>
                      <button onClick={() => setMovementModal(item)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.primary}44`, background: `${C.primary}12`, color: C.primary, cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
                        Mover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Movement Timeline */}
        <div style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color={C.info} /> Movimientos recientes
            </h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {recentMovements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--on-surface-variant)', fontSize: 13 }}>Sin movimientos aún</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentMovements.map(m => {
                  const mt = MOVEMENT_TYPES.find(t => t.id === m.movement_type) || MOVEMENT_TYPES[0];
                  const itemName = m.workshop_inventory?.name || 'Producto';
                  return (
                    <div key={m.id} style={{ padding: 10, borderRadius: 8, background: 'var(--surface-container)', borderLeft: `3px solid ${mt.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <mt.icon size={14} color={mt.color} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: mt.color }}>{mt.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginLeft: 'auto' }}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--on-surface)' }}>{itemName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Clock size={10} color="var(--on-surface-variant)" />
                        <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{new Date(m.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        {m.performed_by_name && <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}> · {m.performed_by_name}</span>}
                      </div>
                      {m.notes && <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 4, fontStyle: 'italic' }}>"{m.notes}"</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {movementModal && <MovementModal item={movementModal} locations={locations} onClose={() => setMovementModal(null)} onConfirm={handleMovement} />}
      {addModal && <AddProductModal locations={locations} onClose={() => setAddModal(false)} onConfirm={handleAddProduct} />}
    </div>
  );
}
