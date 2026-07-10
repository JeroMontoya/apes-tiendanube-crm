import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const TeamContext = createContext(null);

export function useTeam() {
  return useContext(TeamContext);
}

const ROLE_LABELS = {
  admin: 'Administrador',
  taller: 'Taller (Producción)',
  ventas: 'Ventas',
  atencion_cliente: 'Atención al Cliente',
};

const ROLE_COLORS = {
  admin: '#8b5cf6',
  taller: '#f59e0b',
  ventas: '#10b981',
  atencion_cliente: '#3b82f6',
};

const ROLE_ICONS = {
  admin: '👑',
  taller: '🧵',
  ventas: '💰',
  atencion_cliente: '🎧',
};

// Navigation items per role
const ROLE_NAV = {
  admin: ['dashboard', 'calendario', 'clientes', 'segmentos', 'analitica', 'marketing', 'meta_ads', 'ga4', 'pipeline', 'inventario', 'taller', 'ventas_view', 'pqr', 'equipo', 'actividad', 'rendimiento', 'configuracion', 'exportar'],
  taller: ['dashboard', 'inventario', 'taller', 'pqr'],
  ventas: ['dashboard', 'clientes', 'pipeline', 'inventario', 'ventas_view', 'pqr'],
  atencion_cliente: ['dashboard', 'clientes', 'inventario', 'pqr'],
};

export function TeamProvider({ children, session }) {
  const [currentMember, setCurrentMember] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLog, setActivityLog] = useState([]);

  const allowedViews = currentMember ? ROLE_NAV[currentMember.role] || [] : ROLE_NAV.admin;

  const isViewAllowed = useCallback((viewId) => {
    if (!currentMember) return true; // no team member selected = admin mode
    return allowedViews.includes(viewId);
  }, [currentMember, allowedViews]);

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
      setLoading(false);
    };
    if (session) init();
  }, [session]);

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

  const createMember = async (name, email, role) => {
    const { data, error } = await supabase
      .from('team_members')
      .insert({ name, email, role, user_id: session?.user?.id })
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
    setCurrentMember(member);
    localStorage.setItem('current_team_member', member?.id || '');
  };

  // Restore last selected member
  useEffect(() => {
    if (allMembers.length > 0 && !currentMember) {
      const savedId = localStorage.getItem('current_team_member');
      if (savedId) {
        const found = allMembers.find(m => m.id === savedId);
        if (found) setCurrentMember(found);
      }
    }
  }, [allMembers]);

  const value = {
    currentMember,
    allMembers,
    loading,
    activityLog,
    allowedViews,
    isViewAllowed,
    ROLE_LABELS,
    ROLE_COLORS,
    ROLE_ICONS,
    logActivity,
    createMember,
    updateMember,
    deactivateMember,
    switchMember,
    loadMembers,
    loadActivity,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}
