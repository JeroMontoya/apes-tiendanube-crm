import React from 'react';
import { Camera, AlertCircle, Users, Eye, Heart, UserCheck, TrendingUp, TrendingDown } from 'lucide-react';

function KpiCard({ icon: Icon, label, value, deltaPct, color }) {
  const isPositive = deltaPct >= 0;
  return (
    <div style={{
      background: 'var(--surface-container)', borderRadius: 12, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 130,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
        {deltaPct !== null && (
          <span style={{
            fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2,
            color: isPositive ? '#06B6D4' : '#f43f5e',
          }}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(deltaPct).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--on-surface)' }}>{value}</div>
        <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{label}</div>
      </div>
    </div>
  );
}

export default function InstagramDetailPanel({ instagramInsights, instagramLoading, instagramError }) {
  if (instagramLoading) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--on-surface-variant)', minHeight: 220 }}>
        <Camera size={22} style={{ opacity: 0.5 }} />
        <div style={{ fontSize: 12 }}>Cargando crecimiento de Instagram...</div>
      </div>
    );
  }

  if (instagramError) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, textAlign: 'center', color: 'var(--on-surface-variant)', padding: 20, minHeight: 220 }}>
        <AlertCircle size={22} color="#f43f5e" style={{ opacity: 0.7 }} />
        <div style={{ fontSize: 12 }}>{instagramError}</div>
        <div style={{ fontSize: 10, opacity: 0.7 }}>Si el error menciona un permiso faltante, revisá que el token de Meta tenga instagram_basic + instagram_manage_insights.</div>
      </div>
    );
  }

  if (!instagramInsights) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, textAlign: 'center', color: 'var(--on-surface-variant)', padding: 20, minHeight: 220 }}>
        <Camera size={22} style={{ opacity: 0.4 }} />
        <div style={{ fontSize: 12 }}>Conectá tu cuenta de Instagram Business en Configuración para ver el crecimiento real.</div>
      </div>
    );
  }

  const { username, followersCount, followerSeries, followerDeltaPct, metrics } = instagramInsights;

  const maxFollowers = Math.max(...followerSeries.map(s => s.value), 1);
  const minFollowers = Math.min(...followerSeries.map(s => s.value), maxFollowers);
  const range = maxFollowers - minFollowers || 1;
  const points = followerSeries.map((s, i) => {
    const x = followerSeries.length > 1 ? (i / (followerSeries.length - 1)) * 100 : 50;
    const y = 100 - ((s.value - minFollowers) / range) * 90 - 5;
    return `${x},${y}`;
  }).join(' ');

  const fmt = (n) => (n ?? 0).toLocaleString('es-CO');

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 600 }}>
          <Camera size={15} /> Crecimiento de Instagram {username ? `· @${username}` : ''}
        </div>
        <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 10 }}>Período seleccionado</span>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <KpiCard icon={Users} label="Seguidores" value={fmt(followersCount)} deltaPct={followerDeltaPct} color="#e1306c" />
        <KpiCard icon={Eye} label="Alcance (reach)" value={fmt(metrics.reach.total)} deltaPct={metrics.reach.deltaPct} color="#3b82f6" />
        <KpiCard icon={UserCheck} label="Cuentas alcanzadas" value={fmt(metrics.accountsEngaged.total)} deltaPct={metrics.accountsEngaged.deltaPct} color="#8b5cf6" />
        <KpiCard icon={Heart} label="Interacciones" value={fmt(metrics.totalInteractions.total)} deltaPct={metrics.totalInteractions.deltaPct} color="#f59e0b" />
        <KpiCard icon={Eye} label="Vistas" value={fmt(metrics.views.total)} deltaPct={metrics.views.deltaPct} color="#06B6D4" />
      </div>

      {/* Gráfico de seguidores */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 90 }}>
        <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>Seguidores en el período</div>
        {followerSeries.length > 1 ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ flex: 1, width: '100%' }}>
            <polyline points={points} fill="none" stroke="#e1306c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--on-surface-variant)' }}>
            Necesitás al menos 2 días de datos para ver la tendencia
          </div>
        )}
      </div>

      <div style={{ fontSize: 9, color: 'var(--on-surface-variant)', opacity: 0.7 }} title="reach, accounts_engaged, total_interactions y views son las métricas de cuenta vigentes en Graph API v22.0">
        Datos reales de Instagram Graph API v22.0 · métricas de cuenta vigentes tras la deprecación de enero 2025
      </div>
    </div>
  );
}
