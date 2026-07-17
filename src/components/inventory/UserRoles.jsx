import React, { useState, useMemo } from 'react';
import {
  Shield, Users, MapPin, Edit3, Plus, X, Save, CheckCircle,
  AlertTriangle, Lock, Eye, Package, RefreshCw,
} from 'lucide-react';

const ROLES = {
  admin: { label: 'Administrador', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', desc: 'Acceso completo al sistema' },
  manager: { label: 'Gerente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', desc: 'Ajustar, transferir y crear productos' },
  operator: { label: 'Operador', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', desc: 'Solo ajustar stock' },
  viewer: { label: 'Visualizador', color: '#64748b', bg: 'rgba(100,116,139,0.1)', desc: 'Solo lectura' },
};

const PERMISSIONS = {
  admin: ['create', 'read', 'update', 'delete', 'adjust', 'transfer', 'manage_users', 'reports', 'sync'],
  manager: ['create', 'read', 'update', 'adjust', 'transfer', 'reports'],
  operator: ['read', 'adjust'],
  viewer: ['read'],
};

function EditRoleModal({ user, locations, onSave, onClose }) {
  const [role, setRole] = useState(user?.role || 'viewer');
  const [accessLocations, setAccessLocations] = useState(user?.access_locations || (locations || []).map((l) => l.id));
  const [saving, setSaving] = useState(false);

  const toggleLocation = (locId) => {
    setAccessLocations((prev) =>
      prev.includes(locId) ? prev.filter((l) => l !== locId) : [...prev, locId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ userId: user.id, role, locations: accessLocations });
    setSaving(false);
  };

  const roleConfig = ROLES[role] || ROLES.viewer;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div
        style={{ width: '480px', maxHeight: '85vh', overflow: 'auto', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#8b5cf6" />
            Editar Rol: {user?.name || user?.email}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Role Selection */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '8px', display: 'block' }}>Rol</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {Object.entries(ROLES).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setRole(key)}
                  style={{
                    padding: '12px', borderRadius: '10px',
                    border: `1px solid ${role === key ? cfg.color : 'var(--border-subtle)'}`,
                    background: role === key ? cfg.bg : 'transparent',
                    color: role === key ? cfg.color : 'var(--on-surface)',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>{cfg.label}</div>
                  <div style={{ fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>{cfg.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Preview */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '8px', display: 'block' }}>Permisos</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(PERMISSIONS[role] || []).map((perm) => (
                <span key={perm} style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '11px', fontWeight: '600' }}>
                  {perm}
                </span>
              ))}
            </div>
          </div>

          {/* Location Access */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '8px', display: 'block' }}>Acceso a Ubicaciones</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(locations || []).map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => toggleLocation(loc.id)}
                  style={{
                    padding: '10px 14px', borderRadius: '8px',
                    border: `1px solid ${accessLocations.includes(loc.id) ? loc.color : 'var(--border-subtle)'}`,
                    background: accessLocations.includes(loc.id) ? `${loc.color}10` : 'transparent',
                    color: 'var(--on-surface)', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '4px',
                    border: `2px solid ${accessLocations.includes(loc.id) ? loc.color : 'var(--on-surface-variant)'}`,
                    background: accessLocations.includes(loc.id) ? loc.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {accessLocations.includes(loc.id) && <CheckCircle size={12} color="#fff" />}
                  </div>
                  <MapPin size={14} color={loc.color} />
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{loc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function AddUserModal({ locations, onAdd, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!email) return;
    setSaving(true);
    await onAdd?.({ email, role, locations: (locations || []).map((l) => l.id) });
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div
        style={{ width: '420px', borderRadius: '20px', background: 'var(--surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="#3b82f6" />
            Agregar Usuario
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block' }}>Email del Usuario</label>
            <input
              style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--on-surface)', padding: '0 12px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              type="email"
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--on-surface-variant)', marginBottom: '6px', display: 'block' }}>Rol Inicial</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Object.entries(ROLES).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setRole(key)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px',
                    border: `1px solid ${role === key ? cfg.color : 'var(--border-subtle)'}`,
                    background: role === key ? cfg.bg : 'transparent',
                    color: role === key ? cfg.color : 'var(--on-surface)',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleAdd} disabled={saving || !email} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: !email ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {saving ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserRoles({ roles, locations, onUpdateRole, loading }) {
  const [editingUser, setEditingUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#8b5cf6" />
            Gestión de Usuarios y Roles
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
            {(roles || []).length} usuario{(roles || []).length !== 1 ? 's' : ''} registrado{(roles || []).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowAddUser(true)} style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={14} /> Agregar Usuario
        </button>
      </div>

      {/* User List */}
      {loading && (!roles || roles.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
        </div>
      ) : !roles || roles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--on-surface-variant)' }}>
          <Users size={40} style={{ opacity: 0.2, marginBottom: '10px' }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Sin usuarios configurados</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.7 }}>Agrega usuarios para comenzar</p>
        </div>
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(roles || []).map((user, i) => {
            const cfg = ROLES[user.role] || ROLES.viewer;
            return (
              <div key={user.id || i} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--on-surface)' }}>{user.name || user.email}</div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>{user.email}</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px', background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {(user.access_locations || []).map((locId) => {
                    const loc = (locations || []).find((l) => l.id === locId);
                    return loc ? (
                      <span key={locId} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: `${loc.color}15`, color: loc.color }}>{loc.name}</span>
                    ) : null;
                  })}
                </div>
                <button onClick={() => setEditingUser(user)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--on-surface)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Edit3 size={12} /> Editar
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden', background: 'var(--surface)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 120px 1fr 80px', gap: '12px', padding: '10px 16px', background: 'var(--surface-container-low, rgba(255,255,255,0.03))', borderBottom: '1px solid var(--border-subtle)', fontSize: '10px', fontWeight: '700', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px', alignItems: 'center' }}>
            <span>Nombre</span>
            <span>Email</span>
            <span>Rol</span>
            <span>Ubicaciones</span>
            <span>Acción</span>
          </div>
          {(roles || []).map((user, i) => {
            const cfg = ROLES[user.role] || ROLES.viewer;
            return (
              <div key={user.id || i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 120px 1fr 80px', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', fontSize: '13px' }}>
                <div style={{ fontWeight: '600', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name || 'Sin nombre'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>{user.email}</div>
                <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '6px', background: cfg.bg, color: cfg.color, textAlign: 'center', whiteSpace: 'nowrap' }}>{cfg.label}</span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {(user.access_locations || []).map((locId) => {
                    const loc = (locations || []).find((l) => l.id === locId);
                    return loc ? (
                      <span key={locId} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: `${loc.color}15`, color: loc.color }}>{loc.name}</span>
                    ) : null;
                  })}
                </div>
                <button onClick={() => setEditingUser(user)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar rol">
                  <Edit3 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {editingUser && (
        <EditRoleModal
          user={editingUser}
          locations={locations}
          onSave={async (data) => { await onUpdateRole?.(data); setEditingUser(null); }}
          onClose={() => setEditingUser(null)}
        />
      )}
      {showAddUser && (
        <AddUserModal
          locations={locations}
          onAdd={async (data) => { await onUpdateRole?.(data); setShowAddUser(false); }}
          onClose={() => setShowAddUser(false)}
        />
      )}
    </div>
  );
}
