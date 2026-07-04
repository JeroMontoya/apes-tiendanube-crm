import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, Plus, GripVertical, Phone, Mail, DollarSign,
  ShoppingBag, MessageSquare, Filter, UserPlus, X,
  Save, Trash2, ChevronDown
} from 'lucide-react';

// ─── Pipeline Column Definitions ───────────────────────────────────────────────
const PIPELINE_COLUMNS = [
  { id: 'nuevo_contacto',          label: 'Nuevo Contacto',          color: '#6366f1' },
  { id: 'mensaje_enviado',         label: 'Mensaje Enviado',         color: '#f59e0b' },
  { id: 'respondio_mensaje',       label: 'Respondió Mensaje',       color: '#3b82f6' },
  { id: 'visito_no_compro',        label: 'Visitó y No Compró',      color: '#8b5cf6' },
  { id: 'compro',                  label: 'Compró',                  color: '#22c55e' },
  { id: 'no_interesado',           label: 'No Interesado',           color: '#ef4444' },
];

const PURCHASE_FILTERS = [
  { label: '1 compra',   min: 1, max: 1 },
  { label: '2 compras',  min: 2, max: 2 },
  { label: '3 compras',  min: 3, max: 3 },
  { label: '4 compras',  min: 4, max: 4 },
  { label: '5+ compras', min: 5, max: Infinity },
];

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    padding: '24px',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--on-surface)',
    fontSize: '24px',
    fontWeight: 700,
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-container)',
    color: 'var(--on-surface)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  btnPrimary: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
  },
  btnSmall: {
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '8px',
  },
  btnDanger: {
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef444444',
  },
  // ── Import Section ──
  importSection: {
    marginBottom: '28px',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  importHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  importHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'var(--on-surface)',
    fontSize: '16px',
    fontWeight: 600,
  },
  importBody: {
    padding: '0 20px 20px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  filterLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--on-surface-variant)',
    fontSize: '13px',
    fontWeight: 500,
    marginRight: '4px',
  },
  filterBtn: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-container)',
    color: 'var(--on-surface-variant)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  filterBtnActive: {
    background: 'var(--primary)',
    color: '#fff',
    border: '1px solid var(--primary)',
  },
  clientGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
    maxHeight: '360px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  clientCard: {
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-container)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  clientName: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--on-surface)',
  },
  clientDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: 'var(--on-surface-variant)',
  },
  clientBadgeRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  badgeSpent: {
    background: '#22c55e22',
    color: '#16a34a',
  },
  badgeOrders: {
    background: '#6366f122',
    color: '#6366f1',
  },
  // ── Pipeline Board ──
  board: {
    display: 'flex',
    gap: '14px',
    overflowX: 'auto',
    paddingBottom: '16px',
    minHeight: '500px',
  },
  column: {
    flex: '0 0 280px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 280px)',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-container)',
  },
  columnDragOver: {
    outline: '2px dashed var(--primary)',
    outlineOffset: '-2px',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid var(--surface-border)',
  },
  columnTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--on-surface)',
  },
  columnDot: (color) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  }),
  columnCount: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--on-surface-variant)',
    background: 'var(--surface-border)',
    borderRadius: '20px',
    padding: '2px 10px',
  },
  columnBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  emptyColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    color: 'var(--on-surface-variant)',
    fontSize: '13px',
    textAlign: 'center',
    opacity: 0.6,
  },
  // ── Lead Card ──
  leadCard: {
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-container)',
    cursor: 'grab',
    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
    position: 'relative',
  },
  leadCardDragging: {
    opacity: 0.5,
    transform: 'scale(0.96)',
  },
  leadCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  leadName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--on-surface)',
    lineHeight: 1.3,
  },
  gripIcon: {
    color: 'var(--on-surface-variant)',
    opacity: 0.4,
    flexShrink: 0,
    cursor: 'grab',
  },
  leadDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: 'var(--on-surface-variant)',
    marginBottom: '4px',
    wordBreak: 'break-all',
  },
  leadBadgeRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '8px',
    flexWrap: 'wrap',
  },
  leadNotes: {
    marginTop: '8px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid var(--surface-border)',
    background: 'transparent',
    color: 'var(--on-surface)',
    fontSize: '12px',
    width: '100%',
    resize: 'vertical',
    minHeight: '40px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  leadFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '10px',
  },
  leadDate: {
    fontSize: '11px',
    color: 'var(--on-surface-variant)',
    opacity: 0.7,
  },
  leadActions: {
    display: 'flex',
    gap: '4px',
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: 'var(--on-surface-variant)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  // ── New Lead Modal ──
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '100%',
    maxWidth: '440px',
    borderRadius: '20px',
    padding: '28px',
    border: '1px solid var(--surface-border)',
    background: 'var(--surface-container)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--on-surface)',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  formGroup: {
    marginBottom: '14px',
  },
  formLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--on-surface-variant)',
    marginBottom: '6px',
  },
  formInput: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'transparent',
    color: 'var(--on-surface)',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  formTextarea: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid var(--surface-border)',
    background: 'transparent',
    color: 'var(--on-surface)',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '60px',
    boxSizing: 'border-box',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '12px 20px',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    zIndex: 2000,
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    animation: 'slideInRight 0.3s ease',
  },
};

