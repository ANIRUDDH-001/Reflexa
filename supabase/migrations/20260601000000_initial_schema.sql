-- Reflexa initial schema migration
-- Matches the live Supabase schema as of 2026-06-04

CREATE TABLE IF NOT EXISTS public.sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
    interview_phase TEXT NOT NULL DEFAULT 'intro'
        CHECK (interview_phase IN ('intro', 'exploration', 'deep_dive', 'closing')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    trace JSONB NOT NULL DEFAULT '[]'::jsonb,
    evaluation JSONB,
    eval_trace_id TEXT,
    strategy_version TEXT NOT NULL DEFAULT 'v1.0.0',
    strategy_update JSONB,
    turn_count INTEGER NOT NULL DEFAULT 0 CHECK (turn_count >= 0),
    active_strategy_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_agent_action TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
    ON public.sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.strategies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id TEXT  -- NULL = global strategy, non-NULL = per-user
);

CREATE INDEX IF NOT EXISTS idx_strategies_created_at
    ON public.strategies (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id
    ON public.strategies (user_id, created_at DESC);

-- Row-Level Security
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
