import React, { useMemo, useState } from 'react';
import { BarChart3, ChevronDown, Info } from 'lucide-react';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatCohortLabel(key) {
  const [y, m] = key.split('-');
  return `${MONTH_LABELS[parseInt(m, 10) - 1]} ${y}`;
}

export default function CohortRetentionChart({ clients }) {
  const { cohorts, maxMonths } = useMemo(() => {
    if (!clients || clients.length === 0) return { cohorts: [], maxMonths: 0 };

    const clientFirstPurchase = {};
    const clientPurchases = {};

    clients.forEach(c => {
      if (!c.purchases || c.purchases.length === 0) return;
      const sorted = [...c.purchases].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstDate = new Date(sorted[0].date);
      const cohortKey = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, '0')}`;
      clientFirstPurchase[c.id] = { key: cohortKey, date: firstDate };
      clientPurchases[c.id] = sorted;
    });

    const cohortData = {};

    Object.keys(clientFirstPurchase).forEach(clientId => {
      const { key: cohortKey, date: firstDate } = clientFirstPurchase[clientId];
      if (!cohortData[cohortKey]) cohortData[cohortKey] = { size: 0, retention: {} };
      cohortData[cohortKey].size += 1;

      const uniqueMonths = new Set();
      clientPurchases[clientId].forEach(p => {
        const pDate = new Date(p.date);
        const monthDiff = (pDate.getFullYear() - firstDate.getFullYear()) * 12 + (pDate.getMonth() - firstDate.getMonth());
        if (monthDiff >= 0) uniqueMonths.add(monthDiff);
      });

      uniqueMonths.forEach(m => {
        cohortData[cohortKey].retention[m] = (cohortData[cohortKey].retention[m] || 0) + 1;
      });
    });

    const sortedCohorts = Object.keys(cohortData).sort();
    let maxM = 0;

    const formattedCohorts = sortedCohorts.map(key => {
      const data = cohortData[key];
      const months = Object.keys(data.retention).map(Number);
      if (months.length > 0) maxM = Math.max(maxM, Math.max(...months));
      return { key, label: formatCohortLabel(key), size: data.size, retention: data.retention };
    });

    return { cohorts: formattedCohorts, maxMonths: Math.min(maxM, 11) };
  }, [clients]);

  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const getHeatColor = (pct) => {
    if (pct === 0) return { bg: 'var(--surface-container)', text: 'var(--on-surface-variant)' };
    if (pct < 10) return { bg: 'rgba(99,102,241,0.08)', text: 'var(--primary)' };
    if (pct < 25) return { bg: 'rgba(99,102,241,0.15)', text: 'var(--primary)' };
    if (pct < 50) return { bg: 'rgba(99,102,241,0.25)', text: 'var(--primary-glow)' };
    if (pct < 75) return { bg: 'rgba(99,102,241,0.4)', text: 'var(--primary-container)' };
    return { bg: 'rgba(99,102,241,0.55)', text: '#ffffff' };
  };

  const totalClients = cohorts.reduce((s, c) => s + c.size, 0);

  return (
    <div style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'var(--glass-blur)',
      border: '1px solid var(--glass-border)',
      borderRadius: 16,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
      borderColor: open ? 'rgba(99,102,241,0.2)' : 'var(--glass-border)'
    }}>
      {/* Collapsible Header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 22px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-container)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(99,102,241,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open ? '0 2px 12px rgba(99,102,241,0.3)' : '0 2px 8px rgba(99,102,241,0.15)',
          transition: 'box-shadow 0.2s',
          flexShrink: 0
        }}>
          <BarChart3 size={17} color="var(--primary)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)', lineHeight: 1.2 }}>
            ¿Qué tan bien regresan tus clientes?
          </div>
          <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2, opacity: 0.7 }}>
            {cohorts.length > 0
              ? `${cohorts.length} grupo${cohorts.length > 1 ? 's' : ''} · ${totalClients} cliente${totalClients !== 1 ? 's' : ''}`
              : 'Sin datos de compra aún'}
          </div>
        </div>

        {/* Summary dots — only when closed */}
        {!open && cohorts.length > 0 && (
          <div style={{ display: 'flex', gap: 3, marginRight: 4 }}>
            {[0.3, 0.5, 0.7].map((v, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: getHeatColor(v * 100).bg, border: '1px solid var(--border-subtle)' }} />
            ))}
          </div>
        )}

        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--surface-container)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          flexShrink: 0
        }}>
          <ChevronDown size={14} color="var(--on-surface-variant)" />
        </div>
      </button>

      {/* Content */}
      {open && (
        <div style={{
          borderTop: '1px solid var(--border-subtle)',
          animation: 'slideDown 0.25s ease'
        }}>
          {/* Legend + Info */}
          <div style={{ padding: '12px 22px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--on-surface-variant)' }}>
              <span>Pocos regresan</span>
              {[10, 25, 50, 75].map(p => (
                <div key={p} style={{ width: 16, height: 10, borderRadius: 2, background: getHeatColor(p).bg, border: '1px solid var(--border-subtle)' }} />
              ))}
              <span>Muchos regresan</span>
            </div>
            <div style={{ position: 'relative' }}>
              <div
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                style={{ cursor: 'help', opacity: 0.4, transition: 'opacity 0.2s', display: 'flex' }}
              >
                <Info size={13} />
              </div>
              {showTooltip && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 8,
                  width: 220, padding: '12px 14px', borderRadius: 10,
                  background: 'var(--surface)', border: '1px solid var(--glass-border)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  fontSize: 11, color: 'var(--on-surface)', lineHeight: 1.5, zIndex: 50
                }}>
                  <strong>Cómo leerlo:</strong><br />
                  Cada fila es un grupo de clientes que compraron por primera vez en ese mes.<br /><br />
                  Más verde = más clientes regresando.
                </div>
              )}
            </div>
          </div>

          {/* Heatmap */}
          <div style={{ padding: '14px 22px 18px', overflowX: 'auto' }}>
            {cohorts.length === 0 ? (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: 12, opacity: 0.6, margin: 0, padding: '8px 0' }}>Aún no hay suficientes compras para ver el comportamiento.</p>
            ) : (
              <div style={{ minWidth: 500 }}>
                {/* Column Headers */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ width: 100, fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mes</div>
                  <div style={{ width: 40, fontSize: 9, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>N</div>
                  {Array.from({ length: maxMonths + 1 }).map((_, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 8, fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {i === 0 ? 'Inicio' : `+${i}m`}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {cohorts.map((c, rowIdx) => (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', marginBottom: 3, animation: `slideUp 0.3s ease ${rowIdx * 0.04}s both` }}>
                    <div style={{ width: 100, fontSize: 11, fontWeight: 600, color: 'var(--on-surface)', fontFamily: "'JetBrains Mono', monospace" }}>{c.label}</div>
                    <div style={{ width: 40, fontSize: 10, fontWeight: 700, color: 'var(--primary)', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{c.size}</div>

                    {Array.from({ length: maxMonths + 1 }).map((_, i) => {
                      const val = c.retention[i] || 0;
                      const perc = c.size > 0 ? (val / c.size) * 100 : 0;
                      const isMonth0 = i === 0;
                      const heat = isMonth0 ? { bg: 'rgba(99,102,241,0.1)', text: 'var(--primary)' } : getHeatColor(perc);

                      return (
                        <div key={i} style={{ flex: 1, padding: 1.5 }}>
                          <div
                            title={isMonth0 ? `${c.size} clientes compraron` : (perc > 0 ? `${c.size} clientes, ${val} volvieron (${perc.toFixed(0)}%)` : 'Ninguno regresó')}
                            style={{
                              height: 28, borderRadius: 5,
                              background: heat.bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: isMonth0 ? 700 : 600,
                              color: heat.text,
                              border: isMonth0 ? '1px solid rgba(99,102,241,0.15)' : '1px solid transparent',
                              fontFamily: "'JetBrains Mono', monospace",
                              cursor: 'default'
                            }}
                          >
                            {isMonth0 ? `${c.size} cli` : (perc > 0 ? `${perc.toFixed(0)}%` : '—')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 600px; } }
      `}</style>
    </div>
  );
}
