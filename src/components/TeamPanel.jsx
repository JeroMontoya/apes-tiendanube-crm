import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTeam, PERMISSION_DEFS, PERMISSION_CATEGORIES } from '../contexts/TeamContext';
import {
  UserPlus, Users, Shield, X, Check, Trash2, Edit3, LogOut,
  ChevronDown, ChevronRight, Save, RotateCcw, Search,
  Crown, Wrench, DollarSign, Headphones, Eye, EyeOff, Sparkles,
  Activity, LayoutGrid, List, BarChart3, Filter, ArrowRight,
  Lock, Unlock, Zap, Target, RefreshCw, TrendingUp, Clock, Info
} from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrador', color: '#8b5cf6', icon: Crown, desc: 'Acceso total al sistema' },
  { value: 'taller', label: 'Taller', color: '#f59e0b', icon: Wrench, desc: 'Producción, stock y materiales' },
  { value: 'ventas', label: 'Ventas', color: '#10b981', icon: DollarSign, desc: 'Clientes, pipeline y ventas' },
  { value: 'atencion_cliente', label: 'Atención', color: '#3b82f6', icon: Headphones, desc: 'Clientes y soporte' },
];

const catOrder = ['views', 'taller', 'inventario', 'materiales', 'clientes', 'pqr', 'sistema'];
const TOTAL_PERMS = Object.keys(PERMISSION_DEFS).length;

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

const ACTION_ICONS = {
  member_created: { icon: UserPlus, color: '#10b981', label: 'Creó miembro' },
  member_updated: { icon: Edit3, color: '#3b82f6', label: 'Editó miembro' },
  member_deactivated: { icon: Trash2, color: '#ef4444', label: 'Eliminó miembro' },
  permissions_updated: { icon: Shield, color: '#f59e0b', label: 'Cambió permisos' },
  permissions_reset: { icon: RefreshCw, color: '#8b5cf6', label: 'Restauró permisos' },
};

