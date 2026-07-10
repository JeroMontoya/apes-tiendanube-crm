import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Users, Plus, GripVertical, Phone, Mail, DollarSign,
  ShoppingBag, MessageSquare, Filter, UserPlus, X,
  Save, Trash2, ChevronDown, Target, TrendingUp,
  MousePointer, CreditCard, Megaphone, Clock, 
  CheckCircle2, XCircle, Layers, Hash, Search, RefreshCw, AlertTriangle
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────
const PIPELINE_COLUMNS = [
  { id: 'seleccionado',     label: 'Seleccionados',      color: '#6366f1', icon: Target,         desc: 'Audiencia elegida para esta campaña' },
  { id: 'contactado',       label: 'Contactados',        color: '#f59e0b', icon: Megaphone,      desc: 'Mensaje/email/ad enviado' },
  { id: 'interactuo',       label: 'Interactuaron',      color: '#3b82f6', icon: MousePointer,   desc: 'Abrieron, clickearon o respondieron' },
  { id: 'respondio',        label: 'Respondieron',       color: '#8b5cf6', icon: MessageSquare,  desc: 'Contacto directo o respuesta' },
  { id: 'compro',           label: 'Compraron',          color: '#22c55e', icon: CreditCard,     desc: 'Conversión exitosa' },
  { id: 'no_interesado',    label: 'No Interesados',     color: '#ef4444', icon: XCircle,        desc: 'Sin respuesta o rechazaron' },
];

const PURCHASE_FILTERS = [
  { label: '1 compra',   min: 1, max: 1,        emoji: '🔵' },
  { label: '2 compras',  min: 2, max: 2,        emoji: '🟢' },
  { label: '3 compras',  min: 3, max: 3,        emoji: '🟡' },
  { label: '4 compras',  min: 4, max: 4,        emoji: '🟠' },
  { label: '5+ compras', min: 5, max: Infinity,  emoji: '🔴' },
];

