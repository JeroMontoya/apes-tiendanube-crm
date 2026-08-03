import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const WorkspaceContext = createContext(null);

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

/**
 * WorkspaceProvider — Multi-Workspace Engine (Agency Architecture)
 * 
 * Each workspace represents a business/brand (Onyx, APES, Client X).
 * Users can belong to multiple workspaces. The active workspace
 * determines which data, metrics, team, and credentials are loaded.
 * 
 * Workspace isolation is guaranteed at:
 *   1. Frontend: all queries filter by workspace_id
 *   2. Backend: X-Workspace-Id header required on all API calls
 *   3. Local cache: keys namespaced by workspace_id
 */
export function WorkspaceProvider({ children, session }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Load workspaces for current user ─────────────────────────
  const loadWorkspaces = useCallback(async () => {
    if (!session?.user?.id) return;
    
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('owner_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      // Fallback: try legacy single-workspace query
      const { data: legacy } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (legacy) {
        // Migrate legacy workspace to new schema
        const migrated = {
          ...legacy,
          id: legacy.id || crypto.randomUUID(),
          owner_id: session.user.id,
          name: legacy.name || 'Mi Negocio',
          slug: legacy.slug || 'default',
          icon: legacy.icon || '🏢',
        };
        setWorkspaces([migrated]);
        restoreOrSetActive([migrated]);
        setLoading(false);
        return;
      }
    }

    if (data && data.length > 0) {
      setWorkspaces(data);
      restoreOrSetActive(data);
    } else {
      // No workspaces exist — auto-create default
      await createWorkspace('Mi Negocio', '🏢');
    }

    setLoading(false);
  }, [session?.user?.id]);

  // ── Restore last active workspace from localStorage ──────────
  const restoreOrSetActive = (wsList) => {
    const savedId = localStorage.getItem('onyx_active_workspace');
    const found = savedId ? wsList.find(w => w.id === savedId) : null;
    setActiveWorkspace(found || wsList[0]);
  };

  // ── Switch active workspace ──────────────────────────────────
  const switchWorkspace = useCallback((workspace) => {
    setActiveWorkspace(workspace);
    localStorage.setItem('onyx_active_workspace', workspace.id);
    // Clear transient state — components will re-fetch with new context
    window.dispatchEvent(new CustomEvent('workspace-changed', { detail: workspace }));
  }, []);

  // ── Create a new workspace ───────────────────────────────────
  const createWorkspace = useCallback(async (name, icon = '🏢', config = {}) => {
    if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const newWs = {
      id: crypto.randomUUID(),
      owner_id: session.user.id,
      user_id: session.user.id, // backward compat
      name,
      slug,
      icon,
      ...config,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('workspaces')
      .insert(newWs)
      .select()
      .single();

    if (error) {
      console.error('[Workspace] Create error:', error.message);
      return { success: false, error: error.message };
    }

    setWorkspaces(prev => [...prev, data]);
    if (!activeWorkspace) {
      setActiveWorkspace(data);
      localStorage.setItem('onyx_active_workspace', data.id);
    }
    return { success: true, data };
  }, [session?.user?.id, activeWorkspace]);

  // ── Update workspace config (credentials, name, etc.) ────────
  const updateWorkspace = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('workspaces')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    setWorkspaces(prev => prev.map(w => w.id === id ? data : w));
    if (activeWorkspace?.id === id) setActiveWorkspace(data);
    return { success: true, data };
  }, [activeWorkspace]);

  // ── Delete a workspace ───────────────────────────────────────
  const deleteWorkspace = useCallback(async (id) => {
    if (workspaces.length <= 1) {
      return { success: false, error: 'No puedes eliminar tu único negocio' };
    }

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    const remaining = workspaces.filter(w => w.id !== id);
    setWorkspaces(remaining);
    if (activeWorkspace?.id === id) {
      switchWorkspace(remaining[0]);
    }
    return { success: true };
  }, [workspaces, activeWorkspace, switchWorkspace]);

  // ── Helper: get auth headers for API calls ───────────────────
  const getApiHeaders = useCallback(() => {
    const headers = {};
    if (activeWorkspace?.id) {
      headers['X-Workspace-Id'] = activeWorkspace.id;
    }
    // Attach Supabase JWT
    const token = session?.access_token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [activeWorkspace, session]);

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    if (session) {
      loadWorkspaces();
    }
  }, [session, loadWorkspaces]);

  const value = {
    // State
    workspaces,
    activeWorkspace,
    loading,
    // Actions
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    loadWorkspaces,
    // Helpers
    getApiHeaders,
    workspaceId: activeWorkspace?.id || null,
    workspaceName: activeWorkspace?.name || '',
    workspaceIcon: activeWorkspace?.icon || '🏢',
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
