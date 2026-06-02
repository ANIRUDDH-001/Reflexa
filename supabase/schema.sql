-- supabase/schema.sql
-- Run this against your Supabase project to initialise Reflexa's schema.
-- Dashboard: SQL Editor → paste and run.
-- CLI: psql "$SUPABASE_URL" -f supabase/schema.sql

-- ============================================================
-- SESSIONS
-- Stores interview session state, trace, and evaluation results
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'active',
  interview_phase     TEXT NOT NULL DEFAULT 'intro',
  started_at          TEXT NOT NULL,
  ended_at            TEXT,
  config              JSONB NOT NULL,
  trace               JSONB NOT NULL DEFAULT '[]',
  evaluation          JSONB,
  eval_trace_id       TEXT,
  strategy_version    TEXT,
  strategy_update     JSONB,
  turn_count          INTEGER NOT NULL DEFAULT 0,
  active_strategy_rules JSONB NOT NULL DEFAULT '[]',
  last_agent_action   TEXT
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
  version         TEXT PRIMARY KEY,
  rules           JSONB NOT NULL DEFAULT '[]',
  created_at      TEXT NOT NULL
);

-- Index for getLatestStrategy()
CREATE INDEX IF NOT EXISTS idx_strategies_created_at
  ON strategies (created_at DESC);

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
