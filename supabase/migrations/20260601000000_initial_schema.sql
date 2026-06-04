-- Reflexa initial schema migration
-- Generated based on public.sessions and public.strategies tables

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    interview_phase TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    config JSONB NOT NULL,
    trace JSONB NOT NULL DEFAULT '[]'::jsonb,
    evaluation JSONB,
    eval_trace_id TEXT,
    strategy_version TEXT NOT NULL,
    strategy_update JSONB,
    turn_count INTEGER NOT NULL DEFAULT 0,
    active_strategy_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_agent_action TEXT
);

CREATE TABLE IF NOT EXISTS public.strategies (
    version TEXT PRIMARY KEY,
    rules JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: RLS policies would ideally be added here.
-- For now, they are left as defaults since the backend accesses Supabase using the service role key.
