import React, { useState, useEffect } from 'react';
import { X, Save, Calendar as CalendarIcon, Tag, AlignLeft, Clock } from 'lucide-react';

const EventDrawer = ({ isOpen, onClose, onSave, selectedDate, existingEvent }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('CAMPAIGN'); // CAMPAIGN, ACTIVITY, PROMO, HOLIDAY
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (existingEvent) {
      setTitle(existingEvent.title || '');
      setCategory(existingEvent.category || 'CAMPAIGN');
      setStartDate(existingEvent.startDate || '');
      setEndDate(existingEvent.endDate || '');
      setDescription(existingEvent.description || '');
    } else {
      setTitle('');
      setCategory('CAMPAIGN');
      // If a date was clicked on the calendar, pre-fill it
      if (selectedDate) {
        const dStr = selectedDate.toISOString().split('T')[0];
        setStartDate(dStr);
        setEndDate(dStr);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
      }
      setDescription('');
    }
  }, [isOpen, selectedDate, existingEvent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: existingEvent?.id || Date.now().toString(),
      title,
      category,
      startDate,
      endDate,
      description
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)' }}>
      <div style={{ width: '500px', background: 'var(--surface)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-5px 0 25px rgba(0,0,0,0.2)', animation: 'slideInRight 0.3s ease-out' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-container)' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarIcon size={20} className="text-primary" />
            {existingEvent ? 'Editar Evento' : 'Nuevo Evento'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color="var(--on-surface-variant)" /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <form id="event-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'block' }}>Título del Evento *</label>
              <input 
                type="text" required value={title} onChange={e => setTitle(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none', fontSize: 14 }}
                placeholder="Ej. Lanzamiento Campaña Verano"
              />
            </div>

            <div>
               <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={14} /> Categoría
               </label>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                     { id: 'CAMPAIGN', label: 'Campaña Meta', color: '#06B6D4' },
                     { id: 'PROMO', label: 'Promoción', color: '#8b5cf6' },
                     { id: 'ACTIVITY', label: 'Actividad / Tarea', color: '#6366f1' },
                     { id: 'HOLIDAY', label: 'Fecha Importante', color: 'var(--primary-container)' }
                  ].map(cat => (
                     <div 
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        style={{
                           padding: '10px 12px', borderRadius: 8, border: category === cat.id ? `1px solid ${cat.color}` : '1px solid var(--outline-variant)',
                           background: category === cat.id ? `${cat.color}15` : 'var(--surface-container-lowest)', cursor: 'pointer',
                           display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--on-surface)'
                        }}
                     >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                        {cat.label}
                     </div>
                  ))}
               </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
               <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                     <Clock size={14} /> Fecha de Inicio *
                  </label>
                  <input 
                     type="date" required value={startDate} onChange={e => setStartDate(e.target.value)}
                     style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}
                  />
               </div>
               <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                     <Clock size={14} /> Fecha de Fin *
                  </label>
                  <input 
                     type="date" required value={endDate} onChange={e => setEndDate(e.target.value)}
                     style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none' }}
                  />
               </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                 <AlignLeft size={14} /> Descripción / Notas
              </label>
              <textarea 
                value={description} onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', outline: 'none', minHeight: 120, resize: 'vertical' }}
                placeholder="Detalles adicionales sobre este evento..."
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-container)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--outline-variant)', background: 'transparent', color: 'var(--on-surface)', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button form="event-form" type="submit" disabled={!title.trim() || !startDate || !endDate} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: 'var(--on-surface)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Save size={16} /> Guardar Evento
          </button>
        </div>

      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default EventDrawer;