const CAMPAIGN_COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e'];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrency(amount) {
  if (amount == null) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CampaignPipeline({ unifiedClients = [] }) {
  // ── States ──
  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [purchaseFilter, setPurchaseFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  
  // Drag & Drop
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // Forms
  const [newCampaign, setNewCampaign] = useState({ name: '', color: CAMPAIGN_COLORS[0] });
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', notes: '' });
  const [editingNotes, setEditingNotes] = useState({});
  const notesTimeouts = useRef({});

  // ── Toast ──
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Load Data (Local Storage initially) ──
  useEffect(() => {
    try {
      const storedCampaigns = JSON.parse(localStorage.getItem('maestro_campaigns')) || [];
      const storedLeads = JSON.parse(localStorage.getItem('maestro_campaign_leads')) || [];
      
      let camps = storedCampaigns;
      if (camps.length === 0) {
        // Create default campaign if none exists
        const defaultCamp = {
          id: 'camp_' + Date.now(),
          name: 'Campaña General',
          color: '#6366f1',
          created_at: new Date().toISOString()
        };
        camps = [defaultCamp];
        localStorage.setItem('maestro_campaigns', JSON.stringify(camps));
      }
      
      setCampaigns(camps);
      setAllLeads(storedLeads);
      
      const lastActive = localStorage.getItem('maestro_active_campaign');
      if (lastActive && camps.some(c => c.id === lastActive)) {
        setActiveCampaignId(lastActive);
      } else {
        setActiveCampaignId(camps[0].id);
      }
    } catch (e) {
      console.error('Error loading data', e);
      showToast('Error cargando base de datos local', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ── Sync to LocalStorage ──
  const saveLeadsLocally = (newLeads) => {
    setAllLeads(newLeads);
    localStorage.setItem('maestro_campaign_leads', JSON.stringify(newLeads));
  };
  
  const saveCampaignsLocally = (newCamps) => {
    setCampaigns(newCamps);
    localStorage.setItem('maestro_campaigns', JSON.stringify(newCamps));
  };

  // ── Active Campaign Data ──
  const activeCampaign = useMemo(() => 
    campaigns.find(c => c.id === activeCampaignId),
    [campaigns, activeCampaignId]
  );
  
  const activeLeads = useMemo(() => 
    allLeads.filter(l => l.campaign_id === activeCampaignId),
    [allLeads, activeCampaignId]
  );

  // ── Filtered clients ──
  const filteredClients = purchaseFilter
    ? unifiedClients.filter((c) => {
        const count = c.purchaseCount || 0;
        return count >= purchaseFilter.min && count <= purchaseFilter.max;
      })
    : [];

  // ── Funnel Metrics ──
  const funnelMetrics = useMemo(() => {
    const metrics = {};
    for (const col of PIPELINE_COLUMNS) {
      const colLeads = activeLeads.filter(l => l.column_id === col.id);
      metrics[col.id] = {
        count: colLeads.length,
        totalSpent: colLeads.reduce((sum, l) => sum + (l.total_spent || 0), 0),
      };
    }
    const total = activeLeads.length || 1;
    const compro = metrics.compro?.count || 0;
    const interactuo = metrics.interactuo?.count || 0;
    const respondio = metrics.respondio?.count || 0;
    const contactado = metrics.contactado?.count || 0;

    return {
      ...metrics,
      conversionRate: ((compro / total) * 100).toFixed(1),
      engagementRate: (((interactuo + respondio) / (contactado || 1)) * 100).toFixed(1),
      totalRevenue: metrics.compro?.totalSpent || 0,
      totalLeads: activeLeads.length,
    };
  }, [activeLeads]);

  // ── Group leads by column ──
  const leadsByColumn = {};
  for (const col of PIPELINE_COLUMNS) {
    let colLeads = activeLeads.filter((l) => l.column_id === col.id);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      colLeads = colLeads.filter(l => 
        (l.name || '').toLowerCase().includes(q) || 
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q)
      );
    }
    leadsByColumn[col.id] = colLeads;
  }

  // ── Create Campaign ──
  const handleCreateCampaign = () => {
    if (!newCampaign.name.trim()) return;
    const campObj = {
      id: 'camp_' + Date.now(),
      name: newCampaign.name.trim(),
      color: newCampaign.color,
      created_at: new Date().toISOString()
    };
    
    const newCamps = [...campaigns, campObj];
    saveCampaignsLocally(newCamps);
    setActiveCampaignId(campObj.id);
    localStorage.setItem('maestro_active_campaign', campObj.id);
    
    setShowNewCampaignModal(false);
    setNewCampaign({ name: '', color: CAMPAIGN_COLORS[0] });
    showToast(`Campaña "${campObj.name}" creada exitosamente`);
  };

  const changeCampaign = (id) => {
    setActiveCampaignId(id);
    localStorage.setItem('maestro_active_campaign', id);
    setShowCampaignSelector(false);
  };

  const handleDeleteCampaign = (id) => {
    if (campaigns.length <= 1) {
      showToast('No puedes eliminar la única campaña existente', 'warning');
      return;
    }
    if (window.confirm('¿Estás seguro de eliminar esta campaña y TODOS sus contactos? Esta acción no se puede deshacer.')) {
      const newCamps = campaigns.filter(c => c.id !== id);
      const newLeads = allLeads.filter(l => l.campaign_id !== id);
      
      saveCampaignsLocally(newCamps);
      saveLeadsLocally(newLeads);
      
      if (activeCampaignId === id) {
        changeCampaign(newCamps[0].id);
      }
      showToast('Campaña eliminada correctamente');
    }
  };

  // ── Lead Operations ──
  const saveLead = useCallback((lead) => {
    const isExisting = allLeads.some(l => l.id === lead.id);
    let newLeads;
    if (isExisting) {
      newLeads = allLeads.map(l => l.id === lead.id ? lead : l);
    } else {
      newLeads = [...allLeads, lead];
    }
    saveLeadsLocally(newLeads);
    return lead;
  }, [allLeads]);

  const deleteLead = useCallback((leadId) => {
    const newLeads = allLeads.filter((l) => l.id !== leadId);
    saveLeadsLocally(newLeads);
    showToast('Contacto eliminado correctamente');
  }, [allLeads, showToast]);

  const handleAddNewLead = () => {
    if (!newLead.name.trim() || !activeCampaignId) return;
    const leadObj = {
      id: 'lead_' + Date.now(),
      campaign_id: activeCampaignId,
      name: newLead.name.trim(),
      email: newLead.email.trim(),
      phone: newLead.phone.trim(),
      notes: newLead.notes.trim(),
      total_spent: 0,
      order_count: 0,
      column_id: 'seleccionado',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveLead(leadObj);
    setShowNewLeadModal(false);
    setNewLead({ name: '', email: '', phone: '', notes: '' });
    showToast('Nuevo contacto agregado al pipeline');
  };

  const handleImportClient = useCallback((client) => {
    const alreadyExists = activeLeads.some(
      (l) => l.email && client.email && l.email.toLowerCase() === client.email.toLowerCase()
    );
    if (alreadyExists) {
      showToast('Este cliente ya está en esta campaña', 'warning');
      return;
    }

    const leadObj = {
      id: 'lead_' + Date.now() + Math.random().toString(36).substr(2, 5),
      campaign_id: activeCampaignId,
      name: client.name || 'Sin nombre',
      email: client.email || '',
      phone: client.phone || '',
      notes: '',
      total_spent: client.totalSpent || 0,
      order_count: client.purchaseCount || 0,
      column_id: 'seleccionado',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveLead(leadObj);
    showToast(`${client.name || 'Cliente'} agregado a la campaña`);
  }, [activeLeads, activeCampaignId, saveLead, showToast]);

  const handleBulkImport = () => {
    const available = filteredClients.filter(client => 
      !activeLeads.some(l => l.email && client.email && l.email.toLowerCase() === client.email.toLowerCase())
    );
    if (available.length === 0) {
      showToast('Todos los clientes filtrados ya están en esta campaña', 'warning');
      return;
    }
    
    const newLeads = available.map(client => ({
      id: 'lead_' + Date.now() + Math.random().toString(36).substr(2, 5),
      campaign_id: activeCampaignId,
      name: client.name || 'Sin nombre',
      email: client.email || '',
      phone: client.phone || '',
      notes: '',
      total_spent: client.totalSpent || 0,
      order_count: client.purchaseCount || 0,
      column_id: 'seleccionado',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    saveLeadsLocally([...allLeads, ...newLeads]);
    showToast(`${available.length} clientes importados a la campaña`);
  };

  // ── Drag & Drop ──
  const handleDragStart = (e, leadId) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => { setDragOverColumn(null); };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedLeadId) return;

    const lead = allLeads.find((l) => String(l.id) === String(draggedLeadId));
    if (!lead || lead.column_id === targetColumnId) {
      setDraggedLeadId(null);
      return;
    }

    const updatedLead = { ...lead, column_id: targetColumnId, updated_at: new Date().toISOString() };
    saveLead(updatedLead);
    setDraggedLeadId(null);

    const columnLabel = PIPELINE_COLUMNS.find((c) => c.id === targetColumnId)?.label || '';
    showToast(`Movido a "${columnLabel}"`);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverColumn(null);
  };

  // ── Notes Debounced Save ──
  const handleNotesChange = (leadId, value) => {
    setEditingNotes((prev) => ({ ...prev, [leadId]: value }));
    const newLeads = allLeads.map((l) =>
      String(l.id) === String(leadId) ? { ...l, notes: value, updated_at: new Date().toISOString() } : l
    );
    setAllLeads(newLeads); // update state immediately for reactivity
    
    if (notesTimeouts.current[leadId]) clearTimeout(notesTimeouts.current[leadId]);
    notesTimeouts.current[leadId] = setTimeout(() => {
      // Actually save to localStorage after typing stops
      localStorage.setItem('maestro_campaign_leads', JSON.stringify(newLeads));
      setEditingNotes((prev) => { const copy = { ...prev }; delete copy[leadId]; return copy; });
    }, 1200);
  };

  if (loading || !activeCampaign) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 24 }}>
        <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          <Target size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 15 }}>Cargando Gestor de Campañas...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, minHeight: '100vh' }}>
      {/* ══════════ HEADER MULTI-CAMPAIGN ══════════ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          {/* Campaign Selector Dropdown Trigger */}
          <button
            onClick={() => setShowCampaignSelector(!showCampaignSelector)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, 
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
              outline: 'none', textAlign: 'left'
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: activeCampaign.color, boxShadow: `0 0 10px ${activeCampaign.color}66` }} />
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
              {activeCampaign.name}
              <ChevronDown size={20} style={{ color: 'var(--on-surface-variant)', transform: showCampaignSelector ? 'rotate(180deg)' : 'none', transition: 'all 0.2s' }} />
            </h2>
          </button>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 6 }}>
            Centro de seguimiento · {activeLeads.length} leads en funnel
          </p>

          {/* Campaign Selector Dropdown Panel */}
          {showCampaignSelector && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 12,
              width: 320, background: 'var(--surface-container-high)',
              border: '1px solid var(--border-subtle)', borderRadius: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)', zIndex: 100, overflow: 'hidden',
              animation: 'fadeSlideDown 0.2s ease', backdropFilter: 'blur(10px)'
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface-variant)' }}>Mis Campañas ({campaigns.length})</span>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {campaigns.map(camp => {
                  const campLeads = allLeads.filter(l => l.campaign_id === camp.id).length;
                  return (
                    <div 
                      key={camp.id}
                      onClick={() => changeCampaign(camp.id)}
                      style={{ 
                        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
                        background: activeCampaignId === camp.id ? 'var(--primary-container)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: camp.color }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: activeCampaignId === camp.id ? 'var(--on-primary-container)' : 'var(--on-surface)' }}>{camp.name}</div>
                          <div style={{ fontSize: 12, color: activeCampaignId === camp.id ? 'var(--on-primary-container)' : 'var(--on-surface-variant)', opacity: 0.8 }}>{campLeads} contactos</div>
                        </div>
                      </div>
                      {activeCampaignId !== camp.id && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(camp.id); }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', padding: 4 }}
                          title="Eliminar Campaña"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div 
                onClick={() => { setShowCampaignSelector(false); setShowNewCampaignModal(true); }}
                style={{ 
                  padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  fontSize: 14, fontWeight: 600, color: 'var(--primary)', background: 'rgba(255,255,255,0.02)'
                }}
              >
                <Plus size={16} /> Crear Nueva Campaña
              </div>
            </div>
          )}
        </div>

        {/* Global Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setImportOpen(!importOpen)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 12,
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-container)',
              color: 'var(--on-surface)', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}
          >
            <ShoppingBag size={16} />
            Importar Clientes
            <ChevronDown size={14} style={{ transform: importOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }} />
          </button>
          <button
            onClick={() => setShowNewLeadModal(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 12,
              border: 'none', background: 'var(--primary)',
              color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}
          >
            <Plus size={16} />
            Nuevo Contacto
          </button>
        </div>
      </div>

      {/* ══════════ FUNNEL METRICS DASHBOARD ══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: '18px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: activeCampaign.color }} />
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Total en Campaña</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--on-surface)' }}>{funnelMetrics.totalLeads}</div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
            <Users size={12} /> contactos importados
          </div>
        </div>
        <div className="glass-card" style={{ padding: '18px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Tasa Conversión</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{funnelMetrics.conversionRate}%</div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
            <TrendingUp size={12} /> ventas logradas
          </div>
        </div>
        <div className="glass-card" style={{ padding: '18px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Engagement</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#3b82f6' }}>{funnelMetrics.engagementRate}%</div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
            <MousePointer size={12} /> interacción total
          </div>
        </div>
        <div className="glass-card" style={{ padding: '18px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Revenue</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{formatCurrency(funnelMetrics.totalRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
            <DollarSign size={12} /> generado
          </div>
        </div>
      </div>

      {/* ══════════ FUNNEL BAR (visual progress) ══════════ */}
      {activeLeads.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Layers size={16} color={activeCampaign.color} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>Progreso del Embudo</span>
          </div>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', height: 32 }}>
            {PIPELINE_COLUMNS.map(col => {
              const count = funnelMetrics[col.id]?.count || 0;
              const pct = activeLeads.length > 0 ? (count / activeLeads.length) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={col.id}
                  title={`${col.label}: ${count} (${pct.toFixed(0)}%)`}
                  style={{
                    width: `${pct}%`,
                    background: col.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff',
                    transition: 'width 0.5s ease',
                    minWidth: count > 0 ? 30 : 0,
                  }}
                >
                  {pct >= 8 ? `${count}` : ''}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, justifyContent: 'center' }}>
            {PIPELINE_COLUMNS.map(col => {
              const count = funnelMetrics[col.id]?.count || 0;
              return (
                <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--on-surface-variant)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  {col.label} ({count})
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════ IMPORT SECTION ══════════ */}
      {importOpen && (
        <div className="glass-card" style={{ marginBottom: 24, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 600, color: 'var(--on-surface)' }}>
              <UserPlus size={20} color="var(--primary)" />
              Importar Clientes a "{activeCampaign.name}"
            </div>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>
              {unifiedClients.length} disponibles en Tiendanube
            </span>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 500 }}>
                <Filter size={14} />
                Filtro rápido:
              </span>
              {PURCHASE_FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setPurchaseFilter(purchaseFilter?.label === f.label ? null : f)}
                  style={{
                    padding: '6px 14px', borderRadius: 20,
                    border: '1px solid var(--border-subtle)',
                    background: purchaseFilter?.label === f.label ? 'var(--primary)' : 'var(--surface-container)',
                    color: purchaseFilter?.label === f.label ? '#fff' : 'var(--on-surface-variant)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s ease',
                  }}
                >
                  {f.emoji} {f.label}
                </button>
              ))}
              {purchaseFilter && filteredClients.length > 0 && (
                <button
                  onClick={handleBulkImport}
                  style={{
                    padding: '6px 14px', borderRadius: 20, marginLeft: 8,
                    border: 'none', background: 'var(--primary)', color: '#fff',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Plus size={12} /> Importar todos ({filteredClients.filter(c => !activeLeads.some(l => l.email && c.email && l.email.toLowerCase() === c.email.toLowerCase())).length})
                </button>
              )}
              {purchaseFilter && (
                <button
                  onClick={() => setPurchaseFilter(null)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #ef444444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                >
                  <X size={12} /> Limpiar
                </button>
              )}
            </div>

            {purchaseFilter ? (
              filteredClients.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
                  {filteredClients.map((client) => {
                    const alreadyImported = activeLeads.some(l => l.email && client.email && l.email.toLowerCase() === client.email.toLowerCase());
                    return (
                      <div key={client.id} style={{ padding: 14, borderRadius: 12, border: `1px solid ${alreadyImported ? 'var(--border-subtle)' : activeCampaign.color+'44'}`, background: 'var(--surface-container)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--on-surface)' }}>{client.name || 'Sin nombre'}</div>
                        {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--on-surface-variant)' }}><Mail size={13} />{client.email}</div>}
                        {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--on-surface-variant)' }}><Phone size={13} />{client.phone}</div>}
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#22c55e22', color: '#16a34a' }}><DollarSign size={12} />{formatCurrency(client.totalSpent)}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: '#6366f122', color: '#6366f1' }}><ShoppingBag size={12} />{client.purchaseCount || 0} {(client.purchaseCount || 0) === 1 ? 'compra' : 'compras'}</span>
                        </div>
                        <button
                          disabled={alreadyImported}
                          onClick={() => !alreadyImported && handleImportClient(client)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                            border: 'none', marginTop: 6, width: '100%', cursor: alreadyImported ? 'not-allowed' : 'pointer',
                            background: alreadyImported ? 'var(--surface-container-high)' : activeCampaign.color,
                            color: alreadyImported ? 'var(--on-surface-variant)' : '#fff',
                            opacity: alreadyImported ? 0.5 : 1,
                          }}
                        >
                          {alreadyImported ? <><CheckCircle2 size={14}/> En Campaña</> : <><Plus size={14} />Agregar al Pipeline</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)', fontSize: 14 }}>
                  <ShoppingBag size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                  <p style={{ margin: 0 }}>No hay clientes con {purchaseFilter.label}</p>
                </div>
              )
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--on-surface-variant)', fontSize: 14 }}>
                <Filter size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Selecciona un filtro para ver los clientes de Tiendanube y agregarlos a esta campaña.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ SEARCH BAR ══════════ */}
      {activeLeads.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 12,
            border: '1px solid var(--border-subtle)', background: 'var(--surface-container)',
            flex: 1, maxWidth: 400,
          }}>
            <Search size={16} style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder={`Buscar en ${activeCampaign.name}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--on-surface)', fontSize: 14, width: '100%', fontFamily: 'inherit' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', display: 'flex', padding: 0 }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══════════ PIPELINE BOARD ══════════ */}
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, minHeight: 500 }}>
        {PIPELINE_COLUMNS.map((col) => {
          const columnLeads = leadsByColumn[col.id] || [];
          const isOver = dragOverColumn === col.id;
          const Icon = col.icon;

          return (
            <div
              key={col.id}
              style={{
                flex: '0 0 280px', borderRadius: 16, display: 'flex', flexDirection: 'column',
                maxHeight: 'calc(100vh - 280px)', background: 'var(--surface-container)',
                border: `1px solid ${isOver ? col.color : 'var(--border-subtle)'}`,
                transition: 'border-color 0.2s ease',
              }}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>
                  <Icon size={16} color={col.color} />
                  {col.label}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', background: `${col.color}20`, borderRadius: 20, padding: '2px 10px' }}>
                  {columnLeads.length}
                </span>
              </div>

              {/* Column Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {columnLeads.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', color: 'var(--on-surface-variant)', fontSize: 13, textAlign: 'center', opacity: 0.6 }}>
                    <Icon size={24} style={{ marginBottom: 8 }} />
                    <span>{col.desc}</span>
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
                          padding: 14, borderRadius: 12, border: '1px solid var(--border-subtle)',
                          background: 'var(--surface-container-high)', cursor: 'grab',
                          position: 'relative', opacity: isDragging ? 0.5 : 1, transform: isDragging ? 'scale(0.96)' : 'none',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: activeCampaign.color, borderRadius: '12px 0 0 12px' }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)', lineHeight: 1.3 }}>{lead.name || 'Sin nombre'}</div>
                          <GripVertical size={16} style={{ color: 'var(--on-surface-variant)', opacity: 0.4, flexShrink: 0, cursor: 'grab' }} />
                        </div>

                        {lead.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 4, wordBreak: 'break-all' }}><Mail size={12} />{lead.email}</div>}
                        {lead.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 4 }}><Phone size={12} />{lead.phone}</div>}

                        {(lead.total_spent > 0 || lead.order_count > 0) && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                            {lead.total_spent > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#22c55e22', color: '#16a34a' }}>
                                <DollarSign size={11} />{formatCurrency(lead.total_spent)}
                              </span>
                            )}
                            {lead.order_count > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#6366f122', color: '#6366f1' }}>
                                <Hash size={11} />{lead.order_count}
                              </span>
                            )}
                          </div>
                        )}

                        <textarea
                          placeholder="Agregar notas de contacto..."
                          value={notesValue}
                          onChange={(e) => handleNotesChange(lead.id, e.target.value)}
                          rows={2}
                          style={{
                            marginTop: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)',
                            background: 'var(--background)', color: 'var(--on-surface)', fontSize: 12, width: '100%',
                            resize: 'vertical', minHeight: 40, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                          }}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                          <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.7 }}>
                            {lead.updated_at ? timeAgo(lead.updated_at) : ''}
                          </span>
                          <button
                            title="Eliminar de campaña"
                            onClick={() => { if (window.confirm(`¿Eliminar a ${lead.name || 'este contacto'} de la campaña?`)) deleteLead(lead.id); }}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </button>
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

      {/* ══════════ CREATE CAMPAIGN MODAL ══════════ */}
      {showNewCampaignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={() => setShowNewCampaignModal(false)}>
          <div style={{ width: '100%', maxWidth: 440, borderRadius: 24, padding: 32, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Megaphone size={24} color="var(--primary)" /> Nueva Campaña
            </div>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--on-surface-variant)' }}>
              Crea un tablero dedicado para organizar, lanzar y medir el éxito de tu próxima iniciativa.
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>Nombre de la campaña</label>
              <input
                autoFocus
                placeholder="Ej. Cyber Lunes, VIP Agosto..."
                value={newCampaign.name}
                onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--background)', color: 'var(--on-surface)', fontSize: 15, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8 }}>Color identificativo</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {CAMPAIGN_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCampaign(prev => ({ ...prev, color }))}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                      border: newCampaign.color === color ? `2px solid #fff` : '2px solid transparent',
                      background: color, outline: newCampaign.color === color ? `2px solid ${color}` : 'none',
                      transition: 'all 0.2s', padding: 0
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => { setShowNewCampaignModal(false); setNewCampaign({ name: '', color: CAMPAIGN_COLORS[0] }); }}
                style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
              >
                Cancelar
              </button>
              <button
                disabled={!newCampaign.name.trim()}
                onClick={handleCreateCampaign}
                style={{ padding: '12px 20px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: '#fff', cursor: newCampaign.name.trim() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 600, opacity: newCampaign.name.trim() ? 1 : 0.5 }}
              >
                Crear Tablero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ NEW LEAD MODAL ══════════ */}
      {showNewLeadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setShowNewLeadModal(false)}>
          <div style={{ width: '100%', maxWidth: 440, borderRadius: 20, padding: 28, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <UserPlus size={22} /> Agregar Contacto a Campaña
            </div>

            {[
              { label: 'Nombre *', key: 'name', type: 'text', placeholder: 'Nombre del contacto', autoFocus: true },
              { label: 'Correo electrónico', key: 'email', type: 'email', placeholder: 'ejemplo@correo.com' },
              { label: 'Teléfono', key: 'phone', type: 'tel', placeholder: '+57 300 123 4567' },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 6 }}>{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  autoFocus={field.autoFocus}
                  value={newLead[field.key]}
                  onChange={(e) => setNewLead(prev => ({ ...prev, [field.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button
                onClick={() => { setShowNewLeadModal(false); setNewLead({ name: '', email: '', phone: '', notes: '' }); }}
                style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--surface-container)', color: 'var(--on-surface)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
              >
                Cancelar
              </button>
              <button
                disabled={!newLead.name.trim()}
                onClick={handleAddNewLead}
                style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: '#fff', cursor: newLead.name.trim() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 500, opacity: newLead.name.trim() ? 1 : 0.5 }}
              >
                <Save size={16} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TOAST ══════════ */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 500, zIndex: 2000, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', animation: 'slideInRight 0.3s ease', background: toast.type === 'warning' ? '#f59e0b' : '#22c55e' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
