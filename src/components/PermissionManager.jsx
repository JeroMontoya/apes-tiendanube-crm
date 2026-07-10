import React, { useState, useMemo } from 'react';
import { useTeam, PERMISSION_DEFS, PERMISSION_CATEGORIES } from '../contexts/TeamContext';
import { Shield, Check, X, RotateCcw, ChevronDown, ChevronRight, Save, Users, Lock, Unlock } from 'lucide-react';

const catOrder = ['views', 'taller', 'inventario', 'materiales', 'clientes', 'pqr', 'sistema'];

export default function PermissionManager() {
  const { allMembers, currentMember, hasPermission, setMemberPermissions, resetMemberPermissions, ROLE_LABELS, ROLE_COLORS, ROLE_DEFAULTS } = useTeam();
  const [selectedMember, setSelectedMember] = useState(null);
  const [editingPerms, setEditingPerms] = useState(null);
  const [expandedCats, setExpandedCats] = useState({ views: true });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = hasPermission('manage_permissions');

  const otherMembers = useMemo(() => {
    return allMembers.filter(m => m.id !== currentMember?.id)
      .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  }, [allMembers, currentMember, search]);

  const selectMember = (member) => {
    setSelectedMember(member);
    const custom = member.permissions;
    // If member has custom perms, use those; otherwise start from role defaults
    const base = (custom && Array.isArray(custom) && custom.length > 0)
      ? custom
      : ROLE_DEFAULTS[member.role] || [];
    setEditingPerms([...base]);
  };

  const togglePerm = (permId) => {
    setEditingPerms(prev => {
      if (prev.includes(permId)) return prev.filter(p => p !== permId);
      return [...prev, permId];
    });
  };

  const toggleCat = (cat) => {
    const permsInCat = Object.entries(PERMISSION_DEFS).filter(([, def]) => def.cat === cat).map(([id]) => id);
    const allEnabled = permsInCat.every(p => editingPerms.includes(p));
    if (allEnabled) {
      setEditingPerms(prev => prev.filter(p => !permsInCat.includes(p)));
    } else {
      setEditingPerms(prev => [...new Set([...prev, ...permsInCat])]);
    }
  };

  const handleSave = async () => {
    if (!selectedMember) return;
    setSaving(true);
    await setMemberPermissions(selectedMember.id, editingPerms);
    setSaving(false);
  };

  const handleReset = async () => {
    if (!selectedMember) return;
    if (!confirm(`¿Restaurar permisos de "${selectedMember.name}" a los predeterminados de su rol (${ROLE_LABELS[selectedMember.role]}?)`)) return;
    setSaving(true);
    await resetMemberPermissions(selectedMember.id);
    const member = allMembers.find(m => m.id === selectedMember.id);
    if (member) {
      const base = ROLE_DEFAULTS[member.role] || [];
      setEditingPerms([...base]);
      setSelectedMember({ ...member, permissions: null });
    }
    setSaving(false);
  };

  if (!canManage) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
        <Lock size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
        <p style={{ fontSize: 14, fontWeight: 600 }}>No tenés permisos para gestionar permisos</p>
        <p style={{ fontSize: 12, opacity: 0.6 }}>Pedile al administrador que te otorgue acceso</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={22} color="#8b5cf6" /> Administración de Permisos
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--on-surface-variant)' }}>
          Otorgá o quitá permisos específicos a cada miembro del equipo
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, minHeight: 500 }}>
        {/* ── Member List ── */}
        <div style={{
          borderRadius: 14, background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ position: 'relative' }}>
              <Users size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar miembro..."
                style={{
                  width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)',
                  color: 'var(--on-surface)', fontSize: 12, boxSizing: 'border-box',
                }} />
            </div>
          </div>
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            {otherMembers.map(m => {
              const isSelected = selectedMember?.id === m.id;
              const hasCustom = m.permissions && Array.isArray(m.permissions) && m.permissions.length > 0;
              return (
                <div key={m.id} onClick={() => selectMember(m)} style={{
                  padding: '12px 16px', cursor: 'pointer',
                  background: isSelected ? 'rgba(139,92,246,0.08)' : 'transparent',
                  borderLeft: isSelected ? '3px solid #8b5cf6' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)' }}>{m.name}</span>
                    {hasCustom && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', fontWeight: 700 }}>CUSTOM</span>}
                  </div>
                  <div style={{ fontSize: 11, color: ROLE_COLORS[m.role] || '#888' }}>
                    {ROLE_LABELS[m.role] || m.role}
                  </div>
                </div>
              );
            })}
            {otherMembers.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 12 }}>
                No hay otros miembros
              </div>
            )}
          </div>
        </div>

        {/* ── Permissions Editor ── */}
        <div style={{
          borderRadius: 14, background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)', overflow: 'hidden',
        }}>
          {!selectedMember ? (
            <div style={{ padding: 80, textAlign: 'center', color: 'var(--on-surface-variant)' }}>
              <Shield size={40} style={{ opacity: 0.15, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>Elegí un miembro para editar sus permisos</p>
              <p style={{ fontSize: 12, opacity: 0.6 }}>Los permisos personalizados reemplazan los de su rol</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>{selectedMember.name}</div>
                  <div style={{ fontSize: 11, color: ROLE_COLORS[selectedMember.role] }}>
                    Rol: {ROLE_LABELS[selectedMember.role]}
                    {selectedMember.permissions && <span style={{ color: '#8b5cf6', marginLeft: 8 }}>· Permisos personalizados</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleReset} style={{
                    padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)',
                    background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <RotateCcw size={12} /> Restaurar Rol
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    background: saving ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: '#fff', fontSize: 11, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Save size={12} /> {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>

              {/* Permission categories */}
              <div style={{ padding: '16px 20px', maxHeight: 420, overflowY: 'auto' }}>
                {catOrder.map(cat => {
                  const catDef = PERMISSION_CATEGORIES[cat];
                  const permsInCat = Object.entries(PERMISSION_DEFS).filter(([, def]) => def.cat === cat);
                  const enabledCount = permsInCat.filter(([id]) => editingPerms.includes(id)).length;
                  const allEnabled = enabledCount === permsInCat.length;
                  const isExpanded = expandedCats[cat];

                  return (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      {/* Category header */}
                      <div onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))} style={{
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        background: allEnabled ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${allEnabled ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {isExpanded ? <ChevronDown size={14} color="var(--on-surface-variant)" /> : <ChevronRight size={14} color="var(--on-surface-variant)" />}
                          <span style={{ fontSize: 13 }}>{catDef.icon}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-surface)' }}>{catDef.label}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                            background: allEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)',
                            color: allEnabled ? '#10b981' : 'var(--on-surface-variant)',
                          }}>
                            {enabledCount}/{permsInCat.length}
                          </span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleCat(cat); }} style={{
                          padding: '4px 8px', borderRadius: 6, border: 'none',
                          background: allEnabled ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: allEnabled ? '#ef4444' : '#10b981', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        }}>
                          {allEnabled ? 'Quitar Todos' : 'Dar Todos'}
                        </button>
                      </div>

                      {/* Permissions list */}
                      {isExpanded && (
                        <div style={{ marginTop: 6, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {permsInCat.map(([permId, permDef]) => {
                            const enabled = editingPerms.includes(permId);
                            return (
                              <div key={permId} onClick={() => togglePerm(permId)} style={{
                                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                background: enabled ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${enabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.borderColor = enabled ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.borderColor = enabled ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)'}
                              >
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: enabled ? '#10b981' : 'var(--on-surface)' }}>{permDef.label}</div>
                                  <div style={{ fontSize: 10, color: 'var(--on-surface-variant)', marginTop: 1 }}>{permDef.desc}</div>
                                </div>
                                <div style={{
                                  width: 20, height: 20, borderRadius: 6,
                                  background: enabled ? '#10b981' : 'rgba(255,255,255,0.06)',
                                  border: enabled ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s', flexShrink: 0,
                                }}>
                                  {enabled && <Check size={12} color="#fff" />}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
