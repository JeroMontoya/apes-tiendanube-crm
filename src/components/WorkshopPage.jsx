import React, { useState, useMemo, useEffect } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { supabase } from '../lib/supabase';
import { TiendanubeAPI } from '../utils/tiendanubeAPI';
import InventoryPage from './InventoryPage';
import {
  Hammer, Plus, Search, RefreshCw, Package, Scissors, Shirt, Printer,
  CheckCircle, Truck, Clock, AlertTriangle, X, ChevronDown, ChevronRight,
  Layers, Ruler, Palette, Hash, Calendar, User, Flag, ArrowRight, Sparkles,
  Box, ClipboardList, BarChart3, Eye, Edit3, Trash2, Save, RotateCcw,
  Link2, ExternalLink, Image as ImageIcon
} from 'lucide-react';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

const CATEGORIES = [
  { value: 'camiseta', label: 'Camiseta', icon: Shirt },
  { value: 'buzo', label: 'Buzo', icon: Package },
  { value: 'pants', label: 'Pants', icon: Box },
  { value: 'gorra', label: 'Gorra', icon: Cap },
  { value: 'short', label: 'Short', icon: Package },
  { value: 'chaqueta', label: 'Chaqueta', icon: Package },
  { value: 'otro', label: 'Otro', icon: Package },
];

const MATERIALS_TYPES = [
  { value: 'algodon', label: 'Algodón' },
  { value: 'poliéster', label: 'Poliéster' },
  { value: 'licra', label: 'Licra' },
  { value: 'mezclilla', label: 'Mezclilla' },
  { value: 'cuero', label: 'Cuero' },
  { value: 'tela_fria', label: 'Tela Fría' },
  { value: 'otro', label: 'Otro' },
];

