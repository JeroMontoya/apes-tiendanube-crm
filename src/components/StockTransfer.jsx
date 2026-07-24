import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeftRight, Truck, Warehouse, Package, Search, Filter, 
  Calendar, Clock, AlertTriangle, CheckCircle, XCircle, 
  RefreshCw, Plus, Edit3, Save, X, ChevronDown, ChevronRight,
  MapPin, Store, Globe, Zap, Layers, Ruler, Palette, Hash,
  Calendar as CalIcon, User, Flag, ArrowRight, Sparkles,
  Box, ClipboardList, BarChart3, Eye, RotateCcw, Link2,
  ExternalLink, Image as ImageIcon, MoreHorizontal, Bell,
  Download, Upload, ScanLine, CreditCard, Receipt, Printer
} from 'lucide-react';

const MOVEMENT_TYPES = [
  { id: 'receive', label: 'Recepción', icon: '⬇️', color: '#10b981', desc: 'Ingreso de mercadería' },
  { id: 'dispatch', label: 'Despacho', icon: '🚚', color: '#3b82f6', desc: 'Envío a cliente' },
  { id: 'transfer', label: 'Transferencia', icon: '↔️', color: '#8b5cf6', desc: 'Entre ubicaciones' },
  { id: 'production_in', label: 'Producción', icon: '🔄', color: 'var(--primary-container)', desc: 'Ingreso de taller' },
  { id: 'return', label: 'Devolución', icon: '🔄', color: 'var(--primary-container)', desc: 'Cliente devuelve' },
  { id: 'adjustment', label: 'Ajuste', icon: '⚠️', color: '#ef4444', desc: 'Corrección manual' },
];

const LOCATIONS = [
  { id: 'local1', name: 'Local Centro', type: 'physical', address: 'Av. Corrientes 1234, CABA', manager: 'Juan Pérez', phone: '+54 11 4444-1234' },
  { id: 'local2', name: 'Local Shopping', type: 'physical', address: 'Alcorta 2000, Palermo', manager: 'María García', phone: '+54 11 4444-5678' },
  { id: 'web', name: 'Tienda Web', type: 'online', platform: 'TiendaNube', manager: 'Sistema', phone: 'Automático' },
  { id: 'custom', name: 'Personalizados', type: 'custom', description: 'Hechos a medida', manager: 'Taller', phone: 'Interno' },
  { id: 'warehouse', name: 'Depósito Central', type: 'warehouse', address: 'Ruta 8 Km 45', manager: 'Carlos López', phone: '+54 11 4444-9999' },
];

