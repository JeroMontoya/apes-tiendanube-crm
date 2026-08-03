import React, { useMemo } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { BarChart3, TrendingUp, Users, Package, ArrowUpCircle, ArrowDownCircle, Clock, Award } from 'lucide-react';

export default function ProductivityDashboard() {
  const { allMembers, activityLog, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } = useTeam();

  const memberStats = useMemo(() => {
    return allMembers.map(m => {
      const memberActions = activityLog.filter(a => a.member_id === m.id);
      const stockActions = memberActions.filter(a => a.action?.startsWith('stock'));
      const pqrActions = memberActions.filter(a => a.action?.startsWith('pqr'));
      const stockIncreases = memberActions.filter(a => a.action === 'stock_increased');
      const stockDecreases = memberActions.filter(a => a.action === 'stock_decreased');
      const totalDelta = stockIncreases.reduce((sum, a) => sum + (a.details?.delta || 0), 0)
        - stockDecreases.reduce((sum, a) => sum + Math.abs(a.details?.delta || 0), 0);
      const lastActivity = memberActions.length > 0 ? memberActions[0].created_at : null;

      return {
        ...m,
        totalActions: memberActions.length,
        stockActions: stockActions.length,
        pqrActions: pqrActions.length,
        stockDelta: totalDelta,
        lastActivity,
      };
    });
  }, [allMembers, activityLog]);

  const globalStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActions = activityLog.filter(a => new Date(a.created_at) >= today);
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekActions = activityLog.filter(a => new Date(a.created_at) >= thisWeek);
    return {
      todayCount: todayActions.length,
      weekCount: weekActions.length,
      totalCount: activityLog.length,
    };
  }, [activityLog]);

  const topPerformers = [...memberStats].sort((a, b) => b.totalActions - a.totalActions).slice(0, 5);

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart3 size={18} /> Rendimiento del Equipo
      </h2>

      {/* Stats */}
      <div className="responsive-grid-sm" style={{ marginBottom: 24 }}>
        {[
          { label: 'Acciones Hoy', value: globalStats.todayCount, color: '#06B6D4', icon: TrendingUp },
          { label: 'Esta Semana', value: globalStats.weekCount, color: '#6366f1', icon: BarChart3 },
          { label: 'Total Actividad', value: globalStats.totalCount, color: '#8b5cf6', icon: Clock },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
            transition: 'transform 0.3s ease, box-shadow 0.3s ease', cursor: 'default'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${s.color}25`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${s.color}15`, color: s.color, flexShrink: 0,
            }}>
              <s.icon size={17} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', lineHeight: 1.1 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Performers */}
      <div className="glass-card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={16} color="var(--primary-container)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>Top Rendimiento</span>
        </div>
        <div style={{ padding: 0 }}>
          {topPerformers.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>Sin datos de actividad aún.</div>
          ) : (
            topPerformers.map((m, i) => {
              const maxActions = topPerformers[0]?.totalActions || 1;
              const barWidth = Math.max(5, (m.totalActions / maxActions) * 100);
              return (
                <div key={m.id} style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: i === 0 ? 'var(--primary-container)' : i === 1 ? '#8B9BB4' : i === 2 ? '#818cf8' : 'var(--outline)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: i < 3 ? '#fff' : 'var(--on-surface-variant)',
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 16 }}>{ROLE_ICONS[m.role]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{m.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLORS[m.role] }}>{m.totalActions} acciones</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--glass-border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: 2, background: `linear-gradient(90deg, ${ROLE_COLORS[m.role]}, ${ROLE_COLORS[m.role]}80)`, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detailed Member Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} color="#6366f1" />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>Detalle por Miembro</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              {['Miembro', 'Rol', 'Acciones', 'Stock', 'PQR', 'Última Actividad'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Miembro' ? 'left' : 'center', fontWeight: 600, color: 'var(--on-surface-variant)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {memberStats.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{ROLE_ICONS[m.role]}</span>
                    <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{m.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${ROLE_COLORS[m.role]}15`, color: ROLE_COLORS[m.role] }}>
                    {ROLE_LABELS[m.role]}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--on-surface)' }}>{m.totalActions}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    {m.stockDelta >= 0 ? <ArrowUpCircle size={12} color="#06B6D4" /> : <ArrowDownCircle size={12} color="#E11D48" />}
                    <span style={{ fontWeight: 600, color: m.stockDelta >= 0 ? '#06B6D4' : '#E11D48' }}>
                      {m.stockDelta >= 0 ? '+' : ''}{m.stockDelta}
                    </span>
                  </span>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--on-surface)' }}>{m.pqrActions}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: 'var(--on-surface-variant)' }}>
                  {m.lastActivity ? new Date(m.lastActivity).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
