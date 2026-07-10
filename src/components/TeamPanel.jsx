import React, { useState, useMemo } from 'react';
import { useTeam, PERMISSION_DEFS, PERMISSION_CATEGORIES } from '../contexts/TeamContext';
import {
  UserPlus, Users, Shield, X, Check, Trash2, Edit3, LogOut,
  ChevronDown, ChevronRight, Save, RotateCcw, Search, Lock,
  Crown, Wrench, DollarSign, Headphones, Eye, EyeOff, Sparkles
} from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrador', color: '#8b5cf6', icon: Crown, desc: 'Acceso total al sistema' },
  { value: 'taller', label: 'Taller', color: '#f59e0b', icon: Wrench, desc: 'Producción, stock y materiales' },
  { value: 'ventas', label: 'Ventas', color: '#10b981', icon: DollarSign, desc: 'Clientes, pipeline y ventas' },
  { value: 'atencion_cliente', label: 'Atención', color: '#3b82f6', icon: Headphones, desc: 'Clientes y soporte' },
];

const catOrder = ['views', 'taller', 'inventario', 'materiales', 'clientes', 'pqr', 'sistema'];

// ═══════════════════════════════════════════════════════════════════
// UNIFIED MEMBERS PANEL
// ═══════════════════════════════════════════════════════════════════

