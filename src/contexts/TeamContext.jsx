import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const TeamContext = createContext(null);

export function useTeam() {
  return useContext(TeamContext);
}

// ── Permission definitions ──────────────────────────────────────────
// Each permission has: id, label, category, description
export const PERMISSION_DEFS = {
  // Views (navigation)
  view_dashboard:    { label: 'Dashboard',         cat: 'views', desc: 'Ver el dashboard principal' },
  view_clientes:     { label: 'Clientes',          cat: 'views', desc: 'Ver y buscar clientes' },
  view_pipeline:     { label: 'Pipeline Ventas',   cat: 'views', desc: 'Ver el pipeline de ventas' },
  view_inventario:   { label: 'Inventario',        cat: 'views', desc: 'Ver inventario Tiendanube' },
  view_taller:       { label: 'Panel Taller',      cat: 'views', desc: 'Ver el panel de producción' },
  view_pqr:          { label: 'PQR & Soporte',     cat: 'views', desc: 'Ver panel de soporte' },
  view_analitica:    { label: 'Analítica',         cat: 'views', desc: 'Ver gráficas y métricas' },
  view_marketing:    { label: 'Marketing',         cat: 'views', desc: 'Ver marketing y campañas' },
  view_calendario:   { label: 'Calendario',        cat: 'views', desc: 'Ver calendario de eventos' },
  view_configuracion:{ label: 'Configuración',     cat: 'views', desc: 'Ver configuración del sistema' },
  view_equipo:       { label: 'Equipo',            cat: 'views', desc: 'Ver gestión de equipo' },
  view_actividad:    { label: 'Actividad',         cat: 'views', desc: 'Ver log de actividad' },
  view_rendimiento:  { label: 'Rendimiento',       cat: 'views', desc: 'Ver dashboard de productividad' },
  view_segmentos:    { label: 'Segmentos',         cat: 'views', desc: 'Ver segmentación de clientes' },
  view_meta_ads:     { label: 'Meta Ads',          cat: 'views', desc: 'Ver campañas de Meta' },
  view_ga4:          { label: 'Google Analytics',   cat: 'views', desc: 'Ver analytics de Google' },
  view_exportar:     { label: 'Exportar Datos',     cat: 'views', desc: 'Ver panel de exportación' },
  viewventas_view:   { label: 'Vista Ventas',       cat: 'views', desc: 'Ver vista de ventas' },

  // Actions — Taller
  create_batch:      { label: 'Crear Lote',        cat: 'taller', desc: 'Crear lotes de producción' },
  edit_batch:        { label: 'Editar Lote',       cat: 'taller', desc: 'Editar lotes existentes' },
  delete_batch:      { label: 'Eliminar Lote',     cat: 'taller', desc: 'Eliminar lotes de producción' },
  change_batch_status:{ label: 'Cambiar Estado',   cat: 'taller', desc: 'Avanzar/retroceder estados del lote' },
  sync_tiendanube:   { label: 'Sync Tiendanube',   cat: 'taller', desc: 'Sincronizar stock con Tiendanube' },

  // Actions — Inventario
  edit_stock:        { label: 'Editar Stock',      cat: 'inventario', desc: 'Modificar cantidades de stock' },
  set_status:        { label: 'Cambiar Estado',    cat: 'inventario', desc: 'Cambiar estado de productos' },

  // Actions — Materiales
  create_material:   { label: 'Crear Material',    cat: 'materiales', desc: 'Agregar nuevos materiales' },
  edit_material:     { label: 'Editar Material',   cat: 'materiales', desc: 'Modificar materiales existentes' },
  delete_material:   { label: 'Eliminar Material',  cat: 'materiales', desc: 'Eliminar materiales' },

  // Actions — Clientes
  edit_client:       { label: 'Editar Cliente',    cat: 'clientes', desc: 'Modificar datos de clientes' },
  view_client_detail:{ label: 'Ver Detalle',       cat: 'clientes', desc: 'Ver ficha completa del cliente' },

  // Actions — PQR
  create_pqr:        { label: 'Crear Caso PQR',    cat: 'pqr', desc: 'Abrir nuevos casos de soporte' },
  resolve_pqr:       { label: 'Resolver Caso',     cat: 'pqr', desc: 'Marcar casos como resueltos' },

  // Actions — Sistema
  manage_team:       { label: 'Gestionar Equipo',  cat: 'sistema', desc: 'Crear/editar/eliminar miembros' },
  manage_permissions:{ label: 'Administrar Permisos', cat: 'sistema', desc: 'Otorgar/quitar permisos a miembros' },
  view_settings:     { label: 'Ver Configuración', cat: 'sistema', desc: 'Acceder a configuración' },
  edit_settings:     { label: 'Editar Configuración', cat: 'sistema', desc: 'Modificar configuración del sistema' },
  export_data:       { label: 'Exportar Datos',    cat: 'sistema', desc: 'Descargar datos del sistema' },
};

