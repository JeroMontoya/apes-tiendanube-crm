-- 035_onyx_tasks.sql
-- Create the main tasks table for the productivity system

CREATE TABLE IF NOT EXISTS public.onyx_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    workspace_id TEXT NOT NULL,
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_onyx_tasks_workspace_id ON public.onyx_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_onyx_tasks_status ON public.onyx_tasks(status);

-- Enable RLS
ALTER TABLE public.onyx_tasks ENABLE ROW LEVEL SECURITY;

-- Workspace Isolation Policy (Same pattern as the rest of the CRM)
-- Users can see/modify tasks in the workspace they currently have selected.
CREATE POLICY "Users can view tasks in their workspace"
    ON public.onyx_tasks
    FOR SELECT
    USING (workspace_id = current_setting('request.jwt.claims', true)::json->>'workspace_id' OR workspace_id = auth.uid()::text);
    
CREATE POLICY "Users can insert tasks in their workspace"
    ON public.onyx_tasks
    FOR INSERT
    WITH CHECK (workspace_id = current_setting('request.jwt.claims', true)::json->>'workspace_id' OR workspace_id = auth.uid()::text);

CREATE POLICY "Users can update tasks in their workspace"
    ON public.onyx_tasks
    FOR UPDATE
    USING (workspace_id = current_setting('request.jwt.claims', true)::json->>'workspace_id' OR workspace_id = auth.uid()::text);

CREATE POLICY "Users can delete tasks in their workspace"
    ON public.onyx_tasks
    FOR DELETE
    USING (workspace_id = current_setting('request.jwt.claims', true)::json->>'workspace_id' OR workspace_id = auth.uid()::text);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_onyx_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_onyx_tasks_updated_at ON public.onyx_tasks;
CREATE TRIGGER trg_onyx_tasks_updated_at
BEFORE UPDATE ON public.onyx_tasks
FOR EACH ROW
EXECUTE FUNCTION update_onyx_tasks_updated_at();

-- Add a comment for context
COMMENT ON TABLE public.onyx_tasks IS 'Productivity tasks for ONYX OS, multi-tenant enabled via workspace_id';
