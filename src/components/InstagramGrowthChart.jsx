import React from 'react';

const ACCENT = '#E1306C';

function formatCount(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function InstagramGrowthChart({ instagramInsights, instagramLoading }) {
  if (instagramLoading) {
    return (
      <div className="glass-card bento-span-12" style={{ display: 'flex', flexDirection: 'column', minHeight: 180, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: ACCENT }}>●</span> Crecimiento Instagram
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', fontSize: 12 }}>
          Cargando datos de Instagram…
        </div>
      </div>
    );
  }

  const points = instagramInsights?.data || [];
  const profile = instagramInsights?.profile;

  if (!points.length && !profile) {
    return (
      <div className="glass-card bento-span-12" style={{ display: 'flex', flexDirection: 'column', minHeight: 180, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: ACCENT }}>●</span> Crecimiento Instagram
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-surface-variant)', fontSize: 12 }}>
          Configura tu Instagram Business Account ID para ver datos de crecimiento.
        </div>
      </div>
    );
  }

  const followerData = points.length > 1 ? points : (profile ? [{ date: new Date().toISOString().substring(0, 10), count: profile.followers || 0 }] : []);
  const minCount = Math.min(...followerData.map(p => p.count));
  const maxCount = Math.max(...followerData.map(p => p.count));
  const range = maxCount - minCount || 1;

  const svgWidth = 800;
  const svgHeight = 120;
  const padding = { top: 10, right: 20, bottom: 24, left: 50 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  const pointsSvg = followerData.map((p, i) => {
    const x = padding.left + (i / Math.max(followerData.length - 1, 1)) * chartW;
    const y = padding.top + chartH - ((p.count - minCount) / range) * chartH;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding.left},${padding.top + chartH} ${pointsSvg} ${padding.left + chartW},${padding.top + chartH}`;

  const tickCount = Math.min(followerData.length, 6);
  const tickIndices = Array.from({ length: tickCount }, (_, i) => Math.round((i / (tickCount - 1)) * (followerData.length - 1)));

  return (
    <div className="glass-card bento-span-12" style={{ display: 'flex', flexDirection: 'column', minHeight: 180, gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: ACCENT }}>●</span> Crecimiento Instagram
          {profile && (
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--on-surface-variant)', opacity: 0.7 }}>
              @{profile.username} · {formatCount(profile.followers || 0)} seguidores
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', background: 'var(--border-subtle)', padding: '2px 8px', borderRadius: 10 }}>
          {followerData.length} días
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 100 }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ig-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.25" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon points={areaPoints} fill="url(#ig-gradient)" />
          <polyline
            points={pointsSvg}
            fill="none"
            stroke={ACCENT}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {followerData.map((p, i) => {
            const x = padding.left + (i / Math.max(followerData.length - 1, 1)) * chartW;
            const y = padding.top + chartH - ((p.count - minCount) / range) * chartH;
            if (!tickIndices.includes(i)) return null;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="3" fill={ACCENT} />
                <text x={x} y={svgHeight - 4} textAnchor="middle" fill="var(--on-surface-variant)" fontSize="9">
                  {p.date.substring(5)}
                </text>
                <text x={x} y={y - 8} textAnchor="middle" fill="var(--on-surface-variant)" fontSize="9" fontWeight="600">
                  {formatCount(p.count)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