// ── Default permissions per role ────────────────────────────────────
const ROLE_DEFAULTS = {
  admin: Object.keys(PERMISSION_DEFS), // admin gets everything
  taller: [
    'view_dashboard', 'view_inventario', 'view_taller', 'view_pqr',
    'create_batch', 'edit_batch', 'delete_batch', 'change_batch_status', 'sync_tiendanube',
    'edit_stock', 'set_status',
    'create_material', 'edit_material',
  ],
  ventas: [
    'view_dashboard', 'view_clientes', 'view_pipeline', 'view_inventario', 'viewventas_view', 'view_pqr',
    'edit_client', 'view_client_detail',
  ],
  atencion_cliente: [
    'view_dashboard', 'view_clientes', 'view_inventario', 'view_pqr',
    'view_client_detail', 'create_pqr', 'resolve_pqr',
  ],
};

// ── Role labels / colors / icons ────────────────────────────────────
const ROLE_LABELS = {
  admin: 'Administrador',
  taller: 'Taller (Producción)',
  ventas: 'Ventas',
  atencion_cliente: 'Atención al Cliente',
};

const ROLE_COLORS = {
  admin: '#8b5cf6',
  taller: 'var(--primary-container)',
  ventas: '#10b981',
  atencion_cliente: '#3b82f6',
};

const ROLE_ICONS = {
  admin: '👑',
  taller: '🧵',
  ventas: '💰',
  atencion_cliente: '🎧',
};

// ── Permission categories for UI grouping ───────────────────────────
export const PERMISSION_CATEGORIES = {
  views:        { label: 'Secciones', icon: '👁️' },
  taller:       { label: 'Taller / Producción', icon: '🧵' },
  inventario:   { label: 'Inventario', icon: '📦' },
  materiales:   { label: 'Materiales', icon: '🧵' },
  clientes:     { label: 'Clientes', icon: '👤' },
  pqr:          { label: 'PQR / Soporte', icon: '🎧' },
  sistema:      { label: 'Sistema', icon: '⚙️' },
};

// ── Context ─────────────────────────────────────────────────────────