const STATUS_FLOW = [
  { key: 'pending', label: 'Pendiente', icon: ClipboardList, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  { key: 'cutting', label: 'Corte', icon: Scissors, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { key: 'sewing', label: 'Costura', icon: Shirt, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  { key: 'printing', label: 'Estampado', icon: Printer, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { key: 'quality', label: 'Control', icon: CheckCircle, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { key: 'ready', label: 'Listo', icon: Sparkles, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { key: 'shipped', label: 'Despachado', icon: Truck, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
];

const PRIORITY_MAP = {
  urgente: { label: 'Urgente', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  alta: { label: 'Alta', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  normal: { label: 'Normal', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  baja: { label: 'Baja', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

function Cap(props) { return <Package {...props} />; }

function generateBatchCode() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `LOT-${d.getFullYear()}${mm}${dd}-${rand}`;
}

export default function WorkshopPage({ products, onRefresh, isRefreshing, onUpdateStock, onRefreshStock, storeId, session }) {
  const { currentMember, logActivity, ROLE_COLORS } = useTeam();
  const [activeTab, setActiveTab] = useState('production');
  const [batches, setBatches] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [showNewMaterial, setShowNewMaterial] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  // ── Load data ──────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [batchesRes, materialsRes] = await Promise.all([
      supabase.from('production_batches').select('*').order('created_at', { ascending: false }),
      supabase.from('materials').select('*').eq('is_active', true).order('name'),
    ]);
    if (!batchesRes.error && batchesRes.data) {
      const withSizes = await Promise.all(batchesRes.data.map(async (b) => {
        const { data: sizes } = await supabase.from('batch_sizes').select('*').eq('batch_id', b.id);
        return { ...b, sizes: sizes || [] };
      }));
      setBatches(withSizes);
    }
    if (!materialsRes.error && materialsRes.data) setMaterials(materialsRes.data);
    setLoading(false);
  };

  const getAPI = async () => {
    if (!storeId) return null;
    // Try system_config first (shared), then fall back to user workspace
    const { data: sysConfig } = await supabase.from('system_config').select('tiendanube_access_token').eq('id', 'main').single();
    const token = sysConfig?.tiendanube_access_token;
    if (token) return new TiendanubeAPI(storeId, token);
    // Fallback to user workspace
    if (!session) return null;
    const { data } = await supabase.from('workspaces').select('tiendanube_access_token').eq('user_id', session.user.id).single();
    if (!data?.tiendanube_access_token) return null;
    return new TiendanubeAPI(storeId, data.tiendanube_access_token);
  };

  // ── Create batch ───────────────────────────────────────
  const createBatch = async (batchData) => {
    const batchCode = generateBatchCode();
    console.log('[Workshop] Creating batch:', batchCode, 'product:', batchData.tiendanubeProductName, 'variants:', batchData.batchVariants);
    const { data: batch, error } = await supabase.from('production_batches').insert({
      batch_code: batchCode,
      product_name: batchData.productName,
      product_description: batchData.description,
      category: batchData.category,
      material: batchData.material,
      color: batchData.color,
      color_hex: batchData.colorHex,
      status: 'pending',
      priority: batchData.priority,
      due_date: batchData.dueDate || null,
      notes: batchData.notes,
      total_quantity: batchData.sizes.reduce((sum, s) => sum + s.quantity, 0),
      assigned_to: currentMember?.id || null,
      created_by: currentMember?.id || null,
      tiendanube_product_id: batchData.tiendanubeProductId || null,
      tiendanube_product_name: batchData.tiendanubeProductName || null,
      tiendanube_product_image: batchData.tiendanubeProductImage || null,
      batch_variants: batchData.batchVariants || null,
    }).select().single();

    if (error) { console.error('[Workshop] Batch insert error:', error); return; }
    console.log('[Workshop] Batch created:', batch.id, 'tiendanube_product_id:', batch.tiendanube_product_id, 'batch_variants:', batch.batch_variants);

    const sizeInserts = batchData.sizes.filter(s => s.quantity > 0).map(s => ({
      batch_id: batch.id,
      size: s.size,
      quantity: s.quantity,
      produced: 0,
      defect: 0,
    }));
    if (sizeInserts.length > 0) {
      await supabase.from('batch_sizes').insert(sizeInserts);
    }

    await logActivity('batch_created', 'production_batch', batch.id, batchData.productName, {
      code: batchCode, total: batchData.sizes.reduce((sum, s) => sum + s.quantity, 0), material: batchData.material,
    });

    setShowNewBatch(false);
    await loadData();
  };

  // ── Update batch status ────────────────────────────────
  const updateBatchStatus = async (batchId, newStatus) => {
    const batch = batches.find(b => b.id === batchId);
    const updates = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'cutting' && !batch.started_at) updates.started_at = new Date().toISOString();
    if (newStatus === 'ready' || newStatus === 'shipped') updates.completed_at = new Date().toISOString();

    await supabase.from('production_batches').update(updates).eq('id', batchId);
    await logActivity('batch_status_changed', 'production_batch', batchId, batch?.product_name, { from: batch?.status, to: newStatus });

    // ── Sync Tiendanube stock when batch reaches "ready" ──
    console.log('[Workshop] Status changed to:', newStatus, '| batch.tiendanube_product_id:', batch?.tiendanube_product_id, '| batch.batch_variants:', batch?.batch_variants);
    if (newStatus === 'ready' && batch?.tiendanube_product_id && batch?.batch_variants) {
      try {
        const api = await getAPI();
        if (!api) { console.warn('[Workshop] No API token for Tiendanube sync'); await loadData(); return; }
        const variants = typeof batch.batch_variants === 'string' ? JSON.parse(batch.batch_variants) : batch.batch_variants;
        console.log('[Workshop] Syncing', variants.length, 'variants to Tiendanube...');
        const results = [];
        for (const v of variants) {
          console.log('[Workshop] Variant:', v.variant_id, 'quantity:', v.quantity, 'current_stock:', v.current_stock);
          if (v.variant_id && v.quantity > 0) {
            // Get current stock from Tiendanube
            const currentStock = v.current_stock ?? 0;
            const newStock = currentStock + v.quantity;
            const res = await api.updateVariantStock(batch.tiendanube_product_id, v.variant_id, newStock);
            console.log('[Workshop] API result for variant', v.variant_id, ':', res);
            results.push({ variant_id: v.variant_id, ok: res?.success !== false });
          }
        }
        const synced = results.filter(r => r.ok).length;
        console.log(`[Workshop] Synced ${synced}/${variants.length} variants to Tiendanube`);
        await logActivity('batch_synced_tiendanube', 'production_batch', batchId, batch?.product_name, {
          synced, total: variants.length, product_id: batch.tiendanube_product_id,
        });
      } catch (err) {
        console.error('[Workshop] Tiendanube sync error:', err);
      }
    }

    await loadData();
  };

  // ── Update size produced ───────────────────────────────
  const updateSizeProduced = async (sizeId, produced, defect = 0) => {
    await supabase.from('batch_sizes').update({ produced, defect }).eq('id', sizeId);
    await loadData();
  };

  // ── Create material ────────────────────────────────────
  const createMaterial = async (data) => {
    await supabase.from('materials').insert({
      name: data.name, category: data.category, color: data.color,
      unit: data.unit, stock_quantity: data.stock, min_stock: data.minStock,
      cost_per_unit: data.cost, supplier: data.supplier,
      created_by: currentMember?.id || null,
    });
    await logActivity('material_created', 'material', null, data.name, { category: data.category });
    setShowNewMaterial(false);
    await loadData();
  };

  // ── Update material stock ──────────────────────────────
  const updateMaterialStock = async (materialId, newQty) => {
    const mat = materials.find(m => m.id === materialId);
    await supabase.from('materials').update({ stock_quantity: newQty }).eq('id', materialId);
    await supabase.from('material_usage_log').insert({
      material_id: materialId, material_name: mat?.name,
      change_type: 'adjusted', quantity: newQty - (mat?.stock_quantity || 0),
      previous_stock: mat?.stock_quantity, new_stock: newQty,
      created_by: currentMember?.id || null,
    });
    await loadData();
  };

  // ── Delete batch ───────────────────────────────────────
  const deleteBatch = async (batchId) => {
    if (!confirm('¿Eliminar este lote?')) return;
    const batch = batches.find(b => b.id === batchId);
    await supabase.from('batch_sizes').delete().eq('batch_id', batchId);
    await supabase.from('batch_materials').delete().eq('batch_id', batchId);
    await supabase.from('production_batches').delete().eq('id', batchId);
    await logActivity('batch_deleted', 'production_batch', batchId, batch?.product_name);
    setSelectedBatch(null);
    await loadData();
  };

  // ── Filtered batches ───────────────────────────────────
  const filteredBatches = useMemo(() => {
    let list = batches;
    if (filterStatus !== 'all') list = list.filter(b => b.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(b => b.product_name?.toLowerCase().includes(q) || b.batch_code?.toLowerCase().includes(q));
    }
    return list;
  }, [batches, filterStatus, search]);

  const stats = useMemo(() => {
    const total = batches.length;
    const active = batches.filter(b => !['ready', 'shipped'].includes(b.status)).length;
    const completed = batches.filter(b => b.status === 'ready' || b.status === 'shipped').length;
    const urgent = batches.filter(b => b.priority === 'urgente' && !['ready', 'shipped'].includes(b.status)).length;
    const totalUnits = batches.reduce((sum, b) => sum + (b.total_quantity || 0), 0);
    const lowMaterials = materials.filter(m => m.stock_quantity <= m.min_stock).length;
    return { total, active, completed, urgent, totalUnits, lowMaterials };
  }, [batches, materials]);

  const tabs = [
    { key: 'production', label: 'Producción', icon: Hammer, count: stats.active },
    { key: 'materials', label: 'Materiales', icon: Layers, count: materials.length },
    { key: 'stock', label: 'Inventario Tienda', icon: Package, count: products?.length || 0 },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            }}>
              <Hammer size={22} color="#fff" />
            </div>
            Centro de Producción
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--on-surface-variant)' }}>
            Control total de talla · stock · materiales · producción
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onRefresh} disabled={isRefreshing} style={{
            padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)',
            cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            Sync Tiendanube
          </button>
          {activeTab === 'production' && (
            <button onClick={() => setShowNewBatch(true)} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            }}>
              <Plus size={16} /> Nuevo Lote
            </button>
          )}
          {activeTab === 'materials' && (
            <button onClick={() => setShowNewMaterial(true)} style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
            }}>
              <Plus size={16} /> Nuevo Material
            </button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Lotes Activos', value: stats.active, color: '#f59e0b', icon: Hammer },
          { label: 'Completados', value: stats.completed, color: '#10b981', icon: CheckCircle },
          { label: 'Urgentes', value: stats.urgent, color: '#ef4444', icon: Flag },
          { label: 'Unidades Totales', value: stats.totalUnits, color: '#3b82f6', icon: Hash },
          { label: 'Materiales', value: materials.length, color: '#8b5cf6', icon: Layers },
          { label: 'Stock Bajo', value: stats.lowMaterials, color: '#06b6d4', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--glass-border)',
            borderLeft: `3px solid ${s.color}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <s.icon size={13} color={s.color} />
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
        {tabs.map(t => {
          const isActive = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none',
              background: isActive ? 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))' : 'transparent',
              color: isActive ? 'var(--on-surface)' : 'var(--on-surface-variant)',
              fontWeight: isActive ? 700 : 500, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
            }}>
              <t.icon size={16} />
              {t.label}
              {t.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════ PRODUCTION TAB ═══════ */}
      {activeTab === 'production' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar lote o producto..."
                style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[{ key: 'all', label: 'Todos' }, ...STATUS_FLOW.map(s => ({ key: s.key, label: s.label }))].map(f => (
                <button key={f.key} onClick={() => setFilterStatus(f.key)} style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none',
                  background: filterStatus === f.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: filterStatus === f.key ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Cards */}
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--on-surface-variant)' }}>Cargando lotes...</div>
          ) : filteredBatches.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <Package size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>No hay lotes de producción</p>
              <p style={{ fontSize: 12, opacity: 0.6 }}>Creá un nuevo lote para comenzar</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredBatches.map((batch, idx) => {
                const statusInfo = STATUS_FLOW.find(s => s.key === batch.status) || STATUS_FLOW[0];
                const priorityInfo = PRIORITY_MAP[batch.priority] || PRIORITY_MAP.normal;
                const StatusIcon = statusInfo.icon;
                const producedTotal = (batch.sizes || []).reduce((sum, s) => sum + (s.produced || 0), 0);
                const defectTotal = (batch.sizes || []).reduce((sum, s) => sum + (s.defect || 0), 0);
                const progress = batch.total_quantity > 0 ? Math.round((producedTotal / batch.total_quantity) * 100) : 0;
                const isSelected = selectedBatch === batch.id;

                return (
                  <div key={batch.id} style={{
                    borderRadius: 14,
                    background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
                    border: `1px solid ${isSelected ? statusInfo.color + '40' : 'var(--glass-border)'}`,
                    overflow: 'hidden', transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 4px 20px ${statusInfo.color}15` : 'none',
                    animation: `slideUp 0.3s ease ${idx * 0.04}s both`,
                  }}>
                    {/* Batch Header */}
                    <div onClick={() => setSelectedBatch(isSelected ? null : batch.id)} style={{
                      padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Product Image / Status Icon */}
                      {batch.tiendanube_product_image ? (
                        <div style={{
                          width: 42, height: 42, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                          border: `1.5px solid ${statusInfo.color}30`, position: 'relative',
                        }}>
                          <img src={batch.tiendanube_product_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', inset: 0, background: `${statusInfo.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <StatusIcon size={14} color={statusInfo.color} />
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          width: 42, height: 42, borderRadius: 11,
                          background: statusInfo.bg, border: `1px solid ${statusInfo.color}20`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <StatusIcon size={18} color={statusInfo.color} />
                        </div>
                      )}

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>{batch.product_name}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: statusInfo.bg, color: statusInfo.color }}>
                            {statusInfo.label}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: priorityInfo.bg, color: priorityInfo.color }}>
                            {priorityInfo.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--on-surface-variant)' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{batch.batch_code}</span>
                          {batch.tiendanube_product_name && (
                            <>
                              <span>·</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#06b6d4' }}>
                                <Link2 size={10} /> {batch.tiendanube_product_name}
                              </span>
                            </>
                          )}
                          <span>·</span>
                          <span>{batch.material} · {batch.color || batch.color_hex || '—'}</span>
                          <span>·</span>
                          <span>{batch.total_quantity} uds</span>
                          {batch.due_date && (
                            <>
                              <span>·</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Calendar size={10} /> {new Date(batch.due_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 100 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: statusInfo.color, fontFamily: "'JetBrains Mono', monospace" }}>
                          {progress}%
                        </div>
                        <div style={{ width: 80, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginLeft: 'auto', marginTop: 4 }}>
                          <div style={{ height: '100%', borderRadius: 2, width: `${progress}%`, background: `linear-gradient(90deg, ${statusInfo.color}, ${statusInfo.color}80)`, transition: 'width 0.3s ease' }} />
                        </div>
                      </div>

                      <ChevronRight size={16} color="var(--on-surface-variant)" style={{ transform: isSelected ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} />
                    </div>

                    {/* ── Expanded Detail ── */}
                    {isSelected && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '20px', animation: 'slideDown 0.25s ease' }}>
                        {/* Status Flow */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
                          {STATUS_FLOW.map((s, i) => {
                            const SIcon = s.icon;
                            const isCurrent = batch.status === s.key;
                            const isPast = STATUS_FLOW.findIndex(x => x.key === batch.status) > i;
                            return (
                              <React.Fragment key={s.key}>
                                <button
                                  onClick={() => updateBatchStatus(batch.id, s.key)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '8px 12px', borderRadius: 10,
                                    background: isCurrent ? s.bg : 'rgba(255,255,255,0.03)',
                                    border: isCurrent ? `1.5px solid ${s.color}` : '1.5px solid transparent',
                                    color: isCurrent ? s.color : isPast ? 'var(--on-surface-variant)' : 'var(--on-surface-variant)',
                                    fontSize: 11, fontWeight: isCurrent ? 700 : 500, cursor: 'pointer',
                                    opacity: isPast ? 0.5 : 1, transition: 'all 0.15s',
                                  }}
                                  onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = s.bg; }}
                                  onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                >
                                  <SIcon size={13} />
                                  {s.label}
                                </button>
                                {i < STATUS_FLOW.length - 1 && (
                                  <div style={{ width: 16, height: 1, background: isPast ? s.color + '40' : 'rgba(255,255,255,0.06)' }} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* Size Breakdown */}
                        <div style={{ marginBottom: 20 }}>
                          <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Ruler size={14} /> Tallas
                          </h4>

                          {/* Tiendanube Variants Info */}
                          {batch.batch_variants && (() => {
                            const variants = typeof batch.batch_variants === 'string' ? JSON.parse(batch.batch_variants) : batch.batch_variants;
                            if (!variants || variants.length === 0) return null;
                            return (
                              <div style={{
                                padding: '12px 14px', borderRadius: 10, marginBottom: 12,
                                background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)',
                              }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Link2 size={12} /> Variantes Tiendanube (stock actual → después de producir)
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {variants.map((v, vi) => {
                                    const currentStock = v.current_stock ?? 0;
                                    const afterStock = currentStock + (v.quantity || 0);
                                    return (
                                      <div key={vi} style={{
                                        padding: '6px 10px', borderRadius: 8,
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                                        fontSize: 11, display: 'flex', alignItems: 'center', gap: 6,
                                      }}>
                                        <span style={{ color: 'var(--on-surface)' }}>{v.color || '—'}</span>
                                        <span style={{ color: 'var(--on-surface-variant)' }}>{v.size || '—'}</span>
                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--on-surface-variant)' }}>
                                          {currentStock} → <span style={{ color: '#10b981', fontWeight: 700 }}>{afterStock}</span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${batch.sizes?.length || 1}, 1fr)`, gap: 8 }}>
                            {(batch.sizes || []).filter(s => s.quantity > 0).map(size => {
                              const sizeProgress = size.quantity > 0 ? Math.round((size.produced / size.quantity) * 100) : 0;
                              const hasDefect = size.defect > 0;
                              return (
                                <div key={size.id} style={{
                                  padding: '14px', borderRadius: 10,
                                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                  textAlign: 'center',
                                }}>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--on-surface)', marginBottom: 4 }}>{size.size}</div>
                                  <div style={{ fontSize: 20, fontWeight: 800, color: statusInfo.color, fontFamily: "'JetBrains Mono', monospace" }}>
                                    {size.produced || 0}<span style={{ fontSize: 12, fontWeight: 500, color: 'var(--on-surface-variant)' }}>/{size.quantity}</span>
                                  </div>
                                  <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', margin: '8px 0' }}>
                                    <div style={{ height: '100%', borderRadius: 2, width: `${sizeProgress}%`, background: hasDefect ? 'linear-gradient(90deg, #10b981, #ef4444)' : `linear-gradient(90deg, ${statusInfo.color}, ${statusInfo.color}80)`, transition: 'width 0.3s' }} />
                                  </div>
                                  {hasDefect && (
                                    <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>⚠ {size.defect} defecto{size.defect !== 1 ? 's' : ''}</div>
                                  )}
                                  <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'center' }}>
                                    <button onClick={() => updateSizeProduced(size.id, Math.min((size.produced || 0) + 1, size.quantity), size.defect)}
                                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      +
                                    </button>
                                    <button onClick={() => updateSizeProduced(size.id, Math.max((size.produced || 0) - 1, 0), size.defect)}
                                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      −
                                    </button>
                                    <button onClick={() => { const d = prompt('Defectos en talla ' + size.size + ':', size.defect || 0); if (d !== null) updateSizeProduced(size.id, size.produced || 0, parseInt(d) || 0); }}
                                      style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      ⚠
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Notes & Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>
                            {batch.notes && <span>📝 {batch.notes} · </span>}
                            {batch.started_at && <span>Iniciado: {new Date(batch.started_at).toLocaleDateString('es-CO')}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => deleteBatch(batch.id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Trash2 size={12} /> Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════ MATERIALS TAB ═══════ */}
      {activeTab === 'materials' && (
        <MaterialsPanel materials={materials} onUpdateStock={updateMaterialStock} loadData={loadData} />
      )}

      {/* ═══════ STOCK TAB ═══════ */}
      {activeTab === 'stock' && (
        <InventoryPage
          products={products}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          lastSync={null}
          isConnected={true}
          onUpdateStock={onUpdateStock}
        />
      )}

      {/* ═══════ NEW BATCH MODAL ═══════ */}
      {showNewBatch && <NewBatchModal onClose={() => setShowNewBatch(false)} onCreate={createBatch} products={products} />}

      {/* ═══════ NEW MATERIAL MODAL ═══════ */}
      {showNewMaterial && <NewMaterialModal onClose={() => setShowNewMaterial(false)} onCreate={createMaterial} />}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 800px; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// NEW BATCH MODAL
// ══════════════════════════════════════════════════════════════════
function NewBatchModal({ onClose, onCreate, products }) {
  const [step, setStep] = useState('search'); // search | variants | confirm
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantQuantities, setVariantQuantities] = useState({});
  const [form, setForm] = useState({
    category: 'camiseta', material: 'algodon', priority: 'normal', dueDate: '', notes: '',
  });

  const searchResults = useMemo(() => {
    if (!search.trim() || !products) return [];
    const q = search.toLowerCase();
    return products.filter(p => {
      const name = p.name?.es || p.name || '';
      return name.toLowerCase().includes(q);
    }).slice(0, 12);
  }, [search, products]);

  const totalUnits = Object.values(variantQuantities).reduce((sum, q) => sum + (q || 0), 0);

  const parseVariants = (product) => {
    const attrs = product.attributes || [];
    return (product.variants || []).map(v => {
      const values = v.values || [];
      let color = null, size = null;
      values.forEach((val, i) => {
        const text = val?.es || val?.pt || val?.en || Object.values(val || {})[0] || '';
        const attrName = (attrs[i]?.name || attrs[i]?.es || '').toLowerCase();
        if (attrName.includes('color')) color = text;
        else if (attrName.includes('talla') || attrName.includes('size')) size = text;
        else if (!color) color = text;
        else if (!size) size = text;
      });
      if (!color && !size && v.name) color = v.name.trim();
      const stock = v.stock === null ? null : parseInt(v.stock, 10);
      return { id: v.id, color: color || '—', size: size || '—', sku: v.sku || '—', stock };
    });
  };

  const selectProduct = (product) => {
    setSelectedProduct(product);
    const variants = parseVariants(product);
    const initial = {};
    variants.forEach(v => { initial[v.id] = 0; });
    setVariantQuantities(initial);
    setStep('variants');
  };

  const handleSubmit = () => {
    if (!selectedProduct || totalUnits === 0) return;
    const variants = parseVariants(selectedProduct);
    const batchVariants = variants
      .filter(v => variantQuantities[v.id] > 0)
      .map(v => ({
        variant_id: v.id, color: v.color, size: v.size, sku: v.sku,
        quantity: variantQuantities[v.id], current_stock: v.stock ?? 0,
      }));
    const name = selectedProduct.name?.es || selectedProduct.name || '';
    const image = selectedProduct.images?.[0]?.src || null;
    onCreate({
      productName: name,
      description: '',
      category: form.category,
      material: form.material,
      color: variants[0]?.color || '',
      colorHex: '#3b82f6',
      priority: form.priority,
      dueDate: form.dueDate,
      notes: form.notes,
      sizes: batchVariants.map(v => ({ size: v.size, quantity: v.quantity })),
      tiendanubeProductId: selectedProduct.id,
      tiendanubeProductName: name,
      tiendanubeProductImage: image,
      batchVariants,
    });
  };

  const headerTitle = step === 'search' ? 'Buscar Producto Tiendanube' : step === 'variants' ? 'Cantidad por Variante' : 'Crear Lote';
  const headerSub = step === 'search' ? 'Elegí el producto de tu tienda' : step === 'variants' ? `${selectedProduct?.name?.es || selectedProduct?.name || ''}` : 'Revisá y creá el lote';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <div style={{
        width: 620, maxHeight: '85vh', overflowY: 'auto', borderRadius: 20,
        background: 'var(--surface)', border: '1px solid var(--glass-border)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f59e0b, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>{headerTitle}</h3>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--on-surface-variant)' }}>{headerSub}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* ═══ STEP: SEARCH ═══ */}
          {step === 'search' && (
            <>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre del producto..."
                  autoFocus
                  style={{ width: '100%', padding: '12px 14px 12px 36px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              {search.trim() && searchResults.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>
                  No se encontraron productos con "{search}"
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
                {searchResults.map(p => {
                  const name = p.name?.es || p.name || 'Sin nombre';
                  const img = p.images?.[0]?.src || null;
                  const variantCount = p.variants?.length || 0;
                  return (
                    <div key={p.id} onClick={() => selectProduct(p)} style={{
                      padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.06)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      {img ? (
                        <img src={img} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package size={16} color="var(--on-surface-variant)" />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{variantCount} variante{variantCount !== 1 ? 's' : ''}</div>
                      </div>
                      <ArrowRight size={14} color="var(--on-surface-variant)" />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ═══ STEP: VARIANTS ═══ */}
          {step === 'variants' && selectedProduct && (
            <>
              {/* Product info */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: 16,
              }}>
                {selectedProduct.images?.[0]?.src && (
                  <img src={selectedProduct.images[0].src} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>{selectedProduct.name?.es || selectedProduct.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{selectedProduct.variants?.length || 0} variantes</div>
                </div>
                <button onClick={() => { setStep('search'); setSelectedProduct(null); setVariantQuantities({}); }}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface-variant)', fontSize: 11, cursor: 'pointer' }}>
                  Cambiar
                </button>
              </div>

              {/* Variant grid */}
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span><Ruler size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />Cantidades por Variante</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace" }}>
                  Total: {totalUnits} uds
                </span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                {parseVariants(selectedProduct).map(v => {
                  const qty = variantQuantities[v.id] || 0;
                  const isUnlimited = v.stock === null;
                  const isLow = !isUnlimited && v.stock <= 2;
                  return (
                    <div key={v.id} style={{
                      padding: '10px 6px', borderRadius: 10, textAlign: 'center',
                      background: qty > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                      border: qty > 0 ? '1.5px solid rgba(245,158,11,0.2)' : '1.5px solid rgba(255,255,255,0.06)',
                      transition: 'all 0.15s',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: qty > 0 ? '#f59e0b' : 'var(--on-surface)', marginBottom: 2 }}>
                        {v.size}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginBottom: 4 }}>
                        {v.color}
                      </div>
                      <div style={{
                        fontSize: 9, fontWeight: 600, padding: '1px 4px', borderRadius: 4,
                        display: 'inline-block', marginBottom: 6,
                        background: isUnlimited ? 'rgba(6,182,212,0.1)' : isLow ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: isUnlimited ? '#06b6d4' : isLow ? '#ef4444' : '#10b981',
                      }}>
                        {isUnlimited ? '∞' : v.stock}
                      </div>
                      <input type="number" min={0} value={qty || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setVariantQuantities(q => ({ ...q, [v.id]: Math.max(0, val) }));
                        }}
                        style={{
                          width: '100%', padding: '4px 2px', borderRadius: 6,
                          border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                          color: 'var(--on-surface)', fontSize: 15, fontWeight: 800,
                          textAlign: 'center', fontFamily: "'JetBrains Mono', monospace",
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Extra fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
                <div>
                  <label style={labelStyle}>Categoría</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Material</label>
                  <select value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} style={inputStyle}>
                    {MATERIALS_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Prioridad</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={inputStyle}>
                    {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Fecha Límite</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Notas (opcional)</label>
                  <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Instrucciones..." style={inputStyle} />
                </div>
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} disabled={totalUnits === 0} style={{
                width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none',
                background: totalUnits > 0
                  ? 'linear-gradient(135deg, #f59e0b, #f97316)' : 'rgba(255,255,255,0.05)',
                color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: totalUnits > 0 ? 'pointer' : 'not-allowed',
                opacity: totalUnits > 0 ? 1 : 0.5,
                marginTop: 20, boxShadow: totalUnits > 0 ? '0 4px 16px rgba(245,158,11,0.3)' : 'none',
              }}>
                <Sparkles size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Crear Lote ({totalUnits} unidades)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MATERIALS PANEL
// ══════════════════════════════════════════════════════════════════
function MaterialsPanel({ materials, onUpdateStock, loadData }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [search, setSearch] = useState('');

  const filtered = materials.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar material..."
          style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 13, boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {filtered.map(mat => {
          const isLow = mat.stock_quantity <= mat.min_stock;
          return (
            <div key={mat.id} style={{
              padding: '16px', borderRadius: 12,
              background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
              border: `1px solid ${isLow ? 'rgba(239,68,68,0.2)' : 'var(--glass-border)'}`,
              borderLeft: `3px solid ${isLow ? '#ef4444' : '#8b5cf6'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>{mat.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                    {mat.category} · {mat.color || '—'} · ${mat.cost_per_unit}/{mat.unit}
                  </div>
                </div>
                {isLow && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#ef444415', color: '#ef4444' }}>STOCK BAJO</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: isLow ? '#ef4444' : '#10b981', fontFamily: "'JetBrains Mono', monospace" }}>
                    {editingId === mat.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { onUpdateStock(mat.id, parseFloat(editValue) || 0); setEditingId(null); } }}
                          autoFocus style={{ width: 70, padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: 'var(--on-surface)', fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }} />
                        <button onClick={() => { onUpdateStock(mat.id, parseFloat(editValue) || 0); setEditingId(null); }} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer' }}><CheckCircle size={14} /></button>
                      </div>
                    ) : (
                      <span onClick={() => { setEditingId(mat.id); setEditValue(String(mat.stock_quantity)); }} style={{ cursor: 'pointer' }}>
                        {mat.stock_quantity} <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--on-surface-variant)' }}>{mat.unit}{mat.stock_quantity !== 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>Mín: {mat.min_stock} {mat.unit}</div>
                </div>
                <div style={{ width: 60, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${Math.min((mat.stock_quantity / Math.max(mat.min_stock * 3, 1)) * 100, 100)}%`, background: isLow ? '#ef4444' : '#10b981', transition: 'width 0.3s' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// NEW MATERIAL MODAL
// ══════════════════════════════════════════════════════════════════
function NewMaterialModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', category: 'tela', color: '', unit: 'metro', stock: 0, minStock: 5, cost: 0, supplier: '' });
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <div style={{ width: 440, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--glass-border)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>Nuevo Material</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <label style={labelStyle}>Nombre</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Tela Algodón Azul" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Categoría</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {[{ value: 'tela', label: 'Tela' }, { value: 'hilo', label: 'Hilo' }, { value: 'etiqueta', label: 'Etiqueta' }, { value: 'boton', label: 'Botón' }, { value: 'tinte', label: 'Tinte' }, { value: 'otro', label: 'Otro' }].map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Color</label>
              <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Azul" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Unidad</label>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={inputStyle}>
                {[{ value: 'metro', label: 'Metro' }, { value: 'yarda', label: 'Yarda' }, { value: 'kilogramo', label: 'Kg' }, { value: 'unidad', label: 'Unidad' }, { value: 'rollo', label: 'Rollo' }].map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <div><label style={labelStyle}>Stock Inicial</label>
              <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
            </div>
            <div><label style={labelStyle}>Mínimo</label>
              <input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelStyle}>Costo Unitario ($)</label>
              <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: parseFloat(e.target.value) || 0 }))} style={inputStyle} />
            </div>
            <div><label style={labelStyle}>Proveedor</label>
              <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nombre proveedor" style={inputStyle} />
            </div>
          </div>
          <button onClick={() => { if (!form.name.trim()) return; onCreate(form); }}
            disabled={!form.name.trim()}
            style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: form.name.trim() ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: form.name.trim() ? 'pointer' : 'not-allowed', opacity: form.name.trim() ? 1 : 0.5, marginTop: 16 }}>
            Crear Material
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6, marginTop: 12 };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 13, boxSizing: 'border-box', marginBottom: 4 };