export default function StockTransfer({ 
  inventory = [], 
  locations = LOCATIONS,
  onCreateTransfer,
  onCompleteTransfer,
  onCancelTransfer,
  transfers = [],
  products = [],
  lowStockThreshold = 5 
}) {
  const [activeTab, setActiveTab] = useState('create');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFrom, setFilterFrom] = useState('all');
  const [filterTo, setFilterTo] = useState('all');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromLocation: '',
    toLocation: '',
    items: [],
    notes: '',
    priority: 'normal',
    expectedDate: null,
    reference: '',
  });
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [loading, setLoading] = useState(false);

  // Available products for transfer
  const availableProducts = useMemo(() => {
    const productsMap = {};
    inventory.forEach(item => {
      if (item.currentStock > 0 && item.location !== 'custom') {
        const key = `${item.productId}-${item.location}`;
        if (!productsMap[key] || productsMap[key].currentStock < item.currentStock) {
          productsMap[key] = item;
        }
      }
    });
    return Object.values(productsMap);
  }, [inventory]);

  // Group transfers by status
  const groupedTransfers = useMemo(() => {
    const groups = { pending: [], in_transit: [], completed: [], cancelled: [] };
    transfers.forEach(t => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    return groups;
  }, [transfers]);

  // Filter transfers
  const filteredTransfers = useMemo(() => {
    let result = groupedTransfers[activeTab] || [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => 
        t.reference?.toLowerCase().includes(q) ||
        t.items?.some(i => i.name?.toLowerCase().includes(q)) ||
        t.fromLocationName?.toLowerCase().includes(q) ||
        t.toLocationName?.toLowerCase().includes(q)
      );
    }
    if (filterFrom !== 'all') result = result.filter(t => t.fromLocation === filterFrom);
    if (filterTo !== 'all') result = result.filter(t => t.toLocation === filterTo);
    return result;
  }, [groupedTransfers, activeTab, search, filterFrom, filterTo]);

  const stats = useMemo(() => ({
    pending: groupedTransfers.pending?.length || 0,
    in_transit: groupedTransfers.in_transit?.length || 0,
    completed: groupedTransfers.completed?.length || 0,
    totalItems: transfers.reduce((s, t) => s + (t.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0),
  }), [groupedTransfers, transfers]);

  const handleAddItem = () => setShowProductPicker(true);

  const handleRemoveItem = (index) => {
    setTransferForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setTransferForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const handleProductSelect = (product) => {
    if (transferForm.items.some(i => i.productId === product.id && i.fromLocation === transferForm.fromLocation)) {
      alert('Este producto ya está en la transferencia desde esta ubicación');
      return;
    }
    setTransferForm(prev => ({
      ...prev,
      items: [...prev.items, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        color: product.color,
        size: product.size,
        fromLocation: prev.fromLocation,
        maxQuantity: product.currentStock,
        quantity: 1,
        unitCost: product.unitCost,
      }],
    }));
    setShowProductPicker(false);
  };

  const generateReference = () => {
    const now = new Date();
    return `TRF-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transferForm.fromLocation || !transferForm.toLocation || transferForm.fromLocation === transferForm.toLocation) {
      alert('Selecciona ubicaciones de origen y destino diferentes');
      return;
    }
    if (transferForm.items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }
    if (transferForm.items.some(i => i.quantity <= 0)) {
      alert('Las cantidades deben ser mayores a 0');
      return;
    }

    setLoading(true);
    try {
      const newTransfer = {
        id: `trf-${Date.now()}`,
        reference: transferForm.reference || generateReference(),
        fromLocation: transferForm.fromLocation,
        toLocation: transferForm.toLocation,
        items: transferForm.items.map(i => ({
          productId: i.productId,
          name: i.productName,
          sku: i.sku,
          color: i.color,
          size: i.size,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })),
        notes: transferForm.notes,
        priority: transferForm.priority,
        expectedDate: transferForm.expectedDate,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: 'Usuario Actual',
        fromLocationName: LOCATIONS.find(l => l.id === transferForm.fromLocation)?.name,
        toLocationName: LOCATIONS.find(l => l.id === transferForm.toLocation)?.name,
      };

      if (editingTransfer) {
        // Update existing
        await onCreateTransfer({ ...newTransfer, id: editingTransfer.id });
      } else {
        await onCreateTransfer(newTransfer);
      }
      resetForm();
    } catch (error) {
      console.error('Error creating transfer:', error);
      alert('Error al crear la transferencia');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTransferForm({
      fromLocation: '',
      toLocation: '',
      items: [],
      notes: '',
      priority: 'normal',
      expectedDate: null,
      reference: '',
    });
    setEditingTransfer(null);
    setActiveTab('list');
  };

  const handleCompleteTransfer = async (transfer) => {
    if (confirm(`Marcar "${transfer.reference}" como completada?`)) {
      await onCompleteTransfer(transfer.id);
    }
  };

  const handleCancelTransfer = async (transfer) => {
    if (confirm(`Cancelar "${transfer.reference}"?`)) {
      await onCancelTransfer(transfer.id);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: '800', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(139,92,246,0.3)' }}>
              <ArrowLeftRight size={26} color="#fff" />
            </div>
            Centro de Transferencias
          </h1>
          <p style={{ margin: '0', fontSize: '14px', color: 'var(--on-surface-variant)' }}>
            Movimientos entre locales, depósito y tienda online
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={14} /> Exportar
          </button>
          <button onClick={() => { setActiveTab('create'); setShowProductPicker(false); resetForm(); }} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: 'var(--on-surface)', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={14} /> Nueva Transferencia
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <StatCard label="Pendientes" value={stats.pending} color='#8b5cf6' icon={<Package size={18} />} />
        <StatCard label="En Tránsito" value={stats.in_transit} color='#3b82f6' icon={<Truck size={18} />} />
        <StatCard label="Completadas" value={stats.completed} color='#10b981' icon={<CheckCircle size={18} />} />
        <StatCard label="Total Items" value={stats.totalItems} color='var(--primary-container)' icon={<Package size={18} />} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', padding: '4px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
        {[
          { key: 'pending', label: 'Pendientes', count: stats.pending, icon: <Package size={14} /> },
          { key: 'in_transit', label: 'En Tránsito', count: stats.in_transit, icon: <Truck size={14} /> },
          { key: 'completed', label: 'Completadas', count: stats.completed, icon: <CheckCircle size={14} /> },
          { key: 'create', label: 'Nueva', count: null, icon: <Plus size={14} /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); if (t.key !== 'create') setEditingTransfer(null); }}
            style={{
              flex: t.key === 'create' ? 'none' : 1,
              padding: t.key === 'create' ? '10px 18px' : '12px 16px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === t.key ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'transparent',
              color: activeTab === t.key ? '#fff' : 'var(--on-surface-variant)',
              fontWeight: activeTab === t.key ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === t.key ? '0 2px 8px rgba(139,92,246,0.3)' : 'none',
            }}
          >
            {t.icon}
            {t.label}
            {t.count !== null && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '8px', background: activeTab === t.key ? 'rgba(255,255,255,0.2)' : 'var(--surface)', fontFamily: "'JetBrains Mono', monospace" }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Transfer List / Create Form */}
      {activeTab === 'create' ? (
        <TransferForm 
          form={transferForm}
          locations={LOCATIONS}
          availableProducts={availableProducts}
          onFormChange={setTransferForm}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onItemChange={handleItemChange}
          onProductSelect={handleProductSelect}
          showProductPicker={showProductPicker}
          setShowProductPicker={setShowProductPicker}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          loading={loading}
          editingTransfer={editingTransfer}
          generatingRef={generateReference}
        />
      ) : (
        <TransferList
          transfers={filteredTransfers}
          activeTab={activeTab}
          locations={LOCATIONS}
          onComplete={handleCompleteTransfer}
          onCancel={handleCancelTransfer}
          onEdit={(t) => { setEditingTransfer(t); setTransferForm({ fromLocation: t.fromLocation, toLocation: t.toLocation, items: t.items.map(i => ({ ...i, maxQuantity: 999 })), notes: t.notes, priority: t.priority, expectedDate: t.expectedDate, reference: t.reference }); setActiveTab('create'); }}
          search={search}
          setSearch={setSearch}
          filterFrom={filterFrom}
          setFilterFrom={setFilterFrom}
          filterTo={filterTo}
          setFilterTo={setFilterTo}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />
      )}

      {/* Product Picker Modal */}
      {showProductPicker && (
        <ProductPickerModal
          products={availableProducts}
          fromLocation={transferForm.fromLocation}
          onSelect={handleProductSelect}
          onClose={() => setShowProductPicker(false)}
        />
      )}
    </div>
  );
}

// ═══ StatCard ═══
function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--on-surface)' }}>{typeof value === 'number' ? value.toLocaleString('es-CO') : value}</div>
        <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
      </div>
    </div>
  );
}

// ═══ TransferForm ═══
function TransferForm({ form, locations, availableProducts, onFormChange, onAddItem, onRemoveItem, onItemChange, onProductSelect, showProductPicker, setShowProductPicker, onSubmit, onCancel, loading, editingTransfer, generatingRef }) {
  return (
    <form onSubmit={onSubmit} style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeftRight size={20} color="#8b5cf6" />
          {editingTransfer ? 'Editar Transferencia' : 'Nueva Transferencia'}
        </h2>
        <button type="button" onClick={onCancel} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>Cancelar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block' }}>Ubicación Origen *</label>
          <select value={form.fromLocation} onChange={e => onFormChange({ ...form, fromLocation: e.target.value })} style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 8px', fontFamily: 'inherit', fontSize: '13px' }}>
            <option value="">Seleccionar origen...</option>
            {locations.filter(l => l.type !== 'custom').map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.type === 'physical' ? '🏪' : l.type === 'online' ? '🌐' : '📦'})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block' }}>Ubicación Destino *</label>
          <select value={form.toLocation} onChange={e => onFormChange({ ...form, toLocation: e.target.value })} style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 8px', fontFamily: 'inherit', fontSize: '13px' }}>
            <option value="">Seleccionar destino...</option>
            {locations.filter(l => l.type !== 'custom').map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.type === 'physical' ? '🏪' : l.type === 'online' ? '🌐' : '📦'})</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block' }}>Referencia</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={form.reference} onChange={e => onFormChange({ ...form, reference: e.target.value })} placeholder={form.reference || generatingRef()} style={{ flex: 1, height: '38px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 12px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', fontFamily: 'inherit', fontWeight: '600', fontFamily: "'JetBrains Mono', monospace" }} />
          <button type="button" onClick={() => onFormChange({ ...form, reference: generatingRef() })} style={{ padding: '0 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>Generar</button>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: 0 }}>Productos a Transferir</label>
          <button type="button" onClick={onAddItem} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Agregar Producto
          </button>
        </div>

        {form.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--on-surface-variant)', border: '2px dashed var(--border-subtle)', borderRadius: '12px', background: 'var(--surface-container-low)' }}>
            <Package size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600' }}>No hay productos agregados</p>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>Haz clic en "Agregar Producto" para comenzar</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {form.items.map((item, index) => (
              <div key={index} style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-container)', border: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '4px', display: 'block' }}>Producto</label>
                  <select value={item.productId} onChange={e => onItemChange(index, 'productId', e.target.value)} style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', padding: '0 10px', fontFamily: 'inherit', fontSize: '12px' }}>
                    <option value="">Buscar producto...</option>
                    {/* Products would be passed in real implementation */}
                  </select>
                </div>
                <div style={{ width: '100px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '4px', display: 'block' }}>Cantidad</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button type="button" onClick={() => onItemChange(index, 'quantity', Math.max(1, (item.quantity || 1) - 1))} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: 'pointer', fontSize: '16px', fontWeight: '700' }}>-</button>
                    <input type="number" value={item.quantity || 1} onChange={e => onItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} min="1" style={{ flex: 1, height: '36px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', textAlign: 'center', fontSize: '14px', fontWeight: '700', outline: 'none', fontFamily: 'inherit' }} />
                    <button type="button" onClick={() => onItemChange(index, 'quantity', (item.quantity || 1) + 1)} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', cursor: 'pointer', fontSize: '16px', fontWeight: '700' }}>+</button>
                  </div>
                </div>
                <div style={{ width: '120px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '4px', display: 'block' }}>Stock Máx.</label>
                  <input type="number" value={item.maxQuantity || 999} onChange={e => onItemChange(index, 'maxQuantity', parseInt(e.target.value) || 999)} readOnly style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface-variant)', textAlign: 'center', fontSize: '12px', fontWeight: '600', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ width: '100px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '4px', display: 'block' }}>Costo Unit.</label>
                  <input type="number" step="0.01" value={item.unitCost || 0} onChange={e => onItemChange(index, 'unitCost', parseFloat(e.target.value) || 0)} style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', padding: '0 10px', fontFamily: 'inherit', fontSize: '12px', outline: 'none', fontWeight: '600' }} />
                </div>
                <button type="button" onClick={() => onRemoveItem(index)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700' }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block' }}>Prioridad</label>
          <select value={form.priority} onChange={e => onFormChange({ ...form, priority: e.target.value })} style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 8px', fontFamily: 'inherit', fontSize: '13px' }}>
            <option value="baja">Baja</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block' }}>Fecha Estimada de Llegada</label>
          <input type="date" value={form.expectedDate} onChange={e => onFormChange({ ...form, expectedDate: e.target.value })} style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '0 10px', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block' }}>Notas (opcional)</label>
        <textarea value={form.notes} onChange={e => onFormChange({ ...form, notes: e.target.value })} rows={2} placeholder="Ej: Lote #123, solicitud urgente..."
          style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', padding: '8px 12px', resize: 'none', fontFamily: 'inherit', fontSize: '13px', outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
        <button type="button" onClick={onCancel} style={{ padding: '12px 24px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
        <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '44px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', color: 'var(--on-surface)', fontSize: '14px', fontWeight: '700', cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? <span style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : 'Guardar Transferencia'}
        </button>
      </div>
    </form>
  );
}

// ═══ TransferList ═══
function TransferList({ transfers, activeTab, locations, onComplete, onCancel, onEdit, search, setSearch, filterFrom, setFilterFrom, filterTo, setFilterTo, filterStatus, setFilterStatus }) {
  const statusColors = { pending: '#8b5cf6', in_transit: '#3b82f6', completed: '#10b981', cancelled: '#ef4444' };
  const statusLabels = { pending: 'Pendiente', in_transit: 'En Tránsito', completed: 'Completada', cancelled: 'Cancelada' };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      {/* Filters */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <Search size={16} color="var(--on-surface-variant)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por referencia, producto, ubicación..." style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', paddingLeft: '36px', paddingRight: '12px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={selectStyle}>
            <option value="all">Todos los orígenes</option>
            {LOCATIONS.filter(l => l.type !== 'custom').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={filterTo} onChange={e => setFilterTo(e.target.value)} style={selectStyle}>
            <option value="all">Todos los destinos</option>
            {LOCATIONS.filter(l => l.type !== 'custom').map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="in_transit">En Tránsito</option>
            <option value="completed">Completada</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {transfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--on-surface-variant)' }}>
            <Package size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600' }}>No hay transferencias {statusLabels[activeTab]?.toLowerCase()}</p>
            <p style={{ margin: '0', fontSize: '13px', opacity: 0.7 }}>Las transferencias {statusLabels[activeTab]?.toLowerCase()} aparecerán aquí</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {transfers.map((transfer, idx) => (
              <div key={transfer.id} style={{ borderBottom: '1px solid var(--border-subtle)', animation: `fadeIn 0.2s ease ${idx * 0.02}s both` }}>
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '80px 1fr 1fr 120px 100px 80px', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', background: `${statusColors[transfer.status]}20`, color: statusColors[transfer.status], fontFamily: "'JetBrains Mono', monospace" }}>{transfer.reference}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {transfer.items.length === 1 ? transfer.items[0].name : `${transfer.items.length} productos`}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span>{transfer.items.reduce((s, i) => s + i.quantity, 0)} unidades</span>
                      {transfer.priority !== 'normal' && <span style={{ fontSize: '9px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', background: `${statusColors[transfer.priority] || '#8b5cf6'}20`, color: statusColors[transfer.priority] || '#8b5cf6', textTransform: 'uppercase' }}>{transfer.priority}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--on-surface-variant)' }}>
                      <MapPin size={12} /> {transfer.fromLocationName}
                    </span>
                    <ArrowLeftRight size={14} color="var(--on-surface-variant)" style={{ opacity: 0.5 }} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--on-surface)' }}>
                      <MapPin size={12} /> {transfer.toLocationName}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                    {transfer.expectedDate ? new Date(transfer.expectedDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : 'Sin fecha'}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: `${statusColors[transfer.status]}20`, color: statusColors[transfer.status], textTransform: 'uppercase' }}>{statusLabels[transfer.status]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <button onClick={() => onEdit(transfer)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar"><Edit3 size={14} /></button>
                    {transfer.status === 'pending' && (
                      <>
                        <button onClick={() => onComplete(transfer)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Marcar completada"><CheckCircle size={14} /></button>
                        <button onClick={() => onCancel(transfer)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cancelar"><XCircle size={14} /></button>
                      </>
                    )}
                  </div>
                </div>
                {/* Items detail */}
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-container-low)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 80px 80px 1fr 100px', padding: '8px 0', fontSize: '10px', fontWeight: '700', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <span></span><span>Producto</span><span>Color</span><span>Talla</span><span>Cantidad</span><span>Costo</span>
                  </div>
                  {transfer.items.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 80px 80px 1fr 100px', padding: '8px 0', alignItems: 'center', fontSize: '12px', borderBottom: i < transfer.items.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div>{item.sku && <span style={{ fontSize: '9px', color: 'var(--on-surface-variant)', fontFamily: "'JetBrains Mono', monospace" }}>{item.sku}</span>}</div>
                      <div style={{ fontWeight: '600', color: 'var(--on-surface)' }}>{item.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{item.color && <span style={{ fontWeight: '600' }}>{item.color}</span>}</div>
                      <div style={{ fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: 'var(--on-surface)' }}>{item.size || '—'}</div>
                      <div style={{ fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: statusColors[transfer.status] }}>×{item.quantity}</div>
                      <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', fontFamily: "'JetBrains Mono', monospace" }}>{item.unitCost ? formatCurrency(item.unitCost * item.quantity) : '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ ProductPickerModal ═══
function ProductPickerModal({ products, fromLocation, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const filtered = products
    .filter(p => p.location === fromLocation && p.currentStock > 0)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 50);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <div style={{ width: '600px', maxHeight: '85vh', overflow: 'auto', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--glass-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={18} color="#fff" /></div>
            <div><h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700', color: 'var(--on-surface)' }}>Seleccionar Producto</h3><p style={{ margin: 0, fontSize: '11px', color: 'var(--on-surface-variant)' }}>Ubicación: {LOCATIONS.find(l => l.id === fromLocation)?.name}</p></div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '0 24px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--on-surface-variant)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU, color..." style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', paddingLeft: '36px', paddingRight: '12px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', maxHeight: '50vh', overflowY: 'auto' }}>
          {products.filter(p => p.location === fromLocation && p.currentStock > 0).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--on-surface-variant)' }}><Package size={36} style={{ opacity: 0.2, marginBottom: '12px' }} /><p>No hay productos con stock en esta ubicación</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {products.filter(p => p.location === fromLocation && p.currentStock > 0).slice(0, 100).map(item => (
                <button key={item.id} onClick={() => onSelect(item)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'inherit', fontSize: '13px' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {item.image ? <img src={item.image} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} /> : <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={18} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} /></div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {item.color && <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '2px', background: getColorHex(item.color) || '#888' }} /> {item.color}</span>}
                      {item.size && <span>{item.size}</span>}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--on-surface-variant)' }}>{item.sku}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: '#10b981' }}>{item.currentStock} und.</div>
                    <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Disponibles</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ Helpers ═══
function getColorHex(name) {
  const map = { negro: '#1a1a2e', black: '#1a1a2e', azul: '#3b82f6', blue: '#3b82f6', rojo: '#ef4444', red: '#ef4444', blanco: '#f1f5f9', white: '#f1f5f9', verde: '#10b981', green: '#10b981', amarillo: 'var(--primary-container)', yellow: 'var(--primary-container)', rosa: '#ec4899', pink: '#ec4899', morado: '#8b5cf6', purple: '#8b5cf6', gris: '#64748b', gray: '#64748b', grey: '#64748b', naranja: '#f97316', orange: '#f97316' };
  return map[name?.toLowerCase().trim()] || null;
}

const selectStyle = { padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', minWidth: '160px' };

const LOCATIONS = [
  { id: 'local1', name: 'Local Centro', type: 'physical' },
  { id: 'local2', name: 'Local Shopping', type: 'physical' },
  { id: 'web', name: 'Tienda Web', type: 'online' },
  { id: 'warehouse', name: 'Depósito Central', type: 'warehouse' },
];

export { StockTransfer };
