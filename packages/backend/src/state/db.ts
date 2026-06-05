/* eslint-disable no-console */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { logger } from '../index';
import { BackendSessionState } from './types';

// ── Supabase client (service role — bypasses RLS) ──────────────
function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Lazy singleton
let _client: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (!_client) _client = getClient();
  return _client;
}

// ── helpers ────────────────────────────────────────────────────

// Map Supabase snake_case row → BackendSessionState (camelCase)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyEvaluationShims(evaluation: any) {
  if (evaluation?.rubric) {
    if (
      evaluation.rubric.opportunityCoverage === undefined &&
      evaluation.rubric.missedOpportunities !== undefined
    ) {
      evaluation.rubric.opportunityCoverage = evaluation.rubric.missedOpportunities;
      delete evaluation.rubric.missedOpportunities;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(row: any): BackendSessionState {
  applyEvaluationShims(row.evaluation);

  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    interviewPhase: row.interview_phase,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    config: row.config,
    trace: row.trace ?? [],
    evaluation: row.evaluation ?? undefined,
    evalTraceId: row.eval_trace_id ?? undefined,
    strategyVersion: row.strategy_version,
    strategyUpdate: row.strategy_update ?? undefined,
    turnCount: row.turn_count,
    activeStrategyRules: row.active_strategy_rules ?? [],
    lastAgentAction: row.last_agent_action ?? null,
  } as BackendSessionState;
}

// Map BackendSessionState → Supabase snake_case payload
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sessionToRow(session: BackendSessionState): Record<string, any> {
  return {
    id: session.id,
    user_id: session.userId,
    status: session.status,
    interview_phase: session.interviewPhase,
    started_at: session.startedAt,
    ended_at: session.endedAt ?? null,
    config: session.config,
    trace: session.trace ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evaluation: (session as any).evaluation ?? null,
    eval_trace_id: session.evalTraceId ?? null,
    strategy_version: session.strategyVersion,
    strategy_update: session.strategyUpdate ?? null,
    turn_count: session.turnCount,
    active_strategy_rules: session.activeStrategyRules ?? [],
    last_agent_action: session.lastAgentAction ?? null,
  };
}

// ── Strategies ─────────────────────────────────────────────────

export async function getLatestStrategy(
  userId?: string,
): Promise<{ version: string; rules: string[] } | null> {
  // Try user-specific strategy first
  if (userId) {
    const { data, error } = await db()
      .from('strategies')
      .select('version, rules')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      logger.warn(
        { err: error, userId },
        '[db] getLatestStrategy (user) error, falling through to global',
      );
      // Fall through to global lookup
    } else if (data) {
      return {
        version: data.version,
        rules: Array.isArray(data.rules) ? data.rules : JSON.parse(data.rules as string),
      };
    }
  }

  // Fallback: global strategy (user_id IS NULL)
  const { data, error } = await db()
    .from('strategies')
    .select('version, rules')
    .is('user_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({ err: error }, '[db] getLatestStrategy (global) error');
    return null;
  }
  if (!data) return null;

  return {
    version: data.version,
    rules: Array.isArray(data.rules) ? data.rules : JSON.parse(data.rules as string),
  };
}

export async function saveStrategy(
  version: string,
  rules: string[],
  userId?: string,
): Promise<void> {
  const { error } = await db()
    .from('strategies')
    .upsert(
      { version, rules, created_at: new Date().toISOString(), user_id: userId ?? null },
      { onConflict: 'version' },
    );

  if (error) {
    throw new Error(`[db] saveStrategy failed: ${error.message}`);
  }
}

export async function deleteStrategy(version: string, userId?: string): Promise<void> {
  let query = db().from('strategies').delete().eq('version', version);
  if (userId) query = query.eq('user_id', userId);
  else query = query.is('user_id', null);

  const { error } = await query;
  if (error) {
    throw new Error(`[db] deleteStrategy failed: ${error.message}`);
  }
}

// ── Sessions ───────────────────────────────────────────────────

export async function getSession(id: string): Promise<BackendSessionState | null> {
  const { data, error } = await db().from('sessions').select('*').eq('id', id).maybeSingle();

  if (error) {
    throw new Error(`[db] getSession error: ${error.message}`);
  }
  if (!data) return null;

  return rowToSession(data);
}

export async function saveSession(session: BackendSessionState): Promise<void> {
  const row = sessionToRow(session);

  const { error } = await db().from('sessions').upsert(row, { onConflict: 'id' });

  if (error) {
    throw new Error(`[db] saveSession failed: ${error.message}`);
  }
}

export async function getHistorySessions(userId: string): Promise<
  Array<{
    id: string;
    status: string;
    startedAt: string;
    endedAt?: string;
    config: BackendSessionState['config'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evaluation: any | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strategyUpdate?: any;
    strategyVersion?: string;
  }>
> {
  const { data, error } = await db()
    .from('sessions')
    .select(
      'id, status, started_at, ended_at, config, evaluation, strategy_update, strategy_version',
    )
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (error) {
    throw new Error(`[db] getHistorySessions error: ${error.message}`);
  }

  return (data ?? []).map((r) => {
    applyEvaluationShims(r.evaluation);
    return {
      id: r.id,
      status: r.status,
      startedAt: r.started_at,
      endedAt: r.ended_at ?? undefined,
      config: r.config,
      evaluation: r.evaluation ?? undefined,
      strategyUpdate: r.strategy_update ?? undefined,
      strategyVersion: r.strategy_version ?? undefined,
    };
  });
}
