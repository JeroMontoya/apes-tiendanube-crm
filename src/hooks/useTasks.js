import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useTeam } from '../contexts/TeamContext';

export function useTasks(session) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { currentStore } = useTeam(); // Getting workspace context from team/store

  const workspaceId = currentStore?.id || session?.user?.id;

  const fetchTasks = useCallback(async () => {
    if (!workspaceId) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('onyx_tasks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTasks(data || []);
    } catch (err) {
      console.error('[useTasks] Error fetching tasks:', err);
      // Let it fail silently on UI if table doesn't exist yet, just clear tasks
      if (err.code === '42P01') {
        setError('Table onyx_tasks does not exist yet.');
      } else {
        setError(err.message);
      }
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (session && workspaceId) {
      fetchTasks();
    }
  }, [session, workspaceId, fetchTasks]);

  const addTask = async (title, status = 'todo', priority = 'medium', description = '') => {
    if (!workspaceId) throw new Error('No workspace context');
    
    // Optimistic update
    const newTask = {
      id: `temp-${Date.now()}`,
      title,
      description,
      status,
      priority,
      workspace_id: workspaceId,
      assignee_id: session?.user?.id,
      created_at: new Date().toISOString()
    };
    
    setTasks(prev => [newTask, ...prev]);

    try {
      const { data, error: insertError } = await supabase
        .from('onyx_tasks')
        .insert([{
          title,
          description,
          status,
          priority,
          workspace_id: workspaceId,
          assignee_id: session?.user?.id
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      
      // Update with real ID
      setTasks(prev => prev.map(t => t.id === newTask.id ? data : t));
      return data;
    } catch (err) {
      console.error('[useTasks] Error adding task:', err);
      // Revert optimistic
      setTasks(prev => prev.filter(t => t.id !== newTask.id));
      throw err;
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    const originalTasks = [...tasks];
    
    // Optimistic
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      const { error: updateError } = await supabase
        .from('onyx_tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .eq('workspace_id', workspaceId); // extra safety

      if (updateError) throw updateError;
    } catch (err) {
      console.error('[useTasks] Error updating task:', err);
      // Revert
      setTasks(originalTasks);
      throw err;
    }
  };

  const updateTask = async (taskId, updates) => {
    const originalTasks = [...tasks];
    
    // Optimistic
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    try {
      const { error: updateError } = await supabase
        .from('onyx_tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('workspace_id', workspaceId);

      if (updateError) throw updateError;
    } catch (err) {
      console.error('[useTasks] Error updating task:', err);
      // Revert
      setTasks(originalTasks);
      throw err;
    }
  };

  const deleteTask = async (taskId) => {
    const originalTasks = [...tasks];
    
    // Optimistic
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      const { error: deleteError } = await supabase
        .from('onyx_tasks')
        .delete()
        .eq('id', taskId)
        .eq('workspace_id', workspaceId);

      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('[useTasks] Error deleting task:', err);
      // Revert
      setTasks(originalTasks);
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask
  };
}