export function TeamProvider({ children, session }) {
  const [currentMember, setCurrentMember] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLog, setActivityLog] = useState([]);

  // ── Compute effective permissions for current member ──────────
  const getEffectivePermissions = useCallback(() => {
    if (!currentMember) return Object.keys(PERMISSION_DEFS); // no member = full admin
    if (currentMember.role === 'admin') return Object.keys(PERMISSION_DEFS);

    const roleDefaults = ROLE_DEFAULTS[currentMember.role] || [];
    const custom = currentMember.permissions || null;

    // If custom permissions exist, they REPLACE the role defaults entirely
    if (custom && Array.isArray(custom) && custom.length > 0) {
      return custom;
    }
    // Otherwise fall back to role defaults
    return roleDefaults;
  }, [currentMember]);

  const effectivePermissions = getEffectivePermissions();

  const hasPermission = useCallback((permId) => {
    if (!currentMember) return true; // no member = full admin
    if (currentMember.role === 'admin') return true;
    return effectivePermissions.includes(permId);
  }, [currentMember, effectivePermissions]);

  const isViewAllowed = useCallback((viewId) => {
    if (!currentMember) return true;
    if (currentMember.role === 'admin') return true;
    return effectivePermissions.includes(`view_${viewId}`) || effectivePermissions.includes(viewId);
  }, [currentMember, effectivePermissions]);

  // ── Load members ─────────────────────────────────────────────
  const loadMembers = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (!error && data) setAllMembers(data);
  };

  const loadActivity = async () => {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setActivityLog(data);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadMembers(), loadActivity()]);

      // Auto-identify current member from Supabase session
      if (session?.user?.id) {
        const { data: myMember } = await supabase
          .from('team_members')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .single();

        if (myMember) {
          setCurrentMember(myMember);
          localStorage.setItem('current_team_member', myMember.id);
        } else if (!allMembers.length) {
          // No members exist yet — auto-create this user as admin
          const { data: newAdmin } = await supabase
            .from('team_members')
            .insert({
              name: session.user.email?.split('@')[0] || 'Admin',
              email: session.user.email || '',
              role: 'admin',
              user_id: session.user.id,
              is_active: true,
            })
            .select()
            .single();
          if (newAdmin) {
            setCurrentMember(newAdmin);
            setAllMembers([newAdmin]);
            localStorage.setItem('current_team_member', newAdmin.id);
          }
        } else {
          // Members exist but none has this user's auth ID — this user is the admin
          // Find the admin-level member closest to their email, or create one
          const adminMember = allMembers.find(m =>
            m.role === 'admin' && m.email === session.user.email
          ) || allMembers.find(m => m.role === 'admin');

          if (adminMember) {
            // Link this member to the current auth user
            const { data: linked } = await supabase
              .from('team_members')
              .update({ user_id: session.user.id })
              .eq('id', adminMember.id)
              .select()
              .single();
            if (linked) {
              setCurrentMember(linked);
              localStorage.setItem('current_team_member', linked.id);
            }
          } else {
            // No admin found — create one linked to this auth user
            const { data: newAdmin } = await supabase
              .from('team_members')
              .insert({
                name: session.user.email?.split('@')[0] || 'Admin',
                email: session.user.email || '',
                role: 'admin',
                user_id: session.user.id,
                is_active: true,
              })
              .select()
              .single();
            if (newAdmin) {
              setCurrentMember(newAdmin);
              localStorage.setItem('current_team_member', newAdmin.id);
            }
          }
        }
      }

      setLoading(false);
    };
    if (session) init();
  }, [session]);

  // ── Activity logging ─────────────────────────────────────────
  const logActivity = async (action, targetType, targetId, targetName, details = {}) => {
    if (!currentMember) return;
    const entry = {
      member_id: currentMember.id,
      member_name: currentMember.name,
      action,
      target_type: targetType,
      target_id: targetId ? String(targetId) : null,
      target_name: targetName,
      details,
    };
    const { data, error } = await supabase
      .from('activity_log')
      .insert(entry)
      .select()
      .single();
    if (!error && data) {
      setActivityLog(prev => [data, ...prev].slice(0, 200));
    }
  };

  // ── Member CRUD ──────────────────────────────────────────────
  const createMember = async (name, email, role) => {
    const { data, error } = await supabase
      .from('team_members')
      .insert({ name, email, role })
      .select()
      .single();
    if (!error && data) {
      setAllMembers(prev => [data, ...prev]);
      await logActivity('member_created', 'team_member', data.id, name, { role });
      return { success: true, data };
    }
    return { success: false, error: error?.message };
  };

  const updateMember = async (id, updates) => {
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setAllMembers(prev => prev.map(m => m.id === id ? data : m));
      await logActivity('member_updated', 'team_member', id, data.name, updates);
      if (currentMember?.id === id) setCurrentMember(data);
      return { success: true };
    }
    return { success: false, error: error?.message };
  };

  const setMemberPermissions = async (memberId, permissions) => {
    const member = allMembers.find(m => m.id === memberId);
    const { data, error } = await supabase
      .from('team_members')
      .update({ permissions })
      .eq('id', memberId)
      .select()
      .single();
    if (!error && data) {
      setAllMembers(prev => prev.map(m => m.id === memberId ? data : m));
      await logActivity('permissions_updated', 'team_member', memberId, member?.name, {
        permissions_count: permissions.length,
        custom: true,
      });
      if (currentMember?.id === memberId) setCurrentMember(data);
      return { success: true };
    }
    return { success: false, error: error?.message };
  };

  const resetMemberPermissions = async (memberId) => {
    const member = allMembers.find(m => m.id === memberId);
    const { data, error } = await supabase
      .from('team_members')
      .update({ permissions: null })
      .eq('id', memberId)
      .select()
      .single();
    if (!error && data) {
      setAllMembers(prev => prev.map(m => m.id === memberId ? data : m));
      await logActivity('permissions_reset', 'team_member', memberId, member?.name, {
        reset_to_role: member?.role,
      });
      if (currentMember?.id === memberId) setCurrentMember(data);
      return { success: true };
    }
    return { success: false };
  };

  const deactivateMember = async (id) => {
    const member = allMembers.find(m => m.id === id);
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: false })
      .eq('id', id);
    if (!error) {
      setAllMembers(prev => prev.filter(m => m.id !== id));
      await logActivity('member_deactivated', 'team_member', id, member?.name);
      return { success: true };
    }
    return { success: false };
  };

  const switchMember = (member) => {
    // Only allow switching if the target member belongs to this Supabase user
    if (member.user_id !== session?.user?.id) {
      console.warn('Cannot switch to another user\'s member record');
      return;
    }
    setCurrentMember(member);
    localStorage.setItem('current_team_member', member?.id || '');
  };

  // Restore last selected member — ONLY if it belongs to the same Supabase user
  useEffect(() => {
    if (allMembers.length > 0 && !currentMember) {
      const savedId = localStorage.getItem('current_team_member');
      if (savedId) {
        const found = allMembers.find(m => m.id === savedId);
        if (found && found.user_id === session?.user?.id) {
          setCurrentMember(found);
        }
      }
    }
  }, [allMembers]);

  const value = {
    currentMember,
    allMembers,
    loading,
    activityLog,
    effectivePermissions,
    hasPermission,
    isViewAllowed,
    ROLE_LABELS,
    ROLE_COLORS,
    ROLE_ICONS,
    ROLE_DEFAULTS,
    PERMISSION_DEFS,
    PERMISSION_CATEGORIES,
    logActivity,
    createMember,
    updateMember,
    setMemberPermissions,
    resetMemberPermissions,
    deactivateMember,
    switchMember,
    loadMembers,
    loadActivity,
    logout: async () => {
      localStorage.removeItem('current_team_member');
      await supabase.auth.signOut();
    },
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}
