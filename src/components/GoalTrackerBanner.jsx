import React from 'react';
import { Target } from 'lucide-react';

const GoalTrackerBanner = ({ clients, dateRange }) => {
  // Goal: Let's assume a default dynamic goal of $50M for demonstration. 
  // Ideally this would come from settings.
  const targetGoal = 50000000; 
  
  // Calculate total revenue from filtered clients
  const totalRevenue = clients.reduce((acc, client) => acc + (client.totalSpent || 0), 0);
  
  const percentage = Math.min(100, Math.round((totalRevenue / targetGoal) * 100)) || 0;
  const remaining = Math.max(0, targetGoal - totalRevenue);

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  return (
    <div style={{ 
      marginBottom: 24, 
      padding: '24px 32px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 20,
      background: 'linear-gradient(135deg, var(--surface-container), var(--primary-container))',
      borderRadius: 'var(--radius-lg)',
      color: 'var(--on-surface)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Glow */}
      <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'var(--primary)', filter: 'blur(100px)', opacity: 0.3, borderRadius: '50%', pointerEvents: 'none' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={24} color="#f43f5e" /> Meta de Ventas del Periodo
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
      <div style={{ height: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, overflow: 'hidden', position: 'relative', zIndex: 1, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            height: '100%', 
            width: `${percentage}%`, 
            background: percentage >= 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            borderRadius: 8,
            transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)'
          }} 
        >
          {/* Shimmer Effect inside progress bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: 'shimmer 2s infinite' }} />
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default GoalTrackerBanner;