export default function TeamPanel() {
  const {
    currentMember, allMembers, loading, switchMember, createMember,
    updateMember, deactivateMember, setMemberPermissions, resetMemberPermissions,
    ROLE_LABELS, ROLE_COLORS, ROLE_ICONS, ROLE_DEFAULTS, hasPermission,
  } = useTeam();

  const [view, setView] = useState('list'); // list | create | edit | login
  const [selectedMember, setSelectedMember] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState({ views: true });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'taller' });
  const [editingPerms, setEditingPerms] = useState([]);

  const canManage = hasPermission('manage_team');

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return allMembers;
    const q = search.toLowerCase();
    return allMembers.filter(m => m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
  }, [allMembers, search]);

  // ── Login Screen ──────────────────────────────────────────
  if (!currentMember && view !== 'create') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{
          borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '32px 32px 24px', textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.08))',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
            }}>
              <Users size={28} color="#fff" />
            </div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--on-surface)' }}>¿Quién entró?</h2>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--on-surface-variant)' }}>Elegí tu perfil para continuar</p>
          </div>

          <div style={{ padding: '16px 24px 24px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)', fontSize: 13 }}>Cargando equipo...</div>
            ) : allMembers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, marginBottom: 16 }}>No hay miembros del equipo creados aún.</p>
                <button onClick={() => { setForm({ name: '', email: '', role: 'admin' }); setView('create'); }}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                  <UserPlus size={15} /> Crear primer miembro
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allMembers.map(m => {
                  const role = ROLES.find(r => r.value === m.role) || ROLES[0];
                  const RoleIcon = role.icon;
                  const hasCustom = m.permissions && Array.isArray(m.permissions) && m.permissions.length > 0;
                  return (
                    <div key={m.id} onClick={() => switchMember(m)} style={{
                      padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${role.color}08`; e.currentTarget.style.borderColor = `${role.color}30`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: `${role.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <RoleIcon size={18} color={role.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: role.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {role.label}
                          {hasCustom && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', fontWeight: 600 }}>PERMISOS CUSTOM</span>}
                        </div>
                      </div>
                      <LogOut size={14} color="var(--on-surface-variant)" style={{ opacity: 0.4 }} />
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

  // ═══════════════════════════════════════════════════════════════
  // MAIN MANAGEMENT VIEW
  // ═══════════════════════════════════════════════════════════════

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={22} color="#8b5cf6" /> Equipo
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--on-surface-variant)' }}>
            {allMembers.length} miembro{allMembers.length !== 1 ? 's' : ''} · {currentMember?.name} ({ROLE_LABELS[currentMember?.role]})
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { switchMember(null); setView('list'); }}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <LogOut size={12} /> Cambiar usuario
          </button>
          {canManage && (
            <button onClick={() => { setForm({ name: '', email: '', role: 'taller' }); setEditingPerms([]); setSelectedMember(null); setView('create'); }}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <UserPlus size={12} /> Nuevo Miembro
            </button>
          )}
        </div>
      </div>

      {/* ═══ CREATE / EDIT FORM ═══ */}
      {(view === 'create' || view === 'edit') && (
        <div style={{
          borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--glass-border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)', marginBottom: 20, overflow: 'hidden',
        }}>
          {/* Form Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(99,102,241,0.06))',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {view === 'create' ? <UserPlus size={16} color="#fff" /> : <Edit3 size={16} color="#fff" />}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>
                  {view === 'create' ? 'Nuevo Miembro' : `Editar: ${selectedMember?.name}`}
                </h3>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--on-surface-variant)' }}>
                  {view === 'create' ? 'Definí el rol y los permisos' : 'Modificá datos y permisos'}
                </p>
              </div>
            </div>
            <button onClick={() => { setView('list'); setSelectedMember(null); }} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: 20 }}>
            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Juan Pérez" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Email (opcional)</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="juan@equipo.com" style={inputStyle} />
              </div>
            </div>

            {/* Role Selection */}
            <label style={labelStyle}>Rol del Sistema</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
              {ROLES.map(r => {
                const RIcon = r.icon;
                const selected = form.role === r.value;
                return (
                  <div key={r.value} onClick={() => {
                    setForm(f => ({ ...f, role: r.value }));
                    // When changing role, set default perms for that role
                    setEditingPerms(ROLE_DEFAULTS[r.value] || []);
                  }} style={{
                    padding: '12px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    background: selected ? `${r.color}12` : 'rgba(255,255,255,0.03)',
                    border: selected ? `2px solid ${r.color}` : '2px solid rgba(255,255,255,0.06)',
                    transition: 'all 0.15s',
                  }}>
                    <RIcon size={20} color={selected ? r.color : 'var(--on-surface-variant)'} style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: selected ? r.color : 'var(--on-surface)' }}>{r.label}</div>
                    <div style={{ fontSize: 9, color: 'var(--on-surface-variant)', marginTop: 2 }}>{r.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* Permission Toggles */}
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span><Shield size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />Permisos Individuales</span>
              <span style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>
                {editingPerms.length} de {Object.keys(PERMISSION_DEFS).length} activos
              </span>
            </label>

            <div style={{
              borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
              maxHeight: 320, overflowY: 'auto',
            }}>
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
                                width: 16, height: 16, borderRadius: 4,
                                background: enabled ? '#10b981' : 'rgba(255,255,255,0.06)',
                                border: enabled ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              }}>
                                {enabled && <Check size={10} color="#fff" />}
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

            {/* Submit */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => { setView('list'); setSelectedMember(null); }}
                style={{ flex: 1, padding: '11px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'var(--on-surface-variant)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={async () => {
                if (!form.name.trim()) return;
                setSaving(true);
                if (view === 'create') {
                  const res = await createMember(form.name.trim(), form.email.trim(), form.role);
                  if (res?.data?.id) {
                    await setMemberPermissions(res.data.id, editingPerms);
                  }
                } else if (selectedMember) {
                  await updateMember(selectedMember.id, { name: form.name, email: form.email, role: form.role });
                  await setMemberPermissions(selectedMember.id, editingPerms);
                }
                setSaving(false);
                setView('list');
                setSelectedMember(null);
              }} disabled={saving || !form.name.trim()} style={{
                flex: 2, padding: '11px 20px', borderRadius: 10, border: 'none',
                background: saving || !form.name.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: '#fff', fontWeight: 600, fontSize: 13,
                cursor: saving || !form.name.trim() ? 'not-allowed' : 'pointer',
                opacity: saving || !form.name.trim() ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {saving ? 'Guardando...' : view === 'create' ? <><Sparkles size={14} /> Crear Miembro</> : <><Save size={14} /> Guardar Cambios</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MEMBER LIST ═══ */}
      {view === 'list' && (
        <>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar miembro..."
              style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--on-surface)', fontSize: 13, boxSizing: 'border-box' }} />
          </div>

          {/* Members Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {filteredMembers.map(m => {
              const role = ROLES.find(r => r.value === m.role) || ROLES[0];
              const RoleIcon = role.icon;
              const hasCustom = m.permissions && Array.isArray(m.permissions) && m.permissions.length > 0;
              const permCount = hasCustom ? m.permissions.length : (ROLE_DEFAULTS[m.role] || []).length;
              const isCurrent = currentMember?.id === m.id;

              return (
                <div key={m.id} style={{
                  borderRadius: 14, background: 'var(--surface)', border: `1px solid ${isCurrent ? role.color + '40' : 'var(--glass-border)'}`,
                  overflow: 'hidden', transition: 'all 0.2s',
                  boxShadow: isCurrent ? `0 4px 20px ${role.color}15` : 'none',
                }}>
                  {/* Card Header */}
                  <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 11,
                      background: `${role.color}15`, border: `1px solid ${role.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <RoleIcon size={20} color={role.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--on-surface)' }}>{m.name}</span>
                        {isCurrent && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: '#10b981', fontWeight: 700 }}>TÚ</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{m.email || 'Sin email'}</div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '0 18px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ ...tagStyle, background: `${role.color}12`, color: role.color }}>
                      {role.label}
                    </span>
                    <span style={{ ...tagStyle, background: hasCustom ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.05)', color: hasCustom ? '#8b5cf6' : 'var(--on-surface-variant)' }}>
                      <Shield size={10} /> {permCount} permisos
                    </span>
                    {hasCustom && (
                      <span style={{ ...tagStyle, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                        Custom
                      </span>
                    )}
                  </div>

                  {/* Card Actions */}
                  {canManage && (
                    <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 6 }}>
                      <button onClick={() => {
                        setForm({ name: m.name, email: m.email || '', role: m.role });
                        const base = hasCustom ? m.permissions : (ROLE_DEFAULTS[m.role] || []);
                        setEditingPerms([...base]);
                        setSelectedMember(m);
                        setView('edit');
                      }} style={{ flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <Edit3 size={11} /> Editar
                      </button>
                      {!isCurrent && (
                        <button onClick={async () => {
                          if (!confirm(`¿Eliminar a "${m.name}" del equipo?`)) return;
                          await deactivateMember(m.id);
                        }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredMembers.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <Users size={40} style={{ opacity: 0.15, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>{search ? 'No se encontraron miembros' : 'No hay miembros del equipo'}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Shared Styles ──────────────────────────────────────────
const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 13, boxSizing: 'border-box', marginBottom: 4 };
const tagStyle = { fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 };

// ── TeamMemberBadge (Header) ───────────────────────────────
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
