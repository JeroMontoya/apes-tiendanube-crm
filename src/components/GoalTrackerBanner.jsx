import React, { useMemo } from 'react';
import { Target, Info } from 'lucide-react';

const GoalTrackerBanner = ({ clients, dateRange }) => {
  // Goal: Let's assume a default dynamic goal of $50M for demonstration. 
  // Ideally this would come from settings.
  const targetGoal = 50000000; 
  
  const { totalRevenue, percentage, remaining } = useMemo(() => {
    const total = (clients || []).reduce((acc, client) => acc + (client.totalSpent || 0), 0);
    const pct = Math.min(100, Math.round((total / targetGoal) * 100)) || 0;
    const rem = Math.max(0, targetGoal - total);
    return { totalRevenue: total, percentage: pct, remaining: rem };
  }, [clients]);
  
  const formatter = useMemo(() => new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }), []);

  return (
    <div style={{ 
      marginBottom: 24, 
      padding: '24px 32px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 20,
      background: 'var(--surface-container-low)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      color: 'var(--on-surface)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Glow */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.3, borderRadius: '50%', pointerEvents: 'none' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={24} color="#f43f5e" /> Meta de Ventas del Periodo
            <div className="metric-info" title="Seguimiento de tu meta de ventas. La barra muestra cuánto has vendido vs. tu objetivo. Si está en verde, ¡vas bien! Si no, revisa tus estrategias de marketing.">
              <Info size={15} color="var(--on-surface-variant)" style={{ cursor: 'help', opacity: 0.6 }} />
            </div>
          </h3>
          <p style={{ fontSize: 14, color: '#94a3b8', margin: '6px 0 0', fontWeight: 500 }}>
            {percentage >= 100 ? '¡Meta superada! Excelente trabajo. 🚀' : `Faltan ${formatter.format(remaining)} para alcanzar la meta.`}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 900, background: 'linear-gradient(to right, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {formatter.format(totalRevenue)}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 4 }}>
            Objetivo: {formatter.format(targetGoal)}
          </div>
        </div>
      </div>
      
      {/* Progress Bar Container */}
      <div style={{ height: 12, backgroundColor: 'var(--border-subtle)', borderRadius: 6, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            height: '100%', 
            width: `${percentage}%`, 
            background: percentage >= 100 ? 'var(--primary)' : 'var(--primary)',
            borderRadius: 6,
            transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }} 
        >
          {/* Shimmer Effect inside progress bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: 'shimmer 2s infinite' }} />
        </div>
      </div>
    </div>
  );
};

export default GoalTrackerBanner;
