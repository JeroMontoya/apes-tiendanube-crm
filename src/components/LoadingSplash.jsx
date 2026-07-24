import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, BarChart2, Zap, Target, Brain, Shield, TrendingUp, ArrowRight } from 'lucide-react';

const FEATURES = [
  { icon: Sparkles, label: 'IA Generativa', color: '#8b5cf6', delay: 0 },
  { icon: BarChart2, label: 'Analytics Unificado', color: '#3b82f6', delay: 120 },
  { icon: Zap, label: 'Meta Ads Sync', color: '#1877F2', delay: 240 },
  { icon: Target, label: 'Metas Inteligentes', color: '#f43f5e', delay: 360 },
  { icon: Brain, label: 'Predicción Churn', color: '#06b6d4', delay: 480 },
  { icon: TrendingUp, label: 'ROAS Tracking', color: '#10b981', delay: 600 },
  { icon: Shield, label: 'Seguridad Enterprise', color: 'var(--primary-container)', delay: 720 },
];

const LOADING_MESSAGES = [
  'Inicializando sistema…',
  'Cargando configuración…',
  'Verificando autenticación…',
  'Sincronizando métricas…',
  'Activando motor de IA…',
  'Calibrando predicciones…',
  'Preparando tablero…',
  '¡Listo para escalar!',
];