// ─── Helper: format currency ───────────────────────────────────────────────────
function formatCurrency(amount) {
  if (amount == null) return '$0';
  return '$' + Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CampaignPipeline({ session, unifiedClients = [] }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [purchaseFilter, setPurchaseFilter] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [toast, setToast] = useState(null);
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', notes: '' });
  const [editingNotes, setEditingNotes] = useState({});
  const notesTimeouts = useRef({});

  const userId = session?.user?.id;

  // ── Toast ──
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Load Leads ──
  const loadLeads = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('pipeline_leads')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error('Error cargando leads del pipeline:', err);
      // Graceful degradation: keep whatever leads are in state
      showToast('No se pudieron cargar los datos. Trabajando en modo local.', 'warning');
    } finally {
      setLoading(false);
    }
  }, [userId, showToast]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // ── Save Lead to Supabase ──
  const saveLead = useCallback(async (lead) => {
    if (!userId) return null;
    try {
      const payload = {
        user_id: userId,
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        notes: lead.notes || '',
        total_spent: lead.total_spent || 0,
        order_count: lead.order_count || 0,
        column_id: lead.column_id || 'nuevo_contacto',
        updated_at: new Date().toISOString(),
      };

      if (lead.id && typeof lead.id === 'string' && !lead.id.startsWith('local_')) {
        // Update existing
        const { data, error } = await supabase
          .from('pipeline_leads')
          .update(payload)
          .eq('id', lead.id)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Insert new
        payload.created_at = new Date().toISOString();
        const { data, error } = await supabase
          .from('pipeline_leads')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    } catch (err) {
      console.error('Error guardando lead:', err);
      showToast('No se pudo guardar en la nube. Cambio guardado localmente.', 'warning');
      return null;
    }
  }, [userId, showToast]);

  // ── Delete Lead ──
  const deleteLead = useCallback(async (leadId) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    if (!userId || (typeof leadId === 'string' && leadId.startsWith('local_'))) return;
    try {
      const { error } = await supabase
        .from('pipeline_leads')
        .delete()
        .eq('id', leadId)
        .eq('user_id', userId);
      if (error) throw error;
      showToast('Contacto eliminado correctamente');
    } catch (err) {
      console.error('Error eliminando lead:', err);
      showToast('No se pudo eliminar de la nube', 'warning');
    }
  }, [userId, showToast]);

  // ── Add New Lead (from form) ──
  const handleAddNewLead = useCallback(async () => {
    if (!newLead.name.trim()) return;

    const tempId = 'local_' + Date.now();
    const leadObj = {
      id: tempId,
      name: newLead.name.trim(),
      email: newLead.email.trim(),
      phone: newLead.phone.trim(),
      notes: newLead.notes.trim(),
      total_spent: 0,
      order_count: 0,
      column_id: 'nuevo_contacto',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLeads((prev) => [...prev, leadObj]);
    setShowNewLeadModal(false);
    setNewLead({ name: '', email: '', phone: '', notes: '' });

    const saved = await saveLead(leadObj);
    if (saved) {
      setLeads((prev) => prev.map((l) => (l.id === tempId ? saved : l)));
      showToast('Nuevo contacto agregado al pipeline');
    }
  }, [newLead, saveLead, showToast]);

  // ── Import Client from Tiendanube ──
  const handleImportClient = useCallback(async (client) => {
    const alreadyExists = leads.some(
      (l) => l.email && client.email && l.email.toLowerCase() === client.email.toLowerCase()
    );
    if (alreadyExists) {
      showToast('Este cliente ya está en el pipeline', 'warning');
      return;
    }

    const tempId = 'local_' + Date.now();
    const leadObj = {
      id: tempId,
      name: client.name || 'Sin nombre',
      email: client.email || '',
      phone: client.phone || '',
      notes: '',
      total_spent: client.totalSpent || 0,
      order_count: client.orderCount || 0,
      column_id: 'nuevo_contacto',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLeads((prev) => [...prev, leadObj]);

    const saved = await saveLead(leadObj);
    if (saved) {
      setLeads((prev) => prev.map((l) => (l.id === tempId ? saved : l)));
      showToast(`${client.name || 'Cliente'} agregado al pipeline`);
    }
  }, [leads, saveLead, showToast]);

  // ── Drag & Drop ──
  const handleDragStart = useCallback((e, leadId) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
  }, []);

  const handleDragOver = useCallback((e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedLeadId) return;

    const lead = leads.find((l) => String(l.id) === String(draggedLeadId));
    if (!lead || lead.column_id === targetColumnId) {
      setDraggedLeadId(null);
      return;
    }

    const updatedLead = { ...lead, column_id: targetColumnId, updated_at: new Date().toISOString() };
    setLeads((prev) => prev.map((l) => (String(l.id) === String(draggedLeadId) ? updatedLead : l)));
    setDraggedLeadId(null);

    const columnLabel = PIPELINE_COLUMNS.find((c) => c.id === targetColumnId)?.label || '';
    showToast(`Movido a "${columnLabel}"`);
    await saveLead(updatedLead);
  }, [draggedLeadId, leads, saveLead, showToast]);

  const handleDragEnd = useCallback(() => {
    setDraggedLeadId(null);
    setDragOverColumn(null);
  }, []);

  // ── Notes Debounced Save ──
  const handleNotesChange = useCallback((leadId, value) => {
    setEditingNotes((prev) => ({ ...prev, [leadId]: value }));

    // Update local state immediately
    setLeads((prev) =>
      prev.map((l) =>
        String(l.id) === String(leadId)
          ? { ...l, notes: value, updated_at: new Date().toISOString() }
          : l
      )
    );

    // Debounce Supabase save
    if (notesTimeouts.current[leadId]) clearTimeout(notesTimeouts.current[leadId]);
    notesTimeouts.current[leadId] = setTimeout(async () => {
      const lead = leads.find((l) => String(l.id) === String(leadId));
      if (lead) {
        await saveLead({ ...lead, notes: value });
      }
      setEditingNotes((prev) => {
        const copy = { ...prev };
        delete copy[leadId];
        return copy;
      });
    }, 1200);
  }, [leads, saveLead]);

  // ── Filtered clients from Tiendanube ──
  const filteredClients = purchaseFilter
    ? unifiedClients.filter((c) => {
        const count = c.orderCount || 0;
        return count >= purchaseFilter.min && count <= purchaseFilter.max;
      })
    : [];

  // ── Group leads by column ──
  const leadsByColumn = {};
  for (const col of PIPELINE_COLUMNS) {
    leadsByColumn[col.id] = leads.filter((l) => l.column_id === col.id);
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          <Users size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p style={{ fontSize: '15px' }}>Cargando tu pipeline de seguimiento...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>
          <Users size={24} />
          Pipeline de Seguimiento
        </h2>
        <div style={styles.headerActions}>
          <button
            style={{ ...styles.btn }}
            onClick={() => setImportOpen(!importOpen)}
          >
            <ShoppingBag size={16} />
            Importar Clientes
            <ChevronDown
              size={14}
              style={{
                transform: importOpen ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={() => setShowNewLeadModal(true)}
          >
            <Plus size={16} />
            Nuevo Contacto
          </button>
        </div>
      </div>

      {/* ── Import Clients from Tiendanube ── */}
      {importOpen && (
        <div className="glass-card" style={styles.importSection}>
          <div style={styles.importHeader}>
            <div style={styles.importHeaderLeft}>
              <UserPlus size={20} />
              Importar desde Tiendanube
            </div>
            <span style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>
              {unifiedClients.length} clientes disponibles
            </span>
          </div>
          <div style={styles.importBody}>
            {/* Filter buttons */}
            <div style={styles.filterRow}>
              <span style={styles.filterLabel}>
                <Filter size={14} />
                Filtrar por compras:
              </span>
              {PURCHASE_FILTERS.map((f) => (
                <button
                  key={f.label}
                  style={{
                    ...styles.filterBtn,
                    ...(purchaseFilter?.label === f.label ? styles.filterBtnActive : {}),
                  }}
                  onClick={() =>
                    setPurchaseFilter(purchaseFilter?.label === f.label ? null : f)
                  }
                >
                  {f.label}
                </button>
              ))}
              {purchaseFilter && (
                <button
                  style={{ ...styles.filterBtn, color: '#ef4444', borderColor: '#ef444444' }}
                  onClick={() => setPurchaseFilter(null)}
                >
                  <X size={12} />
                  Limpiar
                </button>
              )}
            </div>

            {/* Filtered client cards */}
            {purchaseFilter ? (
              filteredClients.length > 0 ? (
                <div style={styles.clientGrid}>
                  {filteredClients.map((client) => {
                    const alreadyImported = leads.some(
                      (l) => l.email && client.email && l.email.toLowerCase() === client.email.toLowerCase()
                    );
                    return (
                      <div key={client.id} style={styles.clientCard}>
                        <div style={styles.clientName}>{client.name || 'Sin nombre'}</div>
                        {client.email && (
                          <div style={styles.clientDetail}>
                            <Mail size={13} />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div style={styles.clientDetail}>
                            <Phone size={13} />
                            {client.phone}
                          </div>
                        )}
                        <div style={styles.clientBadgeRow}>
                          <span style={{ ...styles.badge, ...styles.badgeSpent }}>
                            <DollarSign size={12} />
                            {formatCurrency(client.totalSpent)}
                          </span>
                          <span style={{ ...styles.badge, ...styles.badgeOrders }}>
                            <ShoppingBag size={12} />
                            {client.orderCount || 0} {(client.orderCount || 0) === 1 ? 'orden' : 'órdenes'}
                          </span>
                        </div>
                        <button
                          style={{
                            ...styles.btn,
                            ...styles.btnSmall,
                            ...(alreadyImported ? {} : styles.btnPrimary),
                            marginTop: '6px',
                            width: '100%',
                            justifyContent: 'center',
                            opacity: alreadyImported ? 0.5 : 1,
                            cursor: alreadyImported ? 'not-allowed' : 'pointer',
                          }}
                          disabled={alreadyImported}
                          onClick={() => !alreadyImported && handleImportClient(client)}
                        >
                          {alreadyImported ? (
                            <>Ya importado</>
                          ) : (
                            <>
                              <Plus size={14} />
                              Agregar al Pipeline
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--on-surface-variant)', fontSize: '14px' }}>
                  <ShoppingBag size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
                  <p style={{ margin: 0 }}>No hay clientes con {purchaseFilter.label}</p>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--on-surface-variant)', fontSize: '14px' }}>
                <Filter size={28} style={{ marginBottom: '8px', opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Seleccioná un filtro de compras para ver clientes disponibles</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pipeline Board ── */}
      <div style={styles.board}>
        {PIPELINE_COLUMNS.map((col) => {
          const columnLeads = leadsByColumn[col.id] || [];
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              style={{
                ...styles.column,
                ...(isOver ? styles.columnDragOver : {}),
              }}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div style={styles.columnHeader}>
                <div style={styles.columnTitle}>
                  <div style={styles.columnDot(col.color)} />
                  {col.label}
                </div>
                <span style={styles.columnCount}>{columnLeads.length}</span>
              </div>

              {/* Column Body */}
              <div style={styles.columnBody}>
                {columnLeads.length === 0 ? (
                  <div style={styles.emptyColumn}>
                    <MessageSquare size={24} style={{ marginBottom: '8px' }} />
                    <span>Arrastrá contactos aquí</span>
                  </div>
                ) : (
                  columnLeads.map((lead) => {
                    const isDragging = String(draggedLeadId) === String(lead.id);
                    const notesValue = editingNotes[lead.id] !== undefined ? editingNotes[lead.id] : (lead.notes || '');

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        style={{
                          ...styles.leadCard,
                          ...(isDragging ? styles.leadCardDragging : {}),
                        }}
                      >
                        {/* Card Header */}
                        <div style={styles.leadCardHeader}>
                          <div style={styles.leadName}>{lead.name || 'Sin nombre'}</div>
                          <GripVertical size={16} style={styles.gripIcon} />
                        </div>

                        {/* Contact info */}
                        {lead.email && (
                          <div style={styles.leadDetail}>
                            <Mail size={12} />
                            {lead.email}
                          </div>
                        )}
                        {lead.phone && (
                          <div style={styles.leadDetail}>
                            <Phone size={12} />
                            {lead.phone}
                          </div>
                        )}

                        {/* Badges */}
                        {(lead.total_spent > 0 || lead.order_count > 0) && (
                          <div style={styles.leadBadgeRow}>
                            {lead.total_spent > 0 && (
                              <span style={{ ...styles.badge, ...styles.badgeSpent, fontSize: '11px' }}>
                                <DollarSign size={11} />
                                {formatCurrency(lead.total_spent)}
                              </span>
                            )}
                            {lead.order_count > 0 && (
                              <span style={{ ...styles.badge, ...styles.badgeOrders, fontSize: '11px' }}>
                                <ShoppingBag size={11} />
                                {lead.order_count}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        <textarea
                          style={styles.leadNotes}
                          placeholder="Agregar notas..."
                          value={notesValue}
                          onChange={(e) => handleNotesChange(lead.id, e.target.value)}
                          rows={2}
                        />

                        {/* Footer */}
                        <div style={styles.leadFooter}>
                          <span style={styles.leadDate}>
                            {lead.updated_at ? formatDate(lead.updated_at) : ''}
                          </span>
                          <div style={styles.leadActions}>
                            <button
                              style={{ ...styles.iconBtn }}
                              title="Eliminar contacto"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar a ${lead.name || 'este contacto'} del pipeline?`)) {
                                  deleteLead(lead.id);
                                }
                              }}
                            >
                              <Trash2 size={14} color="#ef4444" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── New Lead Modal ── */}
      {showNewLeadModal && (
        <div style={styles.overlay} onClick={() => setShowNewLeadModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>
              <UserPlus size={22} />
              Agregar Nuevo Contacto
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Nombre *</label>
              <input
                style={styles.formInput}
                placeholder="Nombre del contacto"
                value={newLead.name}
                onChange={(e) => setNewLead((prev) => ({ ...prev, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Correo electrónico</label>
              <input
                style={styles.formInput}
                type="email"
                placeholder="ejemplo@correo.com"
                value={newLead.email}
                onChange={(e) => setNewLead((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Teléfono</label>
              <input
                style={styles.formInput}
                type="tel"
                placeholder="+54 11 1234-5678"
                value={newLead.phone}
                onChange={(e) => setNewLead((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Notas</label>
              <textarea
                style={styles.formTextarea}
                placeholder="¿De qué hablaron? ¿Qué le interesa?"
                value={newLead.notes}
                onChange={(e) => setNewLead((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.btn}
                onClick={() => {
                  setShowNewLeadModal(false);
                  setNewLead({ name: '', email: '', phone: '', notes: '' });
                }}
              >
                <X size={16} />
                Cancelar
              </button>
              <button
                style={{
                  ...styles.btn,
                  ...styles.btnPrimary,
                  opacity: newLead.name.trim() ? 1 : 0.5,
                  cursor: newLead.name.trim() ? 'pointer' : 'not-allowed',
                }}
                disabled={!newLead.name.trim()}
                onClick={handleAddNewLead}
              >
                <Save size={16} />
                Guardar Contacto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === 'warning' ? '#f59e0b' : '#22c55e',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
