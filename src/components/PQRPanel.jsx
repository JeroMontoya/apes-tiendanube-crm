import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Package, Truck, Warehouse, Plus, X, Save, 
  Trash2, Edit3, Search, Filter, ChevronRight, 
  AlertCircle, CheckCircle2, Clock, ArrowRight 
} from 'lucide-react';

const RETURN_REASONS = {
  carrier_failed: 'Interrapidísimo no entregó',
  damaged: 'Daño de prenda',
  customer_request: 'Solicitud del cliente'
};

const TRACKER_STEPS = [
  { id: 'sent_to_us', label: 'Enviado a nosotros', icon: Package },
  { id: 'in_warehouse', label: 'En bodega', icon: Warehouse },
  { id: 'sent_to_client', label: 'Reenviado al cliente', icon: Truck }
];

export default function PQRPanel({ session }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    order_number: '',
    contact_date: new Date().toISOString().split('T')[0],
    return_reason: 'customer_request',
    original_tracking: '',
    return_tracking: '',
    resend_tracking: '',
    requested_items: '',
    customer_message: '',
    internal_notes: '',
    tracker_status: 'sent_to_us'
  });

  useEffect(() => {
    if (session?.user?.id) {
      fetchCases();
    }
  }, [session]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pqr_cases')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching PQR cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (pqrCase = null) => {
    if (pqrCase) {
      setEditingCase(pqrCase);
      setFormData({
        order_number: pqrCase.order_number || '',
        contact_date: pqrCase.contact_date || new Date().toISOString().split('T')[0],
        return_reason: pqrCase.return_reason || 'customer_request',
        original_tracking: pqrCase.original_tracking || '',
        return_tracking: pqrCase.return_tracking || '',
        resend_tracking: pqrCase.resend_tracking || '',
        requested_items: pqrCase.requested_items || '',
        customer_message: pqrCase.customer_message || '',
        internal_notes: pqrCase.internal_notes || '',
        tracker_status: pqrCase.tracker_status || 'sent_to_us'
      });
    } else {
      setEditingCase(null);
      setFormData({
        order_number: '',
        contact_date: new Date().toISOString().split('T')[0],
        return_reason: 'customer_request',
        original_tracking: '',
        return_tracking: '',
        resend_tracking: '',
        requested_items: '',
        customer_message: '',
        internal_notes: '',
        tracker_status: 'sent_to_us'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCase(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (statusId) => {
    setFormData(prev => ({ ...prev, tracker_status: statusId }));
  };

  const handleSave = async () => {
    try {
      if (editingCase) {
        const { error } = await supabase
          .from('pqr_cases')
          .update(formData)
          .eq('id', editingCase.id)
          .eq('user_id', session.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pqr_cases')
          .insert([{ ...formData, user_id: session.user.id }]);
        if (error) throw error;
      }
      fetchCases();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving PQR case:', error);
      alert('Error guardando el caso PQR');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este caso?')) return;
    try {
      const { error } = await supabase
        .from('pqr_cases')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);
      if (error) throw error;
      fetchCases();
    } catch (error) {
      console.error('Error deleting PQR case:', error);
      alert('Error eliminando el caso PQR');
    }
  };

  const getStatusBadge = (statusId) => {
    const step = TRACKER_STEPS.find(s => s.id === statusId);
    if (!step) return null;
    
    let bgColor = 'var(--surface-container-high)';
    let color = 'var(--on-surface-variant)';
    
    if (statusId === 'sent_to_us') {
      bgColor = 'var(--warning-container)';
      color = 'var(--warning)';
    } else if (statusId === 'in_warehouse') {
      bgColor = 'var(--primary-fixed)';
      color = 'var(--primary)';
    } else if (statusId === 'sent_to_client') {
      bgColor = 'var(--success-container)';
      color = 'var(--success)';
    }

    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 12, fontSize: 12,
        fontWeight: 600, backgroundColor: bgColor, color: color
      }}>
        <step.icon size={14} />
        {step.label}
      </span>
    );
  };

  const filteredCases = cases.filter(c => 
    c.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: cases.length,
    pending: cases.filter(c => c.tracker_status === 'sent_to_us').length,
    warehouse: cases.filter(c => c.tracker_status === 'in_warehouse').length,
    resolved: cases.filter(c => c.tracker_status === 'sent_to_client').length
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 700, color: 'var(--on-surface)', margin: '0 0 8px 0' }}>
            <Package size={32} color="var(--primary)" />
            PQR & Devoluciones
          </h1>
          <p style={{ color: 'var(--on-surface-variant)', margin: 0, fontSize: 15 }}>
            Seguimiento de reclamos, devoluciones y reenvíos
          </p>
        </div>
        
        <button 
          onClick={() => handleOpenModal()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            backgroundColor: 'var(--primary)', color: 'var(--on-primary)',
            border: 'none', padding: '10px 20px', borderRadius: 8,
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Plus size={18} />
          Nuevo Caso
        </button>
      </div>

      {/* STATS BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total Casos', value: stats.total, icon: Package, color: 'var(--on-surface)' },
          { label: 'Pendientes (Envío)', value: stats.pending, icon: Clock, color: 'var(--warning)' },
          { label: 'En Bodega', value: stats.warehouse, icon: Warehouse, color: 'var(--primary)' },
          { label: 'Resueltos', value: stats.resolved, icon: CheckCircle2, color: 'var(--success)' }
        ].map((stat, i) => (
          <div key={i} style={{ 
            backgroundColor: 'var(--surface)', padding: 20, borderRadius: 12,
            border: '1px solid var(--border-subtle)', display: 'flex',
            alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ padding: 12, borderRadius: '50%', backgroundColor: 'var(--surface-container-high)', color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', fontWeight: 500 }}>{stat.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--on-surface)', marginTop: 4 }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SEARCH BAR */}
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        backgroundColor: 'var(--surface)', padding: '8px 16px',
        borderRadius: 8, border: '1px solid var(--border-subtle)'
      }}>
        <Search size={18} color="var(--on-surface-variant)" />
        <input 
          type="text" 
          placeholder="Buscar por # de pedido, mensaje..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ border: 'none', outline: 'none', flex: 1, fontSize: 15, backgroundColor: 'transparent' }}
        />
      </div>

      {/* MAIN TABLE */}
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--background)', color: 'var(--on-surface-variant)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}># Pedido</th>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Fecha</th>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Motivo</th>
              <th style={{ padding: '16px 24px', fontWeight: 600 }}>Estado</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)' }}>Cargando...</td></tr>
            ) : filteredCases.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)' }}>No hay casos registrados.</td></tr>
            ) : (
              filteredCases.map(pqr => (
                <tr key={pqr.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--primary)' }}>
                    #{pqr.order_number || 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--on-surface-variant)' }}>
                    {pqr.contact_date}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      backgroundColor: 'var(--surface-container-high)', color: 'var(--on-surface)',
                      padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 500
                    }}>
                      {RETURN_REASONS[pqr.return_reason] || pqr.return_reason}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {getStatusBadge(pqr.tracker_status)}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button onClick={() => handleOpenModal(pqr)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 6 }}>
                        <Edit3 size={18} />
                      </button>
                      <button onClick={() => handleDelete(pqr.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 6 }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      {isModalOpen && (
        <div style={{ 
          position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center',
          backgroundColor: 'rgba(9, 28, 53, 0.4)', backdropFilter: 'blur(4px)'
        }}>
          <div style={{ 
            backgroundColor: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 800,
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'var(--surface)', zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--on-surface)' }}>
                {editingCase ? `Editar Caso #${editingCase.order_number}` : 'Nuevo Caso PQR'}
              </h2>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: 4 }}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 32 }}>
              
              {/* Tracker Visual */}
              <div style={{ backgroundColor: 'var(--background)', padding: 24, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--on-surface)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Estado del Seguimiento</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  
                  <div style={{ position: 'absolute', top: 20, left: 40, right: 40, height: 2, backgroundColor: 'var(--border-medium)', zIndex: 1 }}></div>
                  
                  {TRACKER_STEPS.map((step, index) => {
                    const isActive = formData.tracker_status === step.id;
                    const statusIndex = TRACKER_STEPS.findIndex(s => s.id === formData.tracker_status);
                    const isCompleted = index <= statusIndex;
                    
                    return (
                      <div 
                        key={step.id} 
                        onClick={() => handleStatusChange(step.id)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2, cursor: 'pointer', width: 120 }}
                      >
                        <div style={{ 
                          width: 40, height: 40, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center',
                          backgroundColor: isCompleted ? 'var(--primary)' : 'var(--surface)',
                          border: `2px solid ${isCompleted ? 'var(--primary)' : 'var(--border-medium)'}`,
                          color: isCompleted ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? '0 0 0 4px var(--primary-fixed)' : 'none'
                        }}>
                          <step.icon size={20} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isCompleted ? 'var(--on-surface)' : 'var(--on-surface-variant)', textAlign: 'center' }}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid 1: Basic Info */}
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--on-surface)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>Información General</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 6 }}># de Pedido</label>
                    <input name="order_number" value={formData.order_number} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)', fontSize: 14 }} placeholder="Ej. 12345" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Fecha de Contacto</label>
                    <input type="date" name="contact_date" value={formData.contact_date} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Motivo</label>
                    <select name="return_reason" value={formData.return_reason} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)', fontSize: 14, backgroundColor: 'var(--surface)' }}>
                      {Object.entries(RETURN_REASONS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Grid 2: Tracking Info */}
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--on-surface)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>Guías de Envío</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Guía Original</label>
                    <input name="original_tracking" value={formData.original_tracking} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)', fontSize: 14 }} placeholder="Ej. INT-9999" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Guía de Devolución</label>
                    <input name="return_tracking" value={formData.return_tracking} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)', fontSize: 14 }} placeholder="Ej. INT-8888" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Guía de Reenvío</label>
                    <input name="resend_tracking" value={formData.resend_tracking} onChange={handleChange} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)', fontSize: 14 }} placeholder="Ej. INT-7777" />
                  </div>
                </div>
              </div>

              {/* Grid 3: Text Areas */}
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: 'var(--on-surface)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>Detalles</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Prendas Solicitadas</label>
                    <textarea name="requested_items" value={formData.requested_items} onChange={handleChange} rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)', fontSize: 14, resize: 'vertical' }} placeholder="¿Qué prendas quiere a cambio?" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Mensaje del Cliente</label>
                    <textarea name="customer_message" value={formData.customer_message} onChange={handleChange} rows={3} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)', fontSize: 14, resize: 'vertical' }} placeholder="Mensaje original del cliente..." />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 6 }}>Notas Internas</label>
                    <textarea name="internal_notes" value={formData.internal_notes} onChange={handleChange} rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--outline-variant)', fontSize: 14, resize: 'vertical' }} placeholder="Notas para el equipo..." />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 12, backgroundColor: 'var(--surface-container-lowest)', position: 'sticky', bottom: 0, zIndex: 10 }}>
              <button 
                onClick={handleCloseModal}
                style={{
                  backgroundColor: 'transparent', color: 'var(--on-surface)',
                  border: '1px solid var(--outline-variant)', padding: '10px 20px', borderRadius: 8,
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  backgroundColor: 'var(--primary)', color: 'var(--on-primary)',
                  border: 'none', padding: '10px 20px', borderRadius: 8,
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Save size={18} />
                Guardar Caso
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