export default function LoadingSplash({ onComplete, message: initialMessage }) {
  const [phase, setPhase] = useState('entrance');
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(LOADING_MESSAGES[0]);
  const [visibleFeatures, setVisibleFeatures] = useState([]);
  const [logoState, setLogoState] = useState({ scale: 0, rotate: -15, blur: 20, opacity: 0 });
  const [ringProgress, setRingProgress] = useState(0);
  const [particles, setParticles] = useState([]);
  const [pulseScale, setPulseScale] = useState(1);
  const progressRef = useRef(0);
  const animationRef = useRef();
  const messageIndexRef = useRef(0);

  useEffect(() => {
    const generateParticles = () => {
      return Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: 100 + Math.random() * 20,
        size: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.4 + 0.1,
        speed: Math.random() * 0.3 + 0.15,
        delay: Math.random() * 2,
        drift: (Math.random() - 0.5) * 50,
        hue: 220 + Math.random() * 40,
      }));
    };
    setParticles(generateParticles());
  }, []);

  useEffect(() => {
    setLogoState({ scale: 1, rotate: 0, blur: 0, opacity: 1 });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale(s => s === 1 ? 1.06 : 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;

    const phases = [
      { progress: 15, duration: 500, msgIdx: 0 },
      { progress: 30, duration: 600, msgIdx: 1 },
      { progress: 45, duration: 700, msgIdx: 2 },
      { progress: 65, duration: 800, msgIdx: 3 },
      { progress: 85, duration: 600, msgIdx: 4 },
      { progress: 95, duration: 500, msgIdx: 5 },
      { progress: 100, duration: 400, msgIdx: 6 },
    ];

    let currentPhase = 0;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const current = phases[currentPhase];
      const phaseProgress = Math.min(elapsed / current.duration, 1);
      const eased = 1 - Math.pow(1 - phaseProgress, 3);

      const prevProgress = currentPhase > 0 ? phases[currentPhase - 1].progress : 0;
      const currentProgress = prevProgress + (current.progress - prevProgress) * eased;

      setProgress(currentProgress);
      progressRef.current = currentProgress;
      setRingProgress(currentProgress / 100);

      if (current.msgIdx !== messageIndexRef.current) {
        messageIndexRef.current = current.msgIdx;
        setCurrentMessage(LOADING_MESSAGES[current.msgIdx]);
      }

      if (phaseProgress >= 1) {
        currentPhase++;
        if (currentPhase < phases.length) {
          startTime = Date.now();
        } else {
          setPhase('complete');
          setTimeout(() => onComplete?.(), 500);
          return;
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [phase, onComplete]);

  useEffect(() => {
    if (phase !== 'loading') return;
    let index = 0;
    const interval = setInterval(() => {
      if (index < FEATURES.length) {
        setVisibleFeatures(prev => [...prev, FEATURES[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [phase]);

  const startLoading = () => {
    setPhase('loading');
    setVisibleFeatures([]);
  };

  const css = `
    @keyframes splash-float {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-8px) scale(1.02); }
    }
    @keyframes splash-pulse-ring {
      0% { transform: scale(0.9); opacity: 0.3; }
      50% { transform: scale(1.1); opacity: 0.08; }
      100% { transform: scale(0.9); opacity: 0.3; }
    }
    @keyframes splash-particle-rise {
      0% { transform: translateY(0) translateX(0); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(-130vh) translateX(var(--drift)); opacity: 0; }
    }
    @keyframes splash-feature-in {
      from { opacity: 0; transform: translateX(-20px) scale(0.95); filter: blur(4px); }
      to { opacity: 1; transform: translateX(0) scale(1); filter: blur(0); }
    }
    @keyframes splash-message-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes splash-logo-entrance {
      0% { opacity: 0; transform: scale(0.5) rotate(-20deg); filter: blur(20px); }
      60% { filter: blur(0); }
      100% { opacity: 1; transform: scale(1) rotate(0deg); }
    }
    @keyframes splash-ring-draw {
      from { stroke-dashoffset: 340; opacity: 0; }
      20% { opacity: 1; }
      to { stroke-dashoffset: 0; }
    }
    @keyframes splash-shimmer {
      0% { transform: translateX(-100%); opacity: 0; }
      20% { opacity: 1; }
      80% { opacity: 1; }
      100% { transform: translateX(100%); opacity: 0; }
    }
    @keyframes splash-progress-glow {
      0%, 100% { filter: drop-shadow(0 0 6px var(--primary)) drop-shadow(0 0 12px var(--primary)); }
      50% { filter: drop-shadow(0 0 12px var(--primary)) drop-shadow(0 0 24px var(--primary)); }
    }
    @keyframes splash-complete-burst {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.8; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    @keyframes splash-fade-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(1.05); filter: blur(20px); }
    }
    @keyframes splash-fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .splash-root {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: var(--background);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: inherit;
      overflow: hidden;
    }
    .splash-bg {
      position: absolute;
      inset: 0;
      background: 
        radial-gradient(ellipse 80% 60% at 15% 0%, rgba(var(--primary-rgb), 0.12) 0%, transparent 60%),
        radial-gradient(ellipse 60% 40% at 85% 100%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
        radial-gradient(ellipse 50% 30% at 50% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 70%);
    }
    .splash-gradient-mesh {
      position: absolute;
      inset: 0;
      background: 
        linear-gradient(135deg, transparent 40%, rgba(var(--primary-rgb), 0.02) 50%, transparent 60%),
        linear-gradient(225deg, transparent 40%, rgba(99, 102, 241, 0.02) 50%, transparent 60%);
      animation: splash-float 10s ease-in-out infinite;
    }

    .splash-particle {
      position: absolute;
      width: var(--size);
      height: var(--size);
      border-radius: 50%;
      background: hsl(var(--hue), 85%, 60%);
      opacity: var(--opacity);
      pointer-events: none;
      animation: splash-particle-rise var(--duration) ease-in-out infinite;
      animation-delay: var(--delay);
      filter: blur(0.5px);
    }

    .splash-center {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
    }

    .splash-logo-wrap {
      position: relative;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .splash-ring-bg {
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 1px solid var(--primary);
      opacity: 0.12;
      animation: splash-pulse-ring 3.5s ease-in-out infinite;
    }
    .splash-ring-bg:nth-child(2) {
      inset: -20px;
      animation-delay: -1.2s;
      opacity: 0.06;
    }
    .splash-ring-bg:nth-child(3) {
      inset: -32px;
      animation-delay: -2.4s;
      opacity: 0.03;
    }

    .splash-logo {
      width: 80px;
      height: 80px;
      border-radius: 24px;
      background: linear-gradient(135deg, var(--primary), #6366f1, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 0 0 1px var(--border-medium) inset,
        0 10px 40px rgba(var(--primary-rgb), 0.35),
        0 0 50px rgba(var(--primary-rgb), 0.15);
      position: relative;
      z-index: 2;
      animation: splash-logo-entrance 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    .splash-logo::before {
      content: '';
      position: absolute;
      inset: -5px;
      border-radius: 28px;
      background: linear-gradient(135deg, var(--primary), #6366f1, #06b6d4);
      filter: blur(24px);
      opacity: 0.4;
      animation: splash-pulse-ring 2.5s ease-in-out infinite;
      z-index: -1;
    }
    .splash-logo svg {
      width: 40px;
      height: 40px;
      color: #fff;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.25));
    }

    .splash-progress-ring {
      position: relative;
      width: 120px;
      height: 120px;
      margin-top: -16px;
    }
    .splash-progress-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .splash-progress-bg {
      fill: none;
      stroke: var(--border-subtle);
      stroke-width: 5;
    }
    .splash-progress-bar {
      fill: none;
      stroke: url(#splash-gradient);
      stroke-width: 5;
      stroke-linecap: round;
      stroke-dasharray: 290;
      stroke-dashoffset: 290;
      transition: stroke-dashoffset 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      filter: drop-shadow(0 0 6px var(--primary));
      animation: splash-progress-glow 1.8s ease-in-out infinite;
    }

    .splash-message {
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--on-surface-variant);
      text-align: center;
      max-width: 300px;
      line-height: 1.5;
      animation: splash-message-in 0.35s ease both;
      letter-spacing: 0.01em;
    }
    .splash-message .highlight {
      color: var(--primary);
      font-weight: 600;
    }

    .splash-percent {
      font-family: 'JetBrains Mono', monospace;
      font-size: 2.25rem;
      font-weight: 700;
      color: var(--on-surface);
      letter-spacing: -0.03em;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .splash-features {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      max-width: 480px;
      margin-top: 10px;
      padding-top: 20px;
      border-top: 1px solid var(--border-subtle);
    }
    .splash-feature {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      background: var(--surface-container);
      border: 1px solid var(--border-subtle);
      border-radius: 9999px;
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--on-surface-variant);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      animation: splash-feature-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      transition: all 0.25s ease;
    }
    .splash-feature:hover {
      background: var(--surface-container-high);
      border-color: var(--primary);
      color: var(--on-surface);
    }
    .splash-feature svg {
      color: var(--primary);
    }

    .splash-shimmer {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 100%;
      background: linear-gradient(90deg, transparent, var(--outline), transparent);
      animation: splash-shimmer 1.8s ease-in-out infinite;
      pointer-events: none;
      border-radius: var(--radius-xl);
    }

    .splash-complete-burst {
      position: absolute;
      inset: -16px;
      border-radius: 50%;
      border: 2px solid var(--success);
      animation: splash-complete-burst 0.7s ease-out forwards;
      pointer-events: none;
    }

    .splash-fade-out {
      animation: splash-fade-out 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
  `;

  return (
    <div className="splash-root" role="status" aria-live="polite" aria-label={currentMessage}>
      <style>{css}</style>

      <div className="splash-bg" />
      <div className="splash-gradient-mesh" />

      {particles.map(p => (
        <div
          key={p.id}
          className="splash-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            '--size': `${p.size}px`,
            '--opacity': p.opacity,
            '--duration': `${22 / p.speed}s`,
            '--delay': `${p.delay}s`,
            '--drift': `${p.drift}px`,
            '--hue': p.hue,
          }}
        />
      ))}

      <div className="splash-center">
        <div className="splash-logo-wrap">
          <div className="splash-ring-bg" />
          <div className="splash-ring-bg" />
          <div className="splash-ring-bg" />

          <div
            className="splash-logo"
            style={{
              transform: `scale(${logoState.scale}) rotate(${logoState.rotate}deg)`,
              filter: `blur(${logoState.blur}px)`,
              opacity: logoState.opacity,
            }}
          >
            <Sparkles size={40} color="#fff" />
          </div>
        </div>

        <div className="splash-progress-ring">
          <svg className="splash-progress-svg" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="splash-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <circle className="splash-progress-bg" cx="60" cy="60" r="46" />
            <circle
              className="splash-progress-bar"
              cx="60"
              cy="60"
              r="46"
              style={{ strokeDashoffset: 290 * (1 - ringProgress) }}
            />
          </svg>
          <div className="splash-percent">{Math.round(progress)}%</div>
        </div>

        <p className="splash-message">
          {currentMessage}
        </p>

        {visibleFeatures.length > 0 && (
          <div className="splash-features">
            {visibleFeatures.map((f, i) => (
              <span key={f.label} className="splash-feature" style={{ animationDelay: `${i * 70}ms` }}>
                <f.icon size={11} />
                {f.label}
              </span>
            ))}
          </div>
        )}

        {phase === 'complete' && (
          <div className="splash-complete-burst" />
        )}
      </div>

      {phase === 'entrance' && (
        <button
          className="splash-start-btn"
          onClick={startLoading}
          style={{
            position: 'absolute',
            bottom: '10vh',
            padding: '14px 40px',
            fontSize: '0.95rem',
            fontWeight: 700,
            fontFamily: 'inherit',
            color: 'var(--on-primary)',
            background: 'var(--gradient-primary)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(var(--primary-rgb), 0.35)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            animation: 'splash-fade-in 0.45s ease 0.7s both',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(var(--primary-rgb), 0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(var(--primary-rgb), 0.35)'; }}
        >
          Comenzar
          <ArrowRight size={16} style={{ marginLeft: 8, display: 'inline-block' }} />
        </button>
      )}
    </div>
  );
}
