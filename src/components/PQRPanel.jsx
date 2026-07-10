import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Package, Truck, Warehouse, Plus, X, Save,
  Trash2, Edit3, Search, CheckCircle2, Clock,
  MessageSquare, Zap, User, ShoppingBag,
  AlertCircle, Sparkles, Inbox, LayoutGrid,
  Mail, RefreshCw, ChevronRight
} from 'lucide-react';

const RETURN_REASONS = [
  { id: 'customer_request', label: 'Solicitud del cliente' },
  { id: 'damaged', label: 'Daño de prenda' },
  { id: 'carrier_failed', label: 'Transportadora falló' },
  { id: 'wrong_item', label: 'Artículo incorrecto' },
  { id: 'size_issue', label: 'Problema de talle' },
];

const TRACKER_STEPS = [
  { id: 'sent_to_us', label: 'Recibido', icon: Inbox, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #f97316)' },
  { id: 'in_warehouse', label: 'En Bodega', icon: Warehouse, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)' },
  { id: 'sent_to_client', label: 'Resuelto', icon: CheckCircle2, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' }
];

function getWhatsAppUrl(phone, name, orderNum) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  const digits = cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
  if (digits.length < 8) return null;
  const msg = `Hola ${name || 'Cliente'}, somos la tienda. Respecto a tu pedido #${orderNum || ''}, ¿cómo podemos ayudarte?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

// ═══════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════
const S = {
  input: {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--border-subtle)', background: 'var(--surface)',
    color: 'var(--on-surface)', fontSize: 13, fontFamily: 'Inter, sans-serif',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s'
  },
  label: {
    display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--on-surface-variant)',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em'
  },
  sectionHead: {
    fontSize: 10, fontWeight: 800, color: 'var(--on-surface-variant)',
    textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12,
    display: 'flex', alignItems: 'center', gap: 6
  },
  glassCard: {
    background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)', borderRadius: 14,
    transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)'
  },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px',
    borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer',
    fontSize: 11, fontFamily: 'Inter, sans-serif', transition: 'all 0.2s'
  }
};

// ═══════════════════════════════════════════════════════
//  WHATSAPP BUTTON
// ═══════════════════════════════════════════════════════
const WhatsAppBtn = ({ phone, name, orderNum, size = 'normal' }) => {
  const url = getWhatsAppUrl(phone, name, orderNum);
  const small = size === 'small';
  if (!url) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: small ? '3px 8px' : '6px 12px', borderRadius: 6, background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)', fontSize: small ? 10 : 11, fontWeight: 600, opacity: 0.4, cursor: 'default', fontFamily: 'Inter, sans-serif' }}>
        <svg width={small ? 10 : 12} height={small ? 10 : 12} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Sin teléfono
      </span>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: small ? '3px 8px' : '6px 14px', borderRadius: 8, background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', textDecoration: 'none', fontSize: small ? 10 : 12, fontWeight: 600, fontFamily: 'Inter, sans-serif', boxShadow: '0 2px 8px rgba(37,211,102,0.3)', transition: 'all 0.2s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,211,102,0.4)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,211,102,0.3)'; }}
    >
      <svg width={small ? 10 : 13} height={small ? 10 : 13} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      WhatsApp
    </a>
  );
};

// ═══════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════
export default function PQRPanel({ session, rawOrders = [] }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [viewMode, setViewMode] = useState('inbox');
  const [refreshing, setRefreshing] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const [formData, setFormData] = useState({
    order_number: '', contact_date: new Date().toISOString().split('T')[0],
    return_reason: 'customer_request', original_tracking: '', return_tracking: '',
    resend_tracking: '', requested_items: '', customer_message: '', internal_notes: '',
    tracker_status: 'sent_to_us', customer_name: '', customer_email: '',
    customer_phone: '', products_involved: ''
  });

  useEffect(() => { if (session?.user?.id) fetchCases(); }, [session]);

  useEffect(() => {
    const h = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const updateDropdownPos = () => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  };

  // Auto-sync from Tiendanube when rawOrders change
  useEffect(() => {
    if (rawOrders.length === 0 || cases.length === 0) return;
    const sync = async () => {
      let changed = false;
      for (const pqr of cases) {
        if (!pqr.order_number) continue;
        const order = rawOrders.find(o => String(o.number || o.id) === String(pqr.order_number));
        if (!order) continue;
        const c = order.customer || {};
        const prods = (order.products || []).map(p => `${p.name} x${p.quantity || 1}`).join(', ');
        const upd = {};
        if (c.name && !pqr.customer_name) upd.customer_name = c.name;
        if (c.email && !pqr.customer_email) upd.customer_email = c.email;
        if (c.phone && !pqr.customer_phone) upd.customer_phone = c.phone;
        if (prods && !pqr.products_involved) upd.products_involved = prods;
        if (order.tracking_number && !pqr.original_tracking) upd.original_tracking = order.tracking_number;
        if (Object.keys(upd).length > 0) {
          changed = true;
          await supabase.from('pqr_cases').update(upd).eq('id', pqr.id).eq('user_id', session.user.id);
        }
      }
      if (changed) fetchCases();
    };
    sync();
  }, [rawOrders]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('pqr_cases').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
      if (error) throw error;
      setCases(data || []);
    } catch (e) {
      console.error('Error fetching PQR cases:', e);
    } finally { setLoading(false); }
  };

  const matchedOrders = useMemo(() => {
    if (!orderSearch || orderSearch.length < 1) return [];
    const t = orderSearch.toLowerCase();
    return rawOrders.filter(o => {
      const num = String(o.number || o.id || '');
      const name = o.customer?.name?.toLowerCase() || '';
      const email = o.customer?.email?.toLowerCase() || '';
      return num.includes(t) || name.includes(t) || email.includes(t);
    }).slice(0, 8);
  }, [orderSearch, rawOrders]);

  const handleOrderSelect = (order) => {
    const c = order.customer || {};
    const prods = (order.products || []).map(p => `${p.name} x${p.quantity || 1}`).join(', ');
    setFormData(prev => ({
      ...prev, order_number: String(order.number || order.id),
      customer_name: c.name || '', customer_email: c.email || '',
      customer_phone: c.phone || '', products_involved: prods,
      original_tracking: order.tracking_number || prev.original_tracking
    }));
    setOrderSearch(''); setShowDropdown(false);
  };

  const resetForm = () => ({
    order_number: '', contact_date: new Date().toISOString().split('T')[0],
    return_reason: 'customer_request', original_tracking: '', return_tracking: '',
    resend_tracking: '', requested_items: '', customer_message: '', internal_notes: '',
    tracker_status: 'sent_to_us', customer_name: '', customer_email: '',
    customer_phone: '', products_involved: ''
  });

  const handleOpenCreate = () => { setFormData(resetForm()); setIsCreating(true); setSelectedCase(null); };
  const handleSelectCase = (c) => { setSelectedCase(c); setIsCreating(false); };
  const handleClose = () => { setIsCreating(false); setSelectedCase(null); };

  const handleEdit = () => {
    if (!selectedCase) return;
    const base = {
      order_number: selectedCase.order_number || '', contact_date: selectedCase.contact_date || new Date().toISOString().split('T')[0],
      return_reason: selectedCase.return_reason || 'customer_request', original_tracking: selectedCase.original_tracking || '',
      return_tracking: selectedCase.return_tracking || '', resend_tracking: selectedCase.resend_tracking || '',
      requested_items: selectedCase.requested_items || '', customer_message: selectedCase.customer_message || '',
      internal_notes: selectedCase.internal_notes || '', tracker_status: selectedCase.tracker_status || 'sent_to_us',
      customer_name: selectedCase.customer_name || '', customer_email: selectedCase.customer_email || '',
      customer_phone: selectedCase.customer_phone || '', products_involved: selectedCase.products_involved || ''
    };
    if (base.order_number && rawOrders.length > 0) {
      const order = rawOrders.find(o => String(o.number || o.id) === base.order_number);
      if (order) {
        const c = order.customer || {};
        const prods = (order.products || []).map(p => `${p.name} x${p.quantity || 1}`).join(', ');
        base.customer_name = c.name || base.customer_name;
        base.customer_email = c.email || base.customer_email;
        base.customer_phone = c.phone || base.customer_phone;
        base.products_involved = prods || base.products_involved;
      }
    }
    setFormData(base); setIsCreating(true);
  };

  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const handleSave = async () => {
    try {
      const dbFields = { ...formData };
      if (isCreating && selectedCase) {
        const { error } = await supabase.from('pqr_cases').update(dbFields).eq('id', selectedCase.id).eq('user_id', session.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pqr_cases').insert([{ ...dbFields, user_id: session.user.id }]);
        if (error) throw error;
      }
      fetchCases(); handleClose();
    } catch (e) {
      console.error('Error saving PQR case:', e);
      if (e.message?.includes('column') || e.code === '42703') {
        alert('Faltan columnas en la tabla pqr_cases. Ejecutá la migración 004 en Supabase SQL Editor.');
      } else { alert('Error al guardar: ' + (e.message || 'Error desconocido')); }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este caso permanentemente?')) return;
    try {
      await supabase.from('pqr_cases').delete().eq('id', id).eq('user_id', session.user.id);
      setSelectedCase(null); fetchCases();
    } catch (e) { console.error('Error deleting PQR case:', e); }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedCase) return;
    try {
      const { error } = await supabase.from('pqr_cases').update({ tracker_status: newStatus }).eq('id', selectedCase.id).eq('user_id', session.user.id);
      if (error) throw error;
      setSelectedCase(prev => ({ ...prev, tracker_status: newStatus }));
      fetchCases();
    } catch (e) { console.error('Error updating status:', e); }
  };

  const handleSendEmail = () => {
    if (!selectedCase?.customer_email) { alert('Este caso no tiene email registrado.'); return; }
    const subject = encodeURIComponent(`Resolución de tu pedido #${selectedCase.order_number || ''}`);
    const body = encodeURIComponent(
      `Hola ${selectedCase.customer_name || 'Cliente'},\n\n` +
      `Te informamos que el caso de tu pedido #${selectedCase.order_number || ''} ha sido resuelto.\n\n` +
      `Si tenés alguna consulta, no dudes en contactarnos.\n\n` +
      `Saludos,\nEquipo de Soporte`
    );
    window.open(`mailto:${selectedCase.customer_email}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleRefreshFromTiendanube = async () => {
    if (!selectedCase || rawOrders.length === 0) return;
    const order = rawOrders.find(o => String(o.number || o.id) === String(selectedCase.order_number));
    if (!order) { alert('Pedido no encontrado en Tiendanube.'); return; }
    const c = order.customer || {};
    const prods = (order.products || []).map(p => `${p.name} x${p.quantity || 1}`).join(', ');
    const updates = {
      customer_name: c.name || selectedCase.customer_name, customer_email: c.email || selectedCase.customer_email,
      customer_phone: c.phone || selectedCase.customer_phone, products_involved: prods || selectedCase.products_involved,
      original_tracking: order.tracking_number || selectedCase.original_tracking
    };
    try {
      const { error } = await supabase.from('pqr_cases').update(updates).eq('id', selectedCase.id).eq('user_id', session.user.id);
      if (error) throw error;
      setSelectedCase(prev => ({ ...prev, ...updates })); fetchCases();
    } catch (e) { console.error('Error refreshing:', e); }
  };

  const getStatus = (id) => {
    const map = {
      sent_to_us: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock },
      in_warehouse: { label: 'En Bodega', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Warehouse },
      sent_to_client: { label: 'Resuelto', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2 }
    };
    return map[id] || map.sent_to_us;
  };

  const filteredCases = cases.filter(c => {
    const matchS = !searchTerm ||
      c.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchF = filterStatus === 'all' || c.tracker_status === filterStatus;
    return matchS && matchF;
  });

  const stats = {
    total: cases.length,
    pending: cases.filter(c => c.tracker_status === 'sent_to_us').length,
    warehouse: cases.filter(c => c.tracker_status === 'in_warehouse').length,
    resolved: cases.filter(c => c.tracker_status === 'sent_to_client').length
  };

  const hasData = formData.customer_name || formData.customer_email || formData.customer_phone;

  const handleBulkRefresh = async () => {
    if (rawOrders.length === 0) { alert('No hay pedidos de Tiendanube conectados.'); return; }
    setRefreshing(true);
    let updated = 0;
    for (const pqr of cases) {
      if (!pqr.order_number) continue;
      const order = rawOrders.find(o => String(o.number || o.id) === String(pqr.order_number));
      if (!order) continue;
      const c = order.customer || {};
      const prods = (order.products || []).map(p => `${p.name} x${p.quantity || 1}`).join(', ');
      const upd = {};
      if (c.name) upd.customer_name = c.name;
      if (c.email) upd.customer_email = c.email;
      if (c.phone) upd.customer_phone = c.phone;
      if (prods) upd.products_involved = prods;
      if (order.tracking_number) upd.original_tracking = order.tracking_number;
      if (Object.keys(upd).length > 0) {
        await supabase.from('pqr_cases').update(upd).eq('id', pqr.id).eq('user_id', session.user.id);
        updated++;
      }
    }
    await fetchCases();
    setRefreshing(false);
    alert(`Sincronización completa: ${updated} caso(s) actualizado(s).`);
  };

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0, animation: 'fadeIn 0.4s ease' }}>

      {/* ─── LEFT PANEL ─── */}
      <div style={{ width: 380, minWidth: 380, display: 'flex', flexDirection: 'column', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRight: '1px solid var(--border-subtle)', borderRadius: '18px 0 0 18px', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'linear-gradient(180deg, rgba(59,130,246,0.04) 0%, transparent 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
                  <HeadsetIcon size={16} color="#fff" />
                </div>
                Soporte
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--on-surface-variant)' }}>{stats.total} casos · {stats.pending} pendientes</p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={handleBulkRefresh} disabled={refreshing}
                style={{ ...S.btn, background: 'var(--surface-container)', color: 'var(--on-surface-variant)', border: '1px solid var(--border-subtle)', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
                title="Sincronizar todos con Tiendanube">
                <RefreshCw size={13} />
              </button>
              <button onClick={handleOpenCreate} style={{ ...S.btn, background: 'var(--gradient-primary)', color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
                <Plus size={14} /> Nuevo
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[
              { l: 'Pendientes', v: stats.pending, c: '#f59e0b', emoji: '⏳' },
              { l: 'Bodega', v: stats.warehouse, c: '#3b82f6', emoji: '📦' },
              { l: 'Resueltos', v: stats.resolved, c: '#10b981', emoji: '✅' }
            ].map((s, i) => (
              <div key={i} onClick={() => setFilterStatus(filterStatus === (['sent_to_us', 'in_warehouse', 'sent_to_client'][i]) ? 'all' : ['sent_to_us', 'in_warehouse', 'sent_to_client'][i])}
                style={{ flex: 1, padding: '8px 6px', borderRadius: 10, background: `${s.c}08`, border: `1px solid ${s.c}18`, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', opacity: filterStatus !== 'all' && filterStatus !== ['sent_to_us', 'in_warehouse', 'sent_to_client'][i] ? 0.4 : 1 }}
                onMouseEnter={e => { e.currentTarget.style.background = `${s.c}15`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${s.c}08`; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 3 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Search + View Toggle */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={13} color="var(--on-surface-variant)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input type="text" placeholder="Buscar por #, nombre o email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ ...S.input, paddingLeft: 32, background: 'var(--surface-container)', border: '1px solid transparent', fontSize: 12, padding: '8px 10px 8px 32px' }} />
            </div>
            <div style={{ display: 'flex', background: 'var(--surface-container)', borderRadius: 8, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
              {[{ k: 'inbox', i: Inbox, tip: 'Bandeja' }, { k: 'kanban', i: LayoutGrid, tip: 'Kanban' }].map(v => (
                <button key={v.k} onClick={() => setViewMode(v.k)} title={v.tip}
                  style={{ padding: '6px 10px', border: 'none', cursor: 'pointer', background: viewMode === v.k ? 'var(--primary)' : 'transparent', color: viewMode === v.k ? '#fff' : 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
                  <v.i size={13} />
                </button>
              ))}
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 3, marginTop: 8 }}>
            {[{ k: 'all', l: 'Todos' }, { k: 'sent_to_us', l: 'Pendientes' }, { k: 'in_warehouse', l: 'Bodega' }, { k: 'sent_to_client', l: 'Resueltos' }].map(f => (
              <button key={f.k} onClick={() => setFilterStatus(f.k)}
                style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: filterStatus === f.k ? 700 : 500, fontFamily: 'Inter, sans-serif', background: filterStatus === f.k ? 'var(--primary)' : 'transparent', color: filterStatus === f.k ? 'var(--on-primary)' : 'var(--on-surface-variant)', transition: 'all 0.2s' }}>
                {f.l}
              </button>
            ))}
          </div>
        </div>

        {/* Case List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', animation: 'pulseGlow 1.5s infinite' }}><Inbox size={16} /></div>
              Cargando casos...
            </div>
          ) : filteredCases.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', opacity: 0.4 }}><Inbox size={24} /></div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)' }}>Sin casos</p>
              <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.6, marginTop: 4 }}>Creá uno nuevo para comenzar</p>
            </div>
          ) : filteredCases.map((pqr) => {
            const st = getStatus(pqr.tracker_status);
            const isSel = selectedCase?.id === pqr.id;
            return (
              <div key={pqr.id} onClick={() => handleSelectCase(pqr)}
                style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', background: isSel ? 'var(--primary-container)' : 'transparent', borderLeft: isSel ? '3px solid var(--primary)' : '3px solid transparent', userSelect: 'none' }}
                onMouseEnter={e => { if (!isSel) { e.currentTarget.style.background = 'var(--surface-container)'; e.currentTarget.style.transform = 'translateX(2px)'; }}}
                onMouseLeave={e => { if (!isSel) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>#{pqr.order_number || '—'}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 700, background: st.bg, color: st.color }}>
                      <st.icon size={9} /> {st.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {pqr.customer_phone && <WhatsAppBtn phone={pqr.customer_phone} name={pqr.customer_name} orderNum={pqr.order_number} size="small" />}
                    <ChevronRight size={12} color="var(--on-surface-variant)" style={{ opacity: isSel ? 1 : 0.3, transition: 'opacity 0.2s' }} />
                  </div>
                </div>
                {pqr.customer_name && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 2 }}>{pqr.customer_name}</div>}
                <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.6 }}>
                  {pqr.customer_message || pqr.requested_items || pqr.products_involved || 'Sin detalles'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── RIGHT: Detail / Create ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', borderRadius: '0 18px 18px 0', overflow: 'hidden' }}>

        {/* Empty State */}
        {!selectedCase && !isCreating && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: 'var(--shadow-md)' }}><Inbox size={34} style={{ opacity: 0.25 }} /></div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--on-surface)' }}>Centro de Soporte</h3>
            <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.5 }}>Selecciona un caso o crea uno nuevo</p>
          </div>
        )}

        {/* ── CREATE / EDIT FORM ── */}
        {isCreating && (
          <div style={{ flex: 1, overflowY: 'auto', animation: 'slideUp 0.35s ease' }}>
            <div style={{ padding: '18px 28px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5, backdropFilter: 'var(--glass-blur)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--on-surface)' }}>{selectedCase ? 'Editar Caso' : 'Nuevo Caso PQR'}</h2>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--on-surface-variant)' }}>{selectedCase ? `#${selectedCase.order_number}` : 'Busca un pedido de Tiendanube para autocompletar'}</p>
              </div>
              <button onClick={handleClose} style={{ background: 'var(--surface-container-high)', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--error-container)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-container-high)'}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22 }}>

              {/* SMART SEARCH */}
              <div style={{ ...S.glassCard, padding: 18 }} ref={dropdownRef}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={S.sectionHead}><Sparkles size={12} color="var(--primary)" /> Buscar Pedido Tiendanube</div>
                  {selectedCase && formData.order_number && rawOrders.length > 0 && (
                    <button type="button" onClick={() => {
                      const order = rawOrders.find(o => String(o.number || o.id) === formData.order_number);
                      if (order) {
                        const c = order.customer || {};
                        const prods = (order.products || []).map(p => `${p.name} x${p.quantity || 1}`).join(', ');
                        setFormData(prev => ({ ...prev, customer_name: c.name || prev.customer_name, customer_email: c.email || prev.customer_email, customer_phone: c.phone || prev.customer_phone, products_involved: prods || prev.products_involved }));
                      }
                    }} style={{ ...S.btn, background: 'var(--primary-container)', color: 'var(--primary)', fontSize: 10 }}>
                      <RefreshCw size={10} /> Recargar
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="var(--on-surface-variant)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
                  <input ref={searchInputRef} type="text" autoComplete="off" placeholder="Escribe # de pedido, nombre o email..."
                    value={orderSearch || formData.order_number}
                    onChange={e => { e.stopPropagation(); setOrderSearch(e.target.value); setFormData(prev => ({ ...prev, order_number: '' })); setShowDropdown(true); updateDropdownPos(); }}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value.trim(); const exact = rawOrders.find(o => String(o.number || o.id) === v); if (exact) handleOrderSelect(exact); }
                      if (e.key === 'Escape') setShowDropdown(false);
                    }}
                    onFocus={() => { if (orderSearch.length >= 1) { setShowDropdown(true); updateDropdownPos(); } }}
                    onClick={e => e.stopPropagation()}
                    style={{ ...S.input, paddingLeft: 36, fontSize: 13, padding: '11px 14px 11px 38px', borderColor: hasData ? '#10b981' : 'var(--border-subtle)', boxShadow: hasData ? '0 0 0 2px rgba(16,185,129,0.15)' : 'none' }}
                  />
                </div>
                {rawOrders.length === 0 && (
                  <div style={{ marginTop: 8, fontSize: 10, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <AlertCircle size={11} /> No hay pedidos conectados. Conectá tu tienda en Configuración.
                  </div>
                )}
              </div>

              {/* AUTO-FILLED BANNER */}
              {hasData && (
                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px dashed rgba(16,185,129,0.3)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, animation: 'slideUp 0.3s ease' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gradient-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}>
                    <CheckCircle size={16} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>Datos cargados desde Tiendanube</div>
                    <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                      {formData.customer_name && <span>👤 {formData.customer_name}</span>}
                      {formData.customer_email && <span>📧 {formData.customer_email}</span>}
                      {formData.customer_phone && <span>📱 {formData.customer_phone}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* TRACKER */}
              <div style={{ ...S.glassCard, padding: 18 }}>
                <div style={S.sectionHead}><Zap size={12} color="var(--primary)" /> Estado del Caso</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {TRACKER_STEPS.map(step => {
                    const active = formData.tracker_status === step.id;
                    return (
                      <button key={step.id} onClick={() => setFormData(prev => ({ ...prev, tracker_status: step.id }))}
                        style={{ flex: 1, padding: '12px 8px', borderRadius: 10, border: `2px solid ${active ? step.color : 'var(--border-subtle)'}`, background: active ? `${step.color}08` : 'var(--surface)', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif', transform: active ? 'translateY(-2px)' : 'none', boxShadow: active ? `0 4px 12px ${step.color}20` : 'none' }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.transform = 'none'; }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: active ? step.gradient : 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#fff' : 'var(--on-surface-variant)', transition: 'all 0.25s' }}>
                          <step.icon size={15} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: active ? 800 : 500, color: active ? step.color : 'var(--on-surface-variant)' }}>{step.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CUSTOMER */}
              <div style={{ ...S.glassCard, padding: 18 }}>
                <div style={S.sectionHead}><User size={12} color="var(--secondary)" /> Información del Cliente</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={S.label}>Nombre</label><input name="customer_name" value={formData.customer_name} onChange={handleChange} style={S.input} placeholder="Nombre completo" /></div>
                  <div><label style={S.label}>Email</label><input name="customer_email" value={formData.customer_email} onChange={handleChange} style={S.input} placeholder="email@ejemplo.com" /></div>
                  <div><label style={S.label}>Teléfono</label><input name="customer_phone" value={formData.customer_phone} onChange={handleChange} style={S.input} placeholder="+54 11 1234-5678" /></div>
                  <div><label style={S.label}>Fecha Contacto</label><input type="date" name="contact_date" value={formData.contact_date} onChange={handleChange} style={S.input} /></div>
                </div>
              </div>

              {/* ORDER */}
              <div style={{ ...S.glassCard, padding: 18 }}>
                <div style={S.sectionHead}><ShoppingBag size={12} color="var(--tertiary)" /> Detalles del Pedido</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={S.label}># Pedido</label><input name="order_number" value={formData.order_number} onChange={handleChange} style={S.input} placeholder="#12345" /></div>
                  <div>
                    <label style={S.label}>Motivo</label>
                    <select name="return_reason" value={formData.return_reason} onChange={handleChange} style={{ ...S.input, cursor: 'pointer' }}>
                      {RETURN_REASONS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}><label style={S.label}>Productos Involucrados</label><input name="products_involved" value={formData.products_involved} onChange={handleChange} style={S.input} placeholder="Auto-completado desde Tiendanube" /></div>
                </div>
              </div>

              {/* TRACKING */}
              <div style={{ ...S.glassCard, padding: 18 }}>
                <div style={S.sectionHead}><Truck size={12} color="#06b6d4" /> Guías de Envío</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div><label style={S.label}>Original</label><input name="original_tracking" value={formData.original_tracking} onChange={handleChange} style={S.input} placeholder="INT-9999" /></div>
                  <div><label style={S.label}>Devolución</label><input name="return_tracking" value={formData.return_tracking} onChange={handleChange} style={S.input} placeholder="INT-8888" /></div>
                  <div><label style={S.label}>Reenvío</label><input name="resend_tracking" value={formData.resend_tracking} onChange={handleChange} style={S.input} placeholder="INT-7777" /></div>
                </div>
              </div>

              {/* NOTES */}
              <div style={{ ...S.glassCard, padding: 18 }}>
                <div style={S.sectionHead}><MessageSquare size={12} color="#f43f5e" /> Notas</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={S.label}>Prendas solicitadas</label><textarea name="requested_items" value={formData.requested_items} onChange={handleChange} rows={2} style={{ ...S.input, resize: 'vertical' }} placeholder="¿Qué prendas?" /></div>
                  <div><label style={S.label}>Mensaje del cliente</label><textarea name="customer_message" value={formData.customer_message} onChange={handleChange} rows={2} style={{ ...S.input, resize: 'vertical' }} placeholder="Mensaje..." /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={S.label}>Notas internas</label><textarea name="internal_notes" value={formData.internal_notes} onChange={handleChange} rows={2} style={{ ...S.input, resize: 'vertical', background: 'var(--surface-container-low)' }} placeholder="Notas privadas..." /></div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 28px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface)', position: 'sticky', bottom: 0, backdropFilter: 'var(--glass-blur)' }}>
              <button onClick={handleClose} style={{ ...S.btn, background: 'transparent', color: 'var(--on-surface)', border: '1px solid var(--border-subtle)' }}>Cancelar</button>
              <button onClick={handleSave} style={{ ...S.btn, background: 'var(--gradient-primary)', color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.3)' }}>
                <Save size={13} /> {selectedCase ? 'Actualizar' : 'Crear Caso'}
              </button>
            </div>
          </div>
        )}

        {/* ── DETAIL VIEW ── */}
        {selectedCase && !isCreating && (
          <div style={{ flex: 1, overflowY: 'auto', animation: 'slideUp 0.3s ease' }}>
            {/* Header */}
            <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 5, backdropFilter: 'var(--glass-blur)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: getStatus(selectedCase.tracker_status).bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${getStatus(selectedCase.tracker_status).color}20` }}>
                  {React.createElement(getStatus(selectedCase.tracker_status).icon, { size: 20, color: getStatus(selectedCase.tracker_status).color })}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--primary)' }}>#{selectedCase.order_number}</span>
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--on-surface-variant)' }}>{selectedCase.contact_date} · {getStatus(selectedCase.tracker_status).label}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <WhatsAppBtn phone={selectedCase.customer_phone} name={selectedCase.customer_name} orderNum={selectedCase.order_number} />
                {selectedCase.order_number && rawOrders.length > 0 && (
                  <button onClick={handleRefreshFromTiendanube} style={{ ...S.btn, background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}>
                    <RefreshCw size={12} /> Actualizar
                  </button>
                )}
                <button onClick={handleEdit} style={{ ...S.btn, background: 'var(--primary-container)', color: 'var(--primary)' }}>
                  <Edit3 size={12} /> Editar
                </button>
                <button onClick={() => handleDelete(selectedCase.id)} style={{ ...S.btn, background: 'var(--error-container)', color: 'var(--error)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Status Progress */}
              <div style={{ ...S.glassCard, padding: 18 }}>
                <div style={S.sectionHead}><Zap size={12} color="var(--primary)" /> Progreso</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {TRACKER_STEPS.map(step => {
                    const active = selectedCase.tracker_status === step.id;
                    return (
                      <button key={step.id} onClick={() => handleStatusChange(step.id)}
                        style={{ flex: 1, padding: '12px 8px', borderRadius: 10, border: `2px solid ${active ? step.color : 'var(--border-subtle)'}`, background: active ? `${step.color}08` : 'var(--surface)', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, fontFamily: 'Inter, sans-serif', transform: active ? 'translateY(-2px)' : 'none', boxShadow: active ? `0 4px 12px ${step.color}20` : 'none' }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.transform = 'none'; }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: active ? step.gradient : 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#fff' : 'var(--on-surface-variant)', transition: 'all 0.25s' }}>
                          <step.icon size={15} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: active ? 800 : 500, color: active ? step.color : 'var(--on-surface-variant)' }}>{step.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Card */}
              {(selectedCase.customer_name || selectedCase.customer_email || selectedCase.customer_phone) && (
                <div style={{ ...S.glassCard, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={S.sectionHead}><User size={12} color="var(--secondary)" /> Cliente</div>
                    {selectedCase.customer_phone && <WhatsAppBtn phone={selectedCase.customer_phone} name={selectedCase.customer_name} orderNum={selectedCase.order_number} size="small" />}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    {selectedCase.customer_name && <div><div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Nombre</div><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)' }}>{selectedCase.customer_name}</div></div>}
                    {selectedCase.customer_email && <div><div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Email</div><div style={{ fontSize: 12, color: 'var(--on-surface)' }}>{selectedCase.customer_email}</div></div>}
                    {selectedCase.customer_phone && <div><div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Teléfono</div><div style={{ fontSize: 12, color: 'var(--on-surface)' }}>{selectedCase.customer_phone}</div></div>}
                  </div>
                </div>
              )}

              {/* Products */}
              {selectedCase.products_involved && (
                <div style={{ ...S.glassCard, padding: 18 }}>
                  <div style={S.sectionHead}><ShoppingBag size={12} color="var(--tertiary)" /> Productos</div>
                  <div style={{ fontSize: 12, color: 'var(--on-surface)', lineHeight: 1.6 }}>{selectedCase.products_involved}</div>
                </div>
              )}

              {/* Reason & Tracking */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ ...S.glassCard, padding: 18 }}>
                  <div style={S.sectionHead}><AlertCircle size={12} color="var(--warning)" /> Motivo</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{RETURN_REASONS.find(r => r.id === selectedCase.return_reason)?.label || selectedCase.return_reason}</div>
                </div>
                <div style={{ ...S.glassCard, padding: 18 }}>
                  <div style={S.sectionHead}><Truck size={12} color="#06b6d4" /> Guías</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11 }}>
                    {selectedCase.original_tracking && <div><span style={{ color: 'var(--on-surface-variant)' }}>Original: </span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{selectedCase.original_tracking}</span></div>}
                    {selectedCase.return_tracking && <div><span style={{ color: 'var(--on-surface-variant)' }}>Devolución: </span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{selectedCase.return_tracking}</span></div>}
                    {selectedCase.resend_tracking && <div><span style={{ color: 'var(--on-surface-variant)' }}>Reenvío: </span><span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{selectedCase.resend_tracking}</span></div>}
                    {!selectedCase.original_tracking && !selectedCase.return_tracking && !selectedCase.resend_tracking && <span style={{ color: 'var(--on-surface-variant)', opacity: 0.4 }}>Sin guías registradas</span>}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {(selectedCase.customer_message || selectedCase.requested_items || selectedCase.internal_notes) && (
                <div style={{ ...S.glassCard, padding: 18 }}>
                  <div style={S.sectionHead}><MessageSquare size={12} color="var(--primary)" /> Notas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {selectedCase.customer_message && <div><div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 4 }}>Mensaje del cliente</div><div style={{ fontSize: 12, color: 'var(--on-surface)', lineHeight: 1.6, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>{selectedCase.customer_message}</div></div>}
                    {selectedCase.requested_items && <div><div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 4 }}>Prendas solicitadas</div><div style={{ fontSize: 12, color: 'var(--on-surface)', lineHeight: 1.6, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>{selectedCase.requested_items}</div></div>}
                    {selectedCase.internal_notes && <div><div style={{ fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', marginBottom: 4 }}>Notas internas</div><div style={{ fontSize: 12, color: 'var(--on-surface)', lineHeight: 1.6, padding: '10px 14px', background: 'var(--surface-container)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>{selectedCase.internal_notes}</div></div>}
                  </div>
                </div>
              )}

              {/* Manual Email Button */}
              {selectedCase.customer_email && (
                <button onClick={handleSendEmail}
                  style={{ ...S.glassCard, padding: '12px 18px', background: 'rgba(59,130,246,0.04)', border: '1px dashed rgba(59,130,246,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; }}
                >
                  <Mail size={16} color="var(--primary)" />
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>Enviar email al cliente</div>
                    <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{selectedCase.customer_email}</div>
                  </div>
                  <ChevronRight size={14} color="var(--primary)" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DROPDOWN PORTAL — fixed positioned, never clipped by overflow */}
      {showDropdown && matchedOrders.length > 0 && (
        <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, maxHeight: 240, overflowY: 'auto', boxShadow: 'var(--shadow-lg)', zIndex: 9999, animation: 'slideUp 0.2s ease' }}>
          {matchedOrders.map(order => (
            <div key={order.id} onClick={(e) => { e.stopPropagation(); handleOrderSelect(order); setShowDropdown(false); }}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: 'var(--primary)' }}>#{order.number || order.id}</span>
                <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{order.created_at?.split('T')[0]}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface)', marginTop: 2 }}>{order.customer?.name}</div>
              <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', opacity: 0.6, marginTop: 1 }}>{order.customer?.email} · {order.products?.length || 0} productos</div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function HeadsetIcon(props) {
  return (
    <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke={props.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
    </svg>
  );
}
