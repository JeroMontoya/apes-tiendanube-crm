import React, { useState } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { Clock, Package, Users, ArrowUpCircle, ArrowDownCircle, Edit3, Trash2, UserPlus, UserMinus, ShoppingCart, TrendingUp, Filter } from 'lucide-react';

const ACTION_CONFIG = {
  stock_increased: { icon: ArrowUpCircle, color: '#10b981', label: 'Stock +', template: (a) => `${a.target_name}: ${a.details?.delta > 0 ? '+' : ''}${a.details?.delta} unidades` },
  stock_decreased: { icon: ArrowDownCircle, color: '#ef4444', label: 'Stock -', template: (a) => `${a.target_name}: ${a.details?.delta} unidades` },
  stock_updated: { icon: Edit3, color: '#3b82f6', label: 'Stock Editado', template: (a) => `${a.target_name}: ${a.details?.old} → ${a.details?.new}` },
  status_changed: { icon: Package, color: 'var(--primary-container)', label: 'Estado', template: (a) => `${a.target_name}: ${a.details?.newStatus}` },
  member_created: { icon: UserPlus, color: '#8b5cf6', label: 'Miembro', template: (a) => `Nuevo miembro: ${a.target_name} (${a.details?.role})` },
  member_updated: { icon: Edit3, color: '#3b82f6', label: 'Miembro', template: (a) => `Actualizado: ${a.target_name}` },
  member_deactivated: { icon: UserMinus, color: '#ef4444', label: 'Miembro', template: (a) => `Desactivado: ${a.target_name}` },
  pqr_created: { icon: Package, color: 'var(--primary-container)', label: 'PQR', template: (a) => `PQR: ${a.target_name}` },
  pqr_updated: { icon: Edit3, color: '#3b82f6', label: 'PQR', template: (a) => `PQR actualizado: ${a.target_name}` },
};

export default function ActivityLog({ compact = false }) {
  const { activityLog, allMembers, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } = useTeam();
  const [filterMember, setFilterMember] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const filtered = activityLog.filter(a => {
    if (filterMember !== 'all' && a.member_id !== filterMember) return false;
    if (filterAction !== 'all' && !a.action?.startsWith(filterAction)) return false;
    return true;
  });

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: compact ? 16 : 18, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={compact ? 16 : 18} /> Registro de Actividad
        </h2>
      </div>

      {!compact && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <select
            value={filterMember}
            onChange={e => setFilterMember(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-medium)',
              background: 'var(--border-subtle)', color: 'var(--on-surface)', fontSize: 12,
            }}
          >
            <option value="all">Todos los miembros</option>
            {allMembers.map(m => (
              <option key={m.id} value={m.id}>{ROLE_ICONS[m.role]} {m.name}</option>
            ))}
          </select>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-medium)',
              background: 'var(--border-subtle)', color: 'var(--on-surface)', fontSize: 12,
            }}
          >
            <option value="all">Todas las acciones</option>
            <option value="stock">Stock</option>
            <option value="member">Miembros</option>
            <option value="pqr">PQR</option>
          </select>
        </div>
      )}

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13 }}>
            No hay actividad registrada aún.
          </div>
        ) : (
          <div style={{ maxHeight: compact ? 400 : 600, overflowY: 'auto' }}>
            {filtered.map((entry, i) => {
              const config = ACTION_CONFIG[entry.action] || { icon: Edit3, color: '#666', label: entry.action, template: () => entry.target_name || '' };
              const Icon = config.icon;
              const member = allMembers.find(m => m.id === entry.member_id);
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: compact ? '10px 16px' : '12px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: `${config.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={14} color={config.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--on-surface)', lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: member ? ROLE_COLORS[member.role] : '#999' }}>
                        {entry.member_name || 'Sistema'}
                      </span>
                      {' '}{config.template(entry)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                      {formatTime(entry.created_at)}
                      {member && <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 4, background: `${ROLE_COLORS[member.role]}15`, color: ROLE_COLORS[member.role], fontWeight: 500 }}>{ROLE_LABELS[member.role]}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
