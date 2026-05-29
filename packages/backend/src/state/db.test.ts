import crypto from 'crypto';
import { describe, it, expect } from 'vitest';
import { saveSession, getSession, getHistorySessions, saveStrategy, getLatestStrategy } from './db';
import { BackendSessionState } from './types';

/**
 * Helper: build a minimal valid BackendSessionState with optional overrides.
 * Every call gets a fresh random id + userId to avoid cross-test collisions.
 */
function makeSession(overrides: Partial<BackendSessionState> = {}): BackendSessionState {
  return {
    id: crypto.randomUUID(),
    userId: `user-${crypto.randomUUID()}`,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    endedAt: null,
    interviewPhase: 'intro',
    lastAgentAction: null,
    strategyVersion: 'v1.0.0',
    config: {
      role: 'Software Engineer',
      difficulty: 'Medium',
      style: 'Technical Interview',
      timeLimit: '30',
      focusAreas: ['system design', 'algorithms'],
    },
    trace: [],
    turnCount: 0,
    activeStrategyRules: undefined,
    ...overrides,
  } as BackendSessionState;
}

// ---------------------------------------------------------------------------
// Session CRUD
// ---------------------------------------------------------------------------
describe.skipIf(process.env.SUPABASE_URL === 'http://localhost:54321')('db – sessions', () => {
  it('saveSession then getSession round-trips all fields', async () => {
    const session = makeSession({
      interviewPhase: 'exploration',
      lastAgentAction: 'asked_question',
      turnCount: 3,
      activeStrategyRules: ['rule-a', 'rule-b'],
    });

    await saveSession(session);
    const loaded = await getSession(session.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(session.id);
    expect(loaded!.userId).toBe(session.userId);
    expect(loaded!.status).toBe(session.status);
    expect(loaded!.interviewPhase).toBe(session.interviewPhase);
    expect(loaded!.startedAt).toBe(session.startedAt);
    expect(loaded!.strategyVersion).toBe(session.strategyVersion);
    expect(loaded!.turnCount).toBe(session.turnCount);
    expect(loaded!.config).toEqual(session.config);
    expect(loaded!.trace).toEqual(session.trace);
    expect(loaded!.activeStrategyRules).toEqual(session.activeStrategyRules);
    // lastAgentAction is always null on read (hard-coded in getSession)
    expect(loaded!.lastAgentAction).toBeNull();
  });

  it('getSession returns null for a non-existent id', async () => {
    const result = await getSession(`nonexistent-${crypto.randomUUID()}`);
    expect(result).toBeNull();
  });

  it('saveSession upserts – updating status is persisted', async () => {
    const session = makeSession({ status: 'in_progress' });
    await saveSession(session);

    // Mutate and save again
    session.status = 'completed';
    session.endedAt = new Date().toISOString();
    session.interviewPhase = 'closing';
    session.turnCount = 10;
    await saveSession(session);

    const loaded = await getSession(session.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.status).toBe('completed');
    expect(loaded!.endedAt).toBe(session.endedAt);
    expect(loaded!.interviewPhase).toBe('closing');
    expect(loaded!.turnCount).toBe(10);
  });

  it('session with evaluation data round-trips correctly', async () => {
    const evaluation = {
      id: crypto.randomUUID(),
      sessionId: 'will-be-set',
      score: 85,
      summary: 'Good performance overall',
      evaluatedAt: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = makeSession() as any;
    evaluation.sessionId = session.id;
    session.evaluation = evaluation;

    await saveSession(session);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loaded = (await getSession(session.id)) as any;

    expect(loaded).not.toBeNull();
    expect(loaded.evaluation).toBeDefined();
    expect(loaded.evaluation.id).toBe(evaluation.id);
    expect(loaded.evaluation.score).toBe(85);
    expect(loaded.evaluation.summary).toBe('Good performance overall');
    expect(loaded.evaluation.evaluatedAt).toBe(evaluation.evaluatedAt);
  });
});

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
describe.skipIf(process.env.SUPABASE_URL === 'http://localhost:54321')(
  'db – getHistorySessions',
  () => {
    it('returns sessions in descending chronological order', async () => {
      const userId = `user-${crypto.randomUUID()}`;

      const s1 = makeSession({ userId, startedAt: '2025-01-01T00:00:00Z' });
      const s2 = makeSession({ userId, startedAt: '2025-06-01T00:00:00Z' });
      const s3 = makeSession({ userId, startedAt: '2025-03-01T00:00:00Z' });

      await saveSession(s1);
      await saveSession(s2);
      await saveSession(s3);

      const history = await getHistorySessions(userId);
      expect(history).toHaveLength(3);
      // Most recent first
      expect(history[0].id).toBe(s2.id);
      expect(history[1].id).toBe(s3.id);
      expect(history[2].id).toBe(s1.id);
    });

    it('returns an empty array for an unknown userId', async () => {
      const history = await getHistorySessions(`unknown-${crypto.randomUUID()}`);
      expect(history).toEqual([]);
    });
  },
);

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------
describe.skipIf(process.env.SUPABASE_URL === 'http://localhost:54321')('db – strategies', () => {
  it('saveStrategy then getLatestStrategy round-trips version and rules', async () => {
    const version = `v-test-${crypto.randomUUID()}`;
    const rules = ['ask follow-up after vague answer', 'limit hints to 2 per session'];

    await saveStrategy(version, rules);
    const latest = await getLatestStrategy();

    expect(latest).not.toBeNull();
    // The latest may or may not be ours if other tests saved strategies, so
    // fetch by checking version matches when it is ours.
    // Because autoincrement id determines "latest", and we just inserted,
    // the latest should be ours.
    expect(latest!.version).toBe(version);
    expect(latest!.rules).toEqual(rules);
  });

  it('getLatestStrategy returns the most recently inserted strategy', async () => {
    const v1 = `v-old-${crypto.randomUUID()}`;
    const v2 = `v-new-${crypto.randomUUID()}`;

    await saveStrategy(v1, ['rule-old']);
    await saveStrategy(v2, ['rule-new-1', 'rule-new-2']);

    const latest = await getLatestStrategy();
    expect(latest).not.toBeNull();
    expect(latest!.version).toBe(v2);
    expect(latest!.rules).toEqual(['rule-new-1', 'rule-new-2']);
  });
});
