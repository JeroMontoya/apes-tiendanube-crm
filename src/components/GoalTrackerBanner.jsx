import React, { useMemo, useState } from 'react';
import { Target, Info, Edit2, Check, X } from 'lucide-react';
import MetricTooltip from './MetricTooltip';

const GoalTrackerBanner = ({ clients, dateRange }) => {
  const [targetGoal, setTargetGoal] = useState(50000000); 
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(targetGoal.toString());
  
  const { totalRevenue, percentage, remaining } = useMemo(() => {
    const total = (clients || []).reduce((acc, client) => acc + (client.totalSpent || 0), 0);
    const pct = Math.min(100, Math.round((total / targetGoal) * 100)) || 0;
    const rem = Math.max(0, targetGoal - total);
    return { totalRevenue: total, percentage: pct, remaining: rem };
  }, [clients, targetGoal]);
  
  const formatter = useMemo(() => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }), []);

  const handleSave = () => {
    const val = parseInt(editValue.replace(/\D/g, ''), 10);
    if (!isNaN(val) && val > 0) {
      setTargetGoal(val);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(targetGoal.toString());
    setIsEditing(false);
  };

  return (
    <div className="glass-card" style={{ 
      marginBottom: 20, 
      padding: '16px 24px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      gap: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Target size={22} color="#f43f5e" />
        </div>
        
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--on-surface-variant)', fontWeight: 600 }}>Meta de Ventas:</span>
            
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input 
                  type="text" 
                  value={editValue} 
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{ 
                    background: 'var(--surface-container-high)', 
                    border: '1px solid var(--border-subtle)', 
                    color: 'var(--on-surface)',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 14,
                    fontWeight: 700,
                    width: 120,
                    outline: 'none'
                  }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
                <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }} title="Guardar">
                  <Check size={16} color="#10b981" />
                </button>
                <button onClick={handleCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }} title="Cancelar">
                  <X size={16} color="#f43f5e" />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--on-surface)' }}>
                  {formatter.format(targetGoal)}
                </span>
                <button 
                  onClick={() => setIsEditing(true)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, padding: 0, display: 'flex', transition: 'opacity 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
                  title="Editar meta"
                >
                  <Edit2 size={14} color="var(--on-surface)" />
                </button>
              </div>
            )}
            <MetricTooltip text="Define tu meta de ventas para el periodo y monitorea tu progreso en tiempo real.">
              <Info size={14} color="var(--on-surface-variant)" style={{ opacity: 0.6, cursor: 'pointer' }} />
            </MetricTooltip>
          </div>
          
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
            Llevamos <strong style={{ color: 'var(--on-background)' }}>{formatter.format(totalRevenue)}</strong>. 
            {percentage >= 100 ? ' ¡Meta superada! 🚀' : ` Faltan ${formatter.format(remaining)}.`}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 400 }}>
        <div style={{ flex: 1, height: 10, backgroundColor: 'var(--border-subtle)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
          <div 
            style={{ 
              position: 'absolute', 
              top: 0, left: 0, height: '100%', 
              width: `${percentage}%`, 
              background: percentage >= 100 ? '#10b981' : 'linear-gradient(90deg, #60a5fa, #c084fc)',
              borderRadius: 5,
              transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }} 
          >
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: 'shimmer 2s infinite' }} />
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, color: percentage >= 100 ? '#10b981' : 'var(--on-surface)', width: 45, textAlign: 'right' }}>
          {percentage}%
        </div>
      </div>
    </div>
  );
};

export default GoalTrackerBanner;