// ═══════════════════════════════════════════════════════════════════
// MAIN TEAM PANEL
// ═══════════════════════════════════════════════════════════════════
export default function TeamPanel() {
  const {
    currentMember, allMembers, loading, activityLog, switchMember, createMember,
    updateMember, deactivateMember, setMemberPermissions, resetMemberPermissions,
    ROLE_LABELS, ROLE_COLORS, ROLE_ICONS, ROLE_DEFAULTS, hasPermission,
  } = useTeam();

  const [tab, setTab] = useState('team'); // team | matrix | activity
  const [view, setView] = useState('list'); // list | create | edit
  const [drawerMember, setDrawerMember] = useState(null); // detail drawer
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'taller' });
  const [editingPerms, setEditingPerms] = useState([]);
  const [expandedCats, setExpandedCats] = useState({ views: true });
  const [matrixFilter, setMatrixFilter] = useState('all');

  const canManage = hasPermission('manage_team');

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const filteredMembers = useMemo(() => {
    let list = allMembers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
    }
    if (roleFilter !== 'all') list = list.filter(m => m.role === roleFilter);
    return list;
  }, [allMembers, search, roleFilter]);

  const roleDistribution = useMemo(() => {
    const dist = {};
    ROLES.forEach(r => { dist[r.value] = 0; });
    allMembers.forEach(m => { if (dist[m.role] !== undefined) dist[m.role]++; });
    return dist;
  }, [allMembers]);

  const avgPermCoverage = useMemo(() => {
    if (allMembers.length === 0) return 0;
    const total = allMembers.reduce((sum, m) => {
      const perms = m.permissions?.length > 0 ? m.permissions : (ROLE_DEFAULTS[m.role] || []);
      return sum + perms.length;
    }, 0);
    return Math.round((total / allMembers.length / TOTAL_PERMS) * 100);
  }, [allMembers, ROLE_DEFAULTS]);

  const openEdit = (m) => {
    setForm({ name: m.name, email: m.email || '', role: m.role });
    const base = m.permissions?.length > 0 ? m.permissions : (ROLE_DEFAULTS[m.role] || []);
    setEditingPerms([...base]);
    setView('edit');
    setDrawerMember(null);
  };

  // ═══ LOGIN SCREEN ═══
  if (!currentMember && view !== 'create') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{
          borderRadius: 24, background: 'var(--surface)', border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '40px 32px 28px', textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.08))',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', boxShadow: '0 12px 32px rgba(99,102,241,0.4)',
            }}>
              <Users size={32} color="#fff" />
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--on-surface)' }}>
              Centro de Equipo
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
              Elegí tu perfil para acceder al sistema
            </p>
          </div>
          <div style={{ padding: '16px 20px 24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--on-surface-variant)', fontSize: 13 }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginBottom: 8 }} />
                <div>Cargando equipo...</div>
              </div>
            ) : allMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, marginBottom: 20 }}>
                  Tu equipo está vacío. Creá el primer miembro para empezar.
                </p>
                <button onClick={() => { setForm({ name: '', email: '', role: 'admin' }); setView('create'); }}
                  style={{
                    padding: '12px 24px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
                  }}>
                  <UserPlus size={18} /> Crear primer miembro
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allMembers.map(m => {
                  const role = ROLES.find(r => r.value === m.role) || ROLES[0];
                  const RoleIcon = role.icon;
                  const permCount = m.permissions?.length > 0 ? m.permissions.length : (ROLE_DEFAULTS[m.role] || []).length;
                  return (
                    <div key={m.id} onClick={() => switchMember(m)} style={{
                      padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${role.color}08`; e.currentTarget.style.borderColor = `${role.color}30`; e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: `linear-gradient(135deg, ${role.color}20, ${role.color}08)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        border: `1px solid ${role.color}20`,
                      }}>
                        <RoleIcon size={20} color={role.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: role.color, marginTop: 2 }}>{role.label}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface-variant)',
                        }}>{permCount} permisos</span>
                        <ArrowRight size={14} color="var(--on-surface-variant)" style={{ opacity: 0.3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══ MAIN VIEW ═══
  return (
    <div style={{ position: 'relative' }}>
      {/* ── Stats Bar ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20,
      }}>
        {[
          { label: 'Miembros', value: allMembers.length, icon: Users, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
          { label: 'Roles activos', value: Object.values(roleDistribution).filter(v => v > 0).length, icon: Target, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
          { label: 'Permisos promedio', value: `${avgPermCoverage}%`, icon: Shield, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Actividad reciente', value: activityLog.length, icon: Activity, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '16px 18px', borderRadius: 14, background: 'var(--surface)',
            border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: s.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <s.icon size={18} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--on-surface)' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Role Distribution Bars ── */}
      <div style={{
        padding: '16px 20px', borderRadius: 14, background: 'var(--surface)',
        border: '1px solid var(--glass-border)', marginBottom: 20,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={14} color="#8b5cf6" /> Distribución de Roles
        </div>
        <div style={{ display: 'flex', gap: 6, height: 8, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
          {ROLES.map(r => {
            const pct = allMembers.length > 0 ? (roleDistribution[r.value] / allMembers.length) * 100 : 0;
            return pct > 0 ? (
              <div key={r.value} title={`${r.label}: ${roleDistribution[r.value]}`}
                style={{ width: `${pct}%`, background: r.color, borderRadius: 4, transition: 'width 0.3s' }} />
            ) : null;
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
          {ROLES.map(r => (
            <div key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
              <span style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>
                {r.label} ({roleDistribution[r.value]})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
        {[
          { id: 'team', label: 'Equipo', icon: Users },
          { id: 'matrix', label: 'Matriz de Permisos', icon: LayoutGrid },
          { id: 'activity', label: 'Actividad', icon: Activity },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: tab === t.id ? 'rgba(139,92,246,0.12)' : 'transparent',
            color: tab === t.id ? '#8b5cf6' : 'var(--on-surface-variant)',
            fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s',
          }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TEAM TAB ═══ */}
      {tab === 'team' && (
        <>
          {/* Search + Filters + Actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o email..."
                style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--on-surface)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 3 }}>
              <button onClick={() => setRoleFilter('all')} style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                background: roleFilter === 'all' ? 'rgba(139,92,246,0.15)' : 'transparent',
                color: roleFilter === 'all' ? '#8b5cf6' : 'var(--on-surface-variant)',
              }}>Todos</button>
              {ROLES.map(r => (
                <button key={r.value} onClick={() => setRoleFilter(r.value)} style={{
                  padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  background: roleFilter === r.value ? `${r.color}18` : 'transparent',
                  color: roleFilter === r.value ? r.color : 'var(--on-surface-variant)',
                }}>{r.label.split(' ')[0]}</button>
              ))}
            </div>
            {canManage && (
              <button onClick={() => { setForm({ name: '', email: '', role: 'taller' }); setEditingPerms(ROLE_DEFAULTS.taller || []); setView('create'); }}
                style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 16px rgba(99,102,241,0.25)', whiteSpace: 'nowrap' }}>
                <UserPlus size={14} /> Nuevo
              </button>
            )}
          </div>

          {/* Members Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {filteredMembers.map(m => {
              const role = ROLES.find(r => r.value === m.role) || ROLES[0];
              const RoleIcon = role.icon;
              const hasCustom = m.permissions?.length > 0;
              const permCount = hasCustom ? m.permissions.length : (ROLE_DEFAULTS[m.role] || []).length;
              const permPct = Math.round((permCount / TOTAL_PERMS) * 100);
              const isCurrent = currentMember?.id === m.id;

              return (
                <div key={m.id} style={{
                  borderRadius: 16, background: 'var(--surface)', border: `1px solid ${isCurrent ? role.color + '40' : 'var(--glass-border)'}`,
                  overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer',
                  boxShadow: isCurrent ? `0 4px 24px ${role.color}12` : '0 2px 8px rgba(0,0,0,0.06)',
                }}
                onClick={() => setDrawerMember(m)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${role.color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isCurrent ? `0 4px 24px ${role.color}12` : '0 2px 8px rgba(0,0,0,0.06)'; }}
                >
                  {/* Card Top Gradient */}
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${role.color}, ${role.color}60)` }} />

                  <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: `linear-gradient(135deg, ${role.color}22, ${role.color}08)`,
                      border: `1.5px solid ${role.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      fontSize: 16, fontWeight: 800, color: role.color,
                    }}>
                      {getInitials(m.name)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>{m.name}</span>
                        {isCurrent && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(16,185,129,0.12)', color: '#10b981', letterSpacing: 0.5 }}>TÚ</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 2 }}>{m.email || 'Sin email'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${role.color}12`, color: role.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <RoleIcon size={10} /> {role.label}
                        </span>
                        {hasCustom && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                            Personalizado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Permission Bar */}
                  <div style={{ padding: '0 20px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                        <Shield size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {permCount} de {TOTAL_PERMS} permisos
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: permPct >= 80 ? '#10b981' : permPct >= 40 ? '#f59e0b' : '#ef4444' }}>
                        {permPct}%
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${permPct}%`, borderRadius: 2,
                        background: permPct >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : permPct >= 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <Users size={48} style={{ opacity: 0.1, marginBottom: 12 }} />
              <p style={{ fontSize: 15, fontWeight: 600 }}>{search || roleFilter !== 'all' ? 'No se encontraron miembros' : 'No hay miembros del equipo'}</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Creá tu primer miembro para empezar a gestionar el equipo</p>
            </div>
          )}
        </>
      )}

      {/* ═══ PERMISSION MATRIX TAB ═══ */}
      {tab === 'matrix' && (
        <PermissionMatrix
          members={filteredMembers}
          matrixFilter={matrixFilter}
          setMatrixFilter={setMatrixFilter}
        />
      )}

      {/* ═══ ACTIVITY TAB ═══ */}
      {tab === 'activity' && (
        <ActivityTimeline activityLog={activityLog} />
      )}

      {/* ═══ MEMBER DETAIL DRAWER ═══ */}
      {drawerMember && (
        <MemberDrawer
          member={drawerMember}
          onClose={() => setDrawerMember(null)}
          onEdit={() => openEdit(drawerMember)}
          onDelete={async () => {
            if (!confirm(`¿Eliminar a "${drawerMember.name}" del equipo?`)) return;
            await deactivateMember(drawerMember.id);
            setDrawerMember(null);
            showToast(`${drawerMember.name} eliminado del equipo`);
          }}
          canManage={canManage}
          isCurrent={currentMember?.id === drawerMember.id}
          activityLog={activityLog}
        />
      )}

      {/* ═══ CREATE / EDIT FORM DRAWER ═══ */}
      {(view === 'create' || view === 'edit') && (
        <FormDrawer
          view={view}
          form={form}
          setForm={setForm}
          editingPerms={editingPerms}
          setEditingPerms={setEditingPerms}
          expandedCats={expandedCats}
          setExpandedCats={setExpandedCats}
          saving={saving}
          setSaving={setSaving}
          onCancel={() => { setView('list'); }}
          onSubmit={async () => {
            if (!form.name.trim()) return;
            setSaving(true);
            if (view === 'create') {
              const res = await createMember(form.name.trim(), form.email.trim(), form.role);
              if (res?.data?.id) await setMemberPermissions(res.data.id, editingPerms);
              showToast(`${form.name} fue agregado al equipo`);
            } else {
              await updateMember(drawerMember?.id, { name: form.name, email: form.email, role: form.role });
              await setMemberPermissions(drawerMember?.id, editingPerms);
              showToast('Cambios guardados');
            }
            setSaving(false);
            setView('list');
            setDrawerMember(null);
          }}
        />
      )}

      {/* ═══ TOAST ═══ */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 12,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
          color: '#fff', fontSize: 13, fontWeight: 600, zIndex: 3000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s ease',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.type === 'success' ? <Check size={14} /> : <X size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PERMISSION MATRIX
// ═══════════════════════════════════════════════════════════════════
function PermissionMatrix({ members, matrixFilter, setMatrixFilter }) {
  const { ROLE_DEFAULTS } = useTeam();

  const filteredCats = useMemo(() => {
    if (matrixFilter === 'all') return catOrder;
    return [matrixFilter];
  }, [matrixFilter]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <LayoutGrid size={16} color="#8b5cf6" /> Matriz de Permisos
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3 }}>
          <button onClick={() => setMatrixFilter('all')} style={{
            padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
            background: matrixFilter === 'all' ? 'rgba(139,92,246,0.15)' : 'transparent',
            color: matrixFilter === 'all' ? '#8b5cf6' : 'var(--on-surface-variant)',
          }}>Todos</button>
          {catOrder.map(cat => (
            <button key={cat} onClick={() => setMatrixFilter(cat)} style={{
              padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600,
              background: matrixFilter === cat ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: matrixFilter === cat ? '#8b5cf6' : 'var(--on-surface-variant)',
            }}>{PERMISSION_CATEGORIES[cat].icon}</button>
          ))}
        </div>
      </div>

      <div style={{ borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1, minWidth: 140 }}>Permiso</th>
                {members.map(m => (
                  <th key={m.id} style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--on-surface-variant)', fontSize: 10, minWidth: 80 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span>{m.name.split(' ')[0]}</span>
                      <span style={{ fontSize: 9, color: ROLES.find(r => r.value === m.role)?.color || '#888' }}>
                        {ROLES.find(r => r.value === m.role)?.label.split(' ')[0]}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCats.map(cat => {
                const permsInCat = Object.entries(PERMISSION_DEFS).filter(([, def]) => def.cat === cat);
                return permsInCat.map(([permId, permDef], idx) => (
                  <tr key={permId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{
                      padding: '8px 16px', fontWeight: 500, color: 'var(--on-surface)',
                      position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {idx === 0 && <span style={{ fontSize: 9, color: PERMISSION_CATEGORIES[cat]?.icon }}>{PERMISSION_CATEGORIES[cat]?.icon}</span>}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{permDef.label}</div>
                          <div style={{ fontSize: 9, color: 'var(--on-surface-variant)' }}>{permDef.desc}</div>
                        </div>
                      </div>
                    </td>
                    {members.map(m => {
                      const has = m.permissions?.length > 0
                        ? m.permissions.includes(permId)
                        : (ROLE_DEFAULTS[m.role] || []).includes(permId);
                      return (
                        <td key={m.id} style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 6, margin: '0 auto',
                            background: has ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.06)',
                            border: has ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.04)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {has ? <Check size={12} color="#10b981" /> : <X size={10} color="rgba(255,255,255,0.15)" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>

      {members.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          <LayoutGrid size={48} style={{ opacity: 0.1, marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>No hay miembros para mostrar</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ACTIVITY TIMELINE
// ═══════════════════════════════════════════════════════════════════
function ActivityTimeline({ activityLog }) {
  const grouped = useMemo(() => {
    const groups = {};
    activityLog.forEach(entry => {
      const date = new Date(entry.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
    });
    return groups;
  }, [activityLog]);

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity size={16} color="#f59e0b" /> Historial de Actividad
      </div>

      {activityLog.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
          <Clock size={48} style={{ opacity: 0.1, marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600 }}>Sin actividad registrada</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Las acciones del equipo aparecerán aquí</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, entries]) => (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-surface-variant)', marginBottom: 8, paddingLeft: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={12} /> {date}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderLeft: '2px solid rgba(255,255,255,0.06)', marginLeft: 6 }}>
              {entries.map(entry => {
                const action = ACTION_ICONS[entry.action] || { icon: Zap, color: '#888', label: entry.action };
                const ActionIcon = action.icon;
                return (
                  <div key={entry.id} style={{
                    padding: '10px 14px', borderRadius: 10, marginLeft: 14, position: 'relative',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{
                      position: 'absolute', left: -21, top: 14, width: 10, height: 10, borderRadius: '50%',
                      background: action.color, border: '2px solid var(--surface)',
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 7, background: `${action.color}12`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <ActionIcon size={13} color={action.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)' }}>
                          <span style={{ color: action.color }}>{entry.member_name}</span>
                          {' · '}{action.label}
                        </div>
                        {entry.target_name && (
                          <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 1 }}>
                            {entry.target_name}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', flexShrink: 0 }}>
                        {timeAgo(entry.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MEMBER DETAIL DRAWER
// ═══════════════════════════════════════════════════════════════════
function MemberDrawer({ member, onClose, onEdit, onDelete, canManage, isCurrent, activityLog }) {
  const { ROLE_DEFAULTS } = useTeam();
  const role = ROLES.find(r => r.value === member.role) || ROLES[0];
  const RoleIcon = role.icon;
  const hasCustom = member.permissions?.length > 0;
  const permCount = hasCustom ? member.permissions.length : (ROLE_DEFAULTS[member.role] || []).length;
  const permPct = Math.round((permCount / TOTAL_PERMS) * 100);
  const memberActivity = activityLog.filter(a => a.member_id === member.id).slice(0, 10);

  const permsByCategory = useMemo(() => {
    const result = {};
    const effectivePerms = hasCustom ? member.permissions : (ROLE_DEFAULTS[member.role] || []);
    catOrder.forEach(cat => {
      const perms = Object.entries(PERMISSION_DEFS).filter(([id, def]) => def.cat === cat);
      const enabled = perms.filter(([id]) => effectivePerms.includes(id));
      result[cat] = { total: perms.length, enabled: enabled.length, perms: enabled.map(([id, def]) => def.label) };
    });
    return result;
  }, [member, hasCustom, ROLE_DEFAULTS]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{
        width: 420, maxWidth: '90vw', height: '100%', background: 'var(--surface)',
        borderLeft: '1px solid var(--glass-border)', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: `linear-gradient(135deg, ${role.color}08, transparent)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `linear-gradient(135deg, ${role.color}22, ${role.color}08)`,
                border: `2px solid ${role.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 800, color: role.color,
              }}>
                {getInitials(member.name)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--on-surface)' }}>{member.name}</h2>
                  {isCurrent && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>TÚ</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 2 }}>{member.email || 'Sin email'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: `${role.color}12`, color: role.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <RoleIcon size={10} /> {role.label}
                  </span>
                  {hasCustom && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Permisos custom</span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: 4 }}>
              <X size={20} />
            </button>
          </div>

          {/* Actions */}
          {canManage && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={onEdit} style={{
                flex: 1, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)', color: 'var(--on-surface)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Edit3 size={13} /> Editar
              </button>
              {!isCurrent && (
                <button onClick={onDelete} style={{
                  padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Trash2 size={13} /> Eliminar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Permission Overview */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={14} color="#8b5cf6" /> Resumen de Permisos
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${permPct}%`, borderRadius: 3,
                    background: permPct >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : permPct >= 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                  }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: permPct >= 80 ? '#10b981' : permPct >= 40 ? '#f59e0b' : '#ef4444', minWidth: 36, textAlign: 'right' }}>
                {permCount}/{TOTAL_PERMS}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 }}>
              {catOrder.map(cat => {
                const data = permsByCategory[cat];
                if (!data) return null;
                const catDef = PERMISSION_CATEGORIES[cat];
                const pct = data.total > 0 ? (data.enabled / data.total) * 100 : 0;
                return (
                  <div key={cat} style={{
                    padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{catDef.icon}</span> {catDef.label}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: pct === 100 ? '#10b981' : pct > 0 ? '#f59e0b' : 'var(--on-surface-variant)' }}>
                        {data.enabled}/{data.total}
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: pct === 100 ? '#10b981' : '#f59e0b', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="#f59e0b" /> Actividad Reciente
            </div>
            {memberActivity.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', textAlign: 'center', padding: 20 }}>Sin actividad reciente</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {memberActivity.map(entry => {
                  const action = ACTION_ICONS[entry.action] || { icon: Zap, color: '#888', label: entry.action };
                  const ActionIcon = action.icon;
                  return (
                    <div key={entry.id} style={{
                      padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(255,255,255,0.02)',
                    }}>
                      <ActionIcon size={12} color={action.color} />
                      <span style={{ fontSize: 11, color: 'var(--on-surface)', flex: 1 }}>{action.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{timeAgo(entry.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FORM DRAWER
// ═══════════════════════════════════════════════════════════════════
function FormDrawer({ view, form, setForm, editingPerms, setEditingPerms, expandedCats, setExpandedCats, saving, setSaving, onCancel, onSubmit }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'flex-end' }} onClick={onCancel}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, maxWidth: '95vw', height: '100%', background: 'var(--surface)',
        borderLeft: '1px solid var(--glass-border)', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.06))',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {view === 'create' ? <UserPlus size={18} color="#fff" /> : <Edit3 size={18} color="#fff" />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>
                {view === 'create' ? 'Nuevo Miembro' : 'Editar Miembro'}
              </h3>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--on-surface-variant)' }}>
                {view === 'create' ? 'Completá los datos y definí los permisos' : 'Modificá datos y permisos'}
              </p>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Basic Info */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Nombre *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Juan Pérez" style={inputStyle} autoFocus />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Email (opcional)</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@equipo.com" style={inputStyle} />
          </div>

          {/* Role Selection */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Rol del Sistema</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {ROLES.map(r => {
                const RIcon = r.icon;
                const selected = form.role === r.value;
                const rolePermCount = (ROLE_DEFAULTS[r.value] || []).length;
                return (
                  <div key={r.value} onClick={() => {
                    setForm(f => ({ ...f, role: r.value }));
                    setEditingPerms(ROLE_DEFAULTS[r.value] || []);
                  }} style={{
                    padding: '14px', borderRadius: 12, cursor: 'pointer',
                    background: selected ? `${r.color}10` : 'rgba(255,255,255,0.03)',
                    border: selected ? `2px solid ${r.color}` : '2px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${r.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RIcon size={16} color={selected ? r.color : 'var(--on-surface-variant)'} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: selected ? r.color : 'var(--on-surface)' }}>{r.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{r.desc}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>
                      {rolePermCount} permisos incluidos
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Permission Toggles */}
          <div>
            <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span><Shield size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />Permisos Individuales</span>
              <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>
                {editingPerms.length} de {TOTAL_PERMS} activos
              </span>
            </div>
            <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', maxHeight: 360, overflowY: 'auto' }}>
              {catOrder.map(cat => {
                const catDef = PERMISSION_CATEGORIES[cat];
                const permsInCat = Object.entries(PERMISSION_DEFS).filter(([, def]) => def.cat === cat);
                const enabledCount = permsInCat.filter(([id]) => editingPerms.includes(id)).length;
                const allEnabled = enabledCount === permsInCat.length;
                const isExpanded = expandedCats[cat];

                return (
                  <div key={cat} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))} style={{
                      padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: allEnabled ? 'rgba(16,185,129,0.04)' : 'transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isExpanded ? <ChevronDown size={13} color="var(--on-surface-variant)" /> : <ChevronRight size={13} color="var(--on-surface-variant)" />}
                        <span>{catDef.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface)' }}>{catDef.label}</span>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: allEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)',
                          color: allEnabled ? '#10b981' : 'var(--on-surface-variant)',
                        }}>{enabledCount}/{permsInCat.length}</span>
                      </div>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        const ids = permsInCat.map(([id]) => id);
                        if (allEnabled) setEditingPerms(prev => prev.filter(p => !ids.includes(p)));
                        else setEditingPerms(prev => [...new Set([...prev, ...ids])]);
                      }} style={{
                        padding: '3px 8px', borderRadius: 5, border: 'none', fontSize: 9, fontWeight: 600, cursor: 'pointer',
                        background: allEnabled ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: allEnabled ? '#ef4444' : '#10b981',
                      }}>
                        {allEnabled ? 'Quitar' : 'Dar'}
                      </button>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '4px 14px 10px 32px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {permsInCat.map(([permId, permDef]) => {
                          const enabled = editingPerms.includes(permId);
                          return (
                            <div key={permId} onClick={() => {
                              setEditingPerms(prev => enabled ? prev.filter(p => p !== permId) : [...prev, permId]);
                            }} style={{
                              padding: '6px 10px', borderRadius: 7, cursor: 'pointer',
                              background: enabled ? 'rgba(16,185,129,0.06)' : 'transparent',
                              border: `1px solid ${enabled ? 'rgba(16,185,129,0.12)' : 'transparent'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.1s',
                            }}>
                              <div>
                                <span style={{ fontSize: 11, fontWeight: 500, color: enabled ? '#10b981' : 'var(--on-surface)' }}>{permDef.label}</span>
                                <span style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginLeft: 8 }}>{permDef.desc}</span>
                              </div>
                              <div style={{
                                width: 18, height: 18, borderRadius: 5,
                                background: enabled ? '#10b981' : 'rgba(255,255,255,0.06)',
                                border: enabled ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>
                                {enabled && <Check size={11} color="#fff" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '11px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: 'var(--on-surface-variant)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button onClick={onSubmit} disabled={saving || !form.name.trim()} style={{
            flex: 2, padding: '11px 20px', borderRadius: 10, border: 'none',
            background: saving || !form.name.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: '#fff', fontWeight: 700, fontSize: 13,
            cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !form.name.trim() ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {saving ? 'Guardando...' : view === 'create' ? <><Sparkles size={14} /> Crear Miembro</> : <><Save size={14} /> Guardar Cambios</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared Styles ──────────────────────────────────────────
const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 13, boxSizing: 'border-box', marginBottom: 4 };

// ═══════════════════════════════════════════════════════════════════
// TEAM MEMBER BADGE (Header)
// ═══════════════════════════════════════════════════════════════════
export function TeamMemberBadge() {
  const { currentMember, allMembers, selectMember } = useTeam();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!currentMember) return null;
  const ROLE_ICONS = { admin: '👑', ventas: '💰', taller: '⚙️', atencion_cliente: '🎧' };
  const ROLE_COLORS = { admin: '#f59e0b', ventas: '#10b981', taller: '#3b82f6', atencion_cliente: '#8b5cf6' };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', zIndex: 9999 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
        color: 'var(--on-surface)', cursor: 'pointer', fontSize: 13, fontWeight: 500
      }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: ROLE_COLORS[currentMember.role] + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
          {ROLE_ICONS[currentMember.role]}
        </div>
        <span>{currentMember.name.split(' ')[0]}</span>
        <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 220,
          background: 'rgba(15,15,25,0.97)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
          {allMembers.map(member => (
            <button key={member.id} onClick={() => { selectMember(member); setOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, border: 'none', background: currentMember.id === member.id ? 'rgba(16,185,129,0.12)' : 'transparent',
                color: 'var(--on-surface)', cursor: 'pointer', textAlign: 'left',
                borderLeft: currentMember.id === member.id ? '2px solid #10b981' : '2px solid transparent'
              }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: ROLE_COLORS[member.role] + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                {ROLE_ICONS[member.role]}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{member.name.split(' ')[0]}</div>
                <div style={{ fontSize: 10, opacity: 0.5 }}>{member.role === 'admin' ? 'Admin' : member.role === 'ventas' ? 'Ventas' : member.role === 'taller' ? 'Taller' : 'Servicio'}</div>
              </div>
            </button>
          ))}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 0' }} />
          <button onClick={() => { selectMember(null); setOpen(false); }} style={{
            width: '100%', padding: '8px 10px', borderRadius: 8, border: 'none',
            background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600
          }}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
