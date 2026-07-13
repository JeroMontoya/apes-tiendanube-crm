import React from 'react';
import { CheckCircle, Loader2, AlertCircle, Clock, Database, ShoppingCart, Users, Truck, BarChart2, Zap, Globe, Box } from 'lucide-react';

const SYNC_STEPS = [
  { key: 'config', label: 'Configuración', icon: Database, desc: 'Inicializando conexión' },
  { key: 'data', label: 'Datos principales', icon: Database, desc: 'Clientes, pedidos y productos en paralelo' },
  { key: 'unify', label: 'Unificación', icon: Zap, desc: 'Fusionando clientes y enriqueciendo datos' },
  { key: 'cache', label: 'Caché', icon: Box, desc: 'Guardando productos y datos unificados' },
  { key: 'insights', label: 'Insights IA', icon: BarChart2, desc: 'Generando análisis con Gemini AI' },
  { key: 'external', label: 'Fuentes externas', icon: Globe, desc: 'GA4, Meta Ads, Merchant Center, Search Console' },
  { key: 'complete', label: 'Completado', icon: CheckCircle, desc: 'Todo listo para operar' },
];

export default function SyncProgressOverlay({ 
  isVisible, 
  currentStep = 0, 
  stepProgress = 0, 
  overallProgress = 0,
  statusMessage = '',
  error = null,
  onClose,
  isSilent = false 
}) {
  if (!isVisible) return null;

  const completedSteps = SYNC_STEPS.slice(0, currentStep);
  const currentStepData = SYNC_STEPS[currentStep];
  const remainingSteps = SYNC_STEPS.slice(currentStep + 1);

  return (
    <div className="sync-overlay" style={{
      position: isSilent ? 'fixed' : 'fixed',
      inset: 0,
      background: 'rgba(9, 28, 53, 0.95)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      animation: 'fadeIn 0.3s ease'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes progressBar { from { width: 0%; } to { width: var(--progress); } }
        .step-item { animation: slideUp 0.3s ease forwards; opacity: 0; }
        .step-item.completed { opacity: 1; }
        .step-item.current { opacity: 1; }
        .step-item.pending { opacity: 0.3; }
      `}</style>

      {/* Progress Ring + Percentage */}
      <div style={{ 
        position: 'relative', 
        width: 140, 
        height: 140, 
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          <circle 
            cx="70" cy="70" r="60" 
            fill="none" 
            stroke="rgba(255,255,255,0.1)" 
            strokeWidth="8"
          />
          <circle 
            cx="70" cy="70" r="60" 
            fill="none" 
            stroke="url(#progressGradient)" 
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={376.99}
            strokeDashoffset={376.99 * (1 - overallProgress / 100)}
            style={{ 
              transition: 'stroke-dashoffset 0.5s ease',
              filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.6))'
            }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ 
          position: 'absolute', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1 }}>
            {Math.round(overallProgress)}%
          </span>
          <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Progreso
          </span>
        </div>
      </div>

      {/* Status Message */}
      <div style={{ 
        minHeight: 40, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: 16
      }}>
        {error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 14, fontWeight: 500 }}>
            <AlertCircle size={18} style={{ animation: 'pulse 1s ease-in-out infinite' }} />
            {statusMessage || 'Error en la sincronización'}
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            color: 'var(--on-surface)', 
            fontSize: 15, 
            fontWeight: 500,
            maxWidth: 400,
            textAlign: 'center'
          }}>
            <Loader2 size={20} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
            <span>{statusMessage || (currentStepData ? `Procesando: ${currentStepData.label}` : 'Iniciando...')}</span>
          </div>
        )}
      </div>

      {/* Steps Timeline */}
      <div style={{ 
        width: '100%', 
        maxWidth: 500, 
        maxHeight: 400, 
        overflowY: 'auto',
        paddingRight: 8 
      }}>
        {SYNC_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;
          
          return (
            <div 
              key={step.key} 
              className={`step-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isPending ? 'pending' : ''}`}
              style={{ 
                animationDelay: `${index * 0.05}s`,
                opacity: isCompleted || isCurrent ? 1 : 0.3
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '8px 0' }}>
                {/* Connector line */}
                <div style={{ 
                  width: 24, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  position: 'relative'
                }}>
                  <div style={{
                    width: isCompleted ? 24 : 12,
                    height: isCompleted ? 24 : 12,
                    borderRadius: '50%',
                    border: isCompleted ? 'none' : '2px solid var(--border-subtle)',
                    background: isCompleted 
                      ? 'linear-gradient(135deg, #10b981, #059669)' 
                      : isCurrent 
                        ? 'linear-gradient(135deg, #3b82f6, #06b6d4)' 
                        : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 2,
                    boxShadow: isCurrent ? '0 0 0 4px rgba(59,130,246,0.3), 0 0 12px rgba(59,130,246,0.4)' : 'none',
                    transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)'
                  }}>
                    {isCompleted && <CheckCircle size={14} color="#fff" />}
                    {isCurrent && !isCompleted && <Loader2 size={12} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />}
                    {isPending && <Clock size={12} color="var(--on-surface-variant)" />}
                  </div>
                  {/* Vertical line */}
                  <div style={{ 
                    flex: 1, 
                    width: 2, 
                    background: index < SYNC_STEPS.length - 1 
                      ? (isCompleted ? 'linear-gradient(180deg, #10b981, #059669)' : 'var(--border-subtle)') 
                      : 'transparent',
                    marginTop: 4,
                    transition: 'background 0.4s ease'
                  }} />
                </div>

                {/* Step content */}
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: 10, 
                      background: isCompleted 
                        ? 'rgba(16,185,129,0.15)' 
                        : isCurrent 
                          ? 'rgba(59,130,246,0.15)' 
                          : 'rgba(255,255,255,0.03)',
                      border: isCompleted ? '1px solid rgba(16,185,129,0.3)' : isCurrent ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border-subtle)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.3s ease'
                    }}>
                      <step.icon size={16} color={isCompleted ? '#10b981' : isCurrent ? '#3b82f6' : 'var(--on-surface-variant)'} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: isCompleted || isCurrent ? 700 : 500, 
                        fontSize: 13, 
                        color: isCompleted ? '#10b981' : isCurrent ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                        transition: 'color 0.3s ease'
                      }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.8, marginTop: 2 }}>
                        {step.desc}
                      </div>
                    </div>
                  </div>

                  {/* Current step progress bar */}
                  {isCurrent && !isCompleted && (
                    <div style={{ marginTop: 8, marginLeft: 46, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${stepProgress}%`, 
                        background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', 
                        borderRadius: 2,
                        transition: 'width 0.3s ease',
                        boxShadow: '0 0 8px rgba(59,130,246,0.4)'
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Close button for errors or completion */}
      {(error || currentStep >= SYNC_STEPS.length - 1) && !isSilent && (
        <button 
          onClick={onClose}
          style={{
            marginTop: 24,
            padding: '12px 32px',
            borderRadius: 10,
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            background: error ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(59,130,246,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.4)'; }}
        >
          {error ? 'Reintentar' : 'Continuar al Dashboard'}
        </button>
      )}
    </div>
  );
}