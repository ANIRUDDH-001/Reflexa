-- supabase/schema.sql
-- Run this against your Supabase project to initialise Reflexa's schema.
-- Dashboard: SQL Editor → paste and run.
-- CLI: psql "$SUPABASE_URL" -f supabase/schema.sql

-- ============================================================
-- SESSIONS
-- Stores interview session state, trace, and evaluation results
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id               TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
  interview_phase       TEXT NOT NULL DEFAULT 'intro'
    CHECK (interview_phase IN ('intro', 'exploration', 'deep_dive', 'closing')),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at              TIMESTAMPTZ,
  config                JSONB NOT NULL DEFAULT '{}'::jsonb,
  trace                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluation            JSONB,
  eval_trace_id         TEXT,
  strategy_version      TEXT NOT NULL DEFAULT 'v1.0.0',
  strategy_update       JSONB,
  turn_count            INTEGER NOT NULL DEFAULT 0 CHECK (turn_count >= 0),
  active_strategy_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_agent_action     TEXT
);

-- Index for fast user session lookup
CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON sessions (user_id, started_at DESC);

-- ============================================================
-- STRATEGIES
-- Stores interviewer strategy rules derived from introspection
-- Used to improve subsequent sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS strategies (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version         TEXT NOT NULL UNIQUE,
  rules           JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id         TEXT  -- NULL = global strategy, non-NULL = per-user
);

-- Index for getLatestStrategy()
CREATE INDEX IF NOT EXISTS idx_strategies_created_at
  ON strategies (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id
  ON strategies (user_id, created_at DESC);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
