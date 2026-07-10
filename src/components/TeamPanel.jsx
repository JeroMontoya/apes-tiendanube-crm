import React, { useState } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { UserPlus, Users, Shield, X, Check, Trash2, Edit3, LogOut } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrador', color: '#8b5cf6', icon: '👑', desc: 'Acceso total al sistema' },
  { value: 'taller', label: 'Taller (Producción)', color: '#f59e0b', icon: '🧵', desc: 'Productos, stock y producción' },
  { value: 'ventas', label: 'Ventas', color: '#10b981', icon: '💰', desc: 'Clientes, pipeline y ventas' },
  { value: 'atencion_cliente', label: 'Atención al Cliente', color: '#3b82f6', icon: '🎧', desc: 'Clientes, stock y soporte' },
];

export default function TeamPanel() {
  const { currentMember, allMembers, loading, switchMember, createMember, updateMember, deactivateMember, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } = useTeam();
  const [showLogin, setShowLogin] = useState(!currentMember);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'taller' });

  const handleLogin = (member) => {
    switchMember(member);
    setShowLogin(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await createMember(form.name.trim(), form.email.trim(), form.role);
    setForm({ name: '', email: '', role: 'taller' });
    setShowCreate(false);
  };

  const handleUpdate = async (id) => {
    await updateMember(id, { name: form.name, email: form.email, role: form.role });
    setEditingId(null);
  };

  const handleDeactivate = async (id) => {
    if (!confirm('¿Desactivar este miembro del equipo?')) return;
    await deactivateMember(id);
  };

  const startEdit = (member) => {
    setEditingId(member.id);
    setForm({ name: member.name, email: member.email || '', role: member.role });
  };

  // ── Login Screen ──────────────────────────────────────────
  if (showLogin) {
    return (
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '40px 20px' }}>
        <div className="glass-card" style={{ padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
            }}>
              <Users size={32} color="#fff" />
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--on-surface)' }}>¿Quién está usando el sistema?</h2>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--on-surface-variant)' }}>Seleccioná tu perfil para continuar</p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--on-surface-variant)' }}>Cargando equipo...</div>
          ) : allMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, marginBottom: 20 }}>No hay miembros del equipo creados aún.</p>
              <button
                onClick={() => { setShowCreate(true); }}
                style={{
                  padding: '12px 24px', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                <UserPlus size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Crear primer miembro
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {allMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => handleLogin(member)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = ROLE_COLORS[member.role]; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `linear-gradient(135deg, ${ROLE_COLORS[member.role]}40, ${ROLE_COLORS[member.role]}80)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {ROLE_ICONS[member.role]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--on-surface)' }}>{member.name}</div>
                    <div style={{ fontSize: 12, color: ROLE_COLORS[member.role], fontWeight: 500 }}>
                      {ROLE_LABELS[member.role]}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Entrar →</div>
                </button>
              ))}
            </div>
          )}

          {allMembers.length > 0 && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                width: '100%', marginTop: 16, padding: '12px 20px',
                borderRadius: 12, border: '1px dashed rgba(255,255,255,0.15)',
                background: 'transparent', color: 'var(--on-surface-variant)',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <UserPlus size={14} /> Agregar miembro
            </button>
          )}
        </div>

        {/* Create Member Modal */}
        {showCreate && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, backdropFilter: 'blur(8px)',
          }} onClick={() => setShowCreate(false)}>
            <div className="glass-card" style={{ width: 420, padding: 0 }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>Nuevo Miembro del Equipo</h3>
                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ padding: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 }}>Nombre</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Juan Pérez"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                    color: 'var(--on-surface)', fontSize: 14, marginBottom: 16, boxSizing: 'border-box',
                  }}
                />
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 }}>Email (opcional)</label>
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="juan@taller.com"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                    color: 'var(--on-surface)', fontSize: 14, marginBottom: 16, boxSizing: 'border-box',
                  }}
                />
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 }}>Rol</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                  {ROLES.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setForm(f => ({ ...f, role: r.value }))}
                      style={{
                        padding: '12px 10px', borderRadius: 10,
                        border: `1.5px solid ${form.role === r.value ? r.color : 'rgba(255,255,255,0.08)'}`,
                        background: form.role === r.value ? `${r.color}15` : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{r.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: form.role === r.value ? r.color : 'var(--on-surface)' }}>{r.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginTop: 2 }}>{r.desc}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!form.name.trim()}
                  style={{
                    width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none',
                    background: form.name.trim() ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                    color: '#fff', fontWeight: 600, fontSize: 14,
                    cursor: form.name.trim() ? 'pointer' : 'not-allowed',
                    opacity: form.name.trim() ? 1 : 0.5,
                  }}
                >
                  <Check size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Crear Miembro
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Member Manager (when member is logged in, admin view) ──
  return null; // Handled inline in Dashboard by showing current member badge
}

export function TeamMemberBadge() {
  const { currentMember, switchMember, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS } = useTeam();
  const [showDropdown, setShowDropdown] = useState(false);
  const { allMembers } = useTeam();

  if (!currentMember) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px', borderRadius: 12,
          border: `1px solid ${ROLE_COLORS[currentMember.role]}40`,
          background: `${ROLE_COLORS[currentMember.role]}10`,
          cursor: 'pointer', transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: 16 }}>{ROLE_ICONS[currentMember.role]}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: ROLE_COLORS[currentMember.role] }}>{currentMember.name}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
          background: `${ROLE_COLORS[currentMember.role]}20`, color: ROLE_COLORS[currentMember.role],
        }}>
          {ROLE_LABELS[currentMember.role]}
        </span>
      </button>

      {showDropdown && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowDropdown(false)} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 260,
            background: 'var(--surface)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)', zIndex: 200, overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cambiar de usuario
              </div>
            </div>
            {allMembers.map(m => (
              <button
                key={m.id}
                onClick={() => { switchMember(m); setShowDropdown(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', border: 'none', background: m.id === currentMember.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 14 }}>{ROLE_ICONS[m.role]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: ROLE_COLORS[m.role] }}>{ROLE_LABELS[m.role]}</div>
                </div>
                {m.id === currentMember.id && <Check size={14} color={ROLE_COLORS[m.role]} />}
              </button>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => { switchMember(null); setShowDropdown(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', border: 'none', background: 'transparent',
                  cursor: 'pointer', textAlign: 'left', color: '#ef4444',
                }}
              >
                <LogOut size={14} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>Cerrar sesión del equipo</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function TeamManager() {
  const { allMembers, updateMember, deactivateMember, ROLE_LABELS, ROLE_COLORS, ROLE_ICONS, loadMembers } = useTeam();
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'taller' });
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const { createMember } = useTeam();
    await createMember(form.name.trim(), form.email.trim(), form.role);
    setForm({ name: '', email: '', role: 'taller' });
    setShowCreate(false);
  };

  const handleUpdate = async (id) => {
    await updateMember(id, { name: form.name, email: form.email, role: form.role });
    setEditingId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={20} /> Equipo
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <UserPlus size={14} /> Agregar
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {allMembers.map(member => (
          <div
            key={member.id}
            className="glass-card"
            style={{
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
              borderLeft: `3px solid ${ROLE_COLORS[member.role]}`,
            }}
          >
            {editingId === member.id ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 13 }}
                />
                <input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 13 }}
                />
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 13 }}
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleUpdate(member.id)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
                  <button onClick={() => setEditingId(null)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--on-surface-variant)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `linear-gradient(135deg, ${ROLE_COLORS[member.role]}40, ${ROLE_COLORS[member.role]}80)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>
                  {ROLE_ICONS[member.role]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--on-surface)' }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: ROLE_COLORS[member.role], fontWeight: 500 }}>{ROLE_LABELS[member.role]}</div>
                  {member.email && <div style={{ fontSize: 11, color: 'var(--on-surface-variant)' }}>{member.email}</div>}
                </div>
                <button onClick={() => { setEditingId(member.id); setForm({ name: member.name, email: member.email || '', role: member.role }); }} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', padding: 6 }}>
                  <Edit3 size={14} />
                </button>
                <button onClick={() => deactivateMember(member.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 }}>
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(8px)' }} onClick={() => setShowCreate(false)}>
          <div className="glass-card" style={{ width: 420, padding: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--on-surface)' }}>Nuevo Miembro</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 }}>Nombre</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del miembro" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 }}>Email (opcional)</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@taller.com" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--on-surface)', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--on-surface-variant)', display: 'block', marginBottom: 6 }}>Rol</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {ROLES.map(r => (
                  <button key={r.value} onClick={() => setForm(f => ({ ...f, role: r.value }))} style={{ padding: '12px 10px', borderRadius: 10, border: `1.5px solid ${form.role === r.value ? r.color : 'rgba(255,255,255,0.08)'}`, background: form.role === r.value ? `${r.color}15` : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{r.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: form.role === r.value ? r.color : 'var(--on-surface)' }}>{r.label}</div>
                  </button>
                ))}
              </div>
              <button onClick={handleCreate} disabled={!form.name.trim()} style={{ width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none', background: form.name.trim() ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: form.name.trim() ? 'pointer' : 'not-allowed', opacity: form.name.trim() ? 1 : 0.5 }}>
                <Check size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Crear Miembro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
