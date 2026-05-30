/* eslint-disable no-console */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';
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
function db(): SupabaseClient {
  if (!_client) _client = getClient();
  return _client;
}

// ── helpers ────────────────────────────────────────────────────

// Map Supabase snake_case row → BackendSessionState (camelCase)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(row: any): BackendSessionState {
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

export async function getLatestStrategy(): Promise<{ version: string; rules: string[] } | null> {
  const { data, error } = await db()
    .from('strategies')
    .select('version, rules')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[db] getLatestStrategy error:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    version: data.version,
    rules: Array.isArray(data.rules) ? data.rules : JSON.parse(data.rules as string),
  };
}

export async function saveStrategy(version: string, rules: string[]): Promise<void> {
  const { error } = await db()
    .from('strategies')
    .upsert({ version, rules, created_at: new Date().toISOString() }, { onConflict: 'version' });

  if (error) {
    throw new Error(`[db] saveStrategy failed: ${error.message}`);
  }
}

export async function deleteStrategy(version: string): Promise<void> {
  const { error } = await db().from('strategies').delete().eq('version', version);
  if (error) {
    throw new Error(`[db] deleteStrategy failed: ${error.message}`);
  }
}

// ── Sessions ───────────────────────────────────────────────────

export async function getSession(id: string): Promise<BackendSessionState | null> {
  const { data, error } = await db().from('sessions').select('*').eq('id', id).maybeSingle();

  if (error) {
    console.error('[db] getSession error:', error.message);
    return null;
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
    config: BackendSessionState['config'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evaluation: any | undefined;
  }>
> {
  const { data, error } = await db()
    .from('sessions')
    .select('id, status, started_at, config, evaluation')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('[db] getHistorySessions error:', error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    startedAt: r.started_at,
    config: r.config,
    evaluation: r.evaluation ?? undefined,
  }));
}
