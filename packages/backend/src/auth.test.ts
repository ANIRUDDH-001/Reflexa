import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('./engine/llm', () => ({
  processTurn: vi.fn().mockResolvedValue({ text: 'mock response', traceId: 'a'.repeat(32) }),
  // eslint-disable-next-line require-yield
  processTurnStream: vi.fn(async function* () {
    yield {
      type: 'done',
      fullText: '{"agentMessage":"hi"}',
      traceId: 'a'.repeat(32),
      phase: 'intro',
    };
  }),
  generateEvaluation: vi.fn().mockResolvedValue({
    rubric: {
      overall: 70,
      relevance: 70,
      depth: 70,
      clarity: 70,
      adaptability: 70,
      pacing: 70,
      opportunityCoverage: 70,
    },
    candidateRubric: {
      overall: 65,
      technicalAccuracy: 68,
      communicationClarity: 70,
      problemSolving: 60,
      depthOfKnowledge: 62,
    },
    summary: 'ok',
    candidateSummary: 'Candidate performed adequately',
    weakTurns: [],
    strategyOverrides: [],
    traceId: 'b'.repeat(32),
  }),
}));

vi.mock('./engine/introspection', () => ({
  runIntrospection: vi.fn().mockResolvedValue({
    whatFailed: 'test',
    whyItFailed: 'test',
    whatToDoNextTime: 'test',
    whatToAvoidNextTime: 'test',
    newRules: ['Continue evaluating normally.'],
  }),
}));

vi.mock('./state/db', () => ({
  getSession: vi.fn(),
  saveSession: vi.fn().mockResolvedValue(undefined),
  saveStrategy: vi.fn().mockResolvedValue(undefined),
  getHistorySessions: vi.fn().mockResolvedValue([]),
  getLatestStrategy: vi.fn().mockResolvedValue({ version: 'v1.0.0', rules: [] }),
}));

vi.mock('./middleware/auth', () => ({
  extractAuthenticatedUser: vi
    .fn()
    .mockImplementation(async (req: { headers: Record<string, string | undefined> }) => {
      const headerUserId = req.headers['x-user-id'];
      if (headerUserId) {
        return { id: headerUserId };
      }
      return null;
    }),
}));

import { getSession } from './state/db';
import type { BackendSessionState } from './state/types';
import { app } from './index';

// ── Fixtures ───────────────────────────────────────────────────

const OWNER_ID = 'owner-user-123';
const OTHER_ID = 'other-user-456';
const SESSION_ID = 'test-session-auth';

function makeSession(userId = OWNER_ID, status = 'in_progress'): BackendSessionState {
  return {
    id: SESSION_ID,
    userId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: status as any,
    interviewPhase: 'intro',
    startedAt: new Date().toISOString(),
    endedAt: undefined,
    config: {
      role: 'backend',
      difficulty: 'senior',
      timeLimit: '30',
      style: 'technical',
      focusAreas: [],
    },
    trace: [],
    evaluation: undefined,
    evalTraceId: undefined,
    strategyVersion: 'v1.0.0',
    strategyUpdate: undefined,
    turnCount: 0,
    activeStrategyRules: [],
    lastAgentAction: null,
  } as BackendSessionState;
}

// ── Test matrix ─────────────────────────────────────────────────

describe('Authorization: GET /session/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(makeSession());
  });

  it('returns 401 when X-User-Id header is missing', async () => {
    const res = await request(app).get(`/session/${SESSION_ID}`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 when X-User-Id does not match session owner', async () => {
    const res = await request(app).get(`/session/${SESSION_ID}`).set('X-User-Id', OTHER_ID);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/forbidden/i);
  });

  it('returns 200 when X-User-Id matches session owner', async () => {
    const res = await request(app).get(`/session/${SESSION_ID}`).set('X-User-Id', OWNER_ID);
    expect(res.status).toBe(200);
  });

  it('returns 404 for a non-existent session', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(null);
    const res = await request(app).get(`/session/nonexistent-id`).set('X-User-Id', OWNER_ID);
    expect(res.status).toBe(404);
  });
});

describe('Authorization: POST /session/:id/turn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(makeSession());
  });

  it('returns 401 when X-User-Id header is missing', async () => {
    const res = await request(app).post(`/session/${SESSION_ID}/turn`).send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-User-Id does not match session owner', async () => {
    const res = await request(app)
      .post(`/session/${SESSION_ID}/turn`)
      .set('X-User-Id', OTHER_ID)
      .send({ text: 'hello' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when session is not in_progress', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(makeSession(OWNER_ID, 'completed'));
    const res = await request(app)
      .post(`/session/${SESSION_ID}/turn`)
      .set('X-User-Id', OWNER_ID)
      .send({ text: 'hello' });
    expect(res.status).toBe(400);
  });
});

describe('Authorization: POST /session/:id/turn/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(makeSession());
  });

  it('returns 401 when X-User-Id header is missing', async () => {
    const res = await request(app)
      .post(`/session/${SESSION_ID}/turn/stream`)
      .send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-User-Id does not match session owner', async () => {
    const res = await request(app)
      .post(`/session/${SESSION_ID}/turn/stream`)
      .set('X-User-Id', OTHER_ID)
      .send({ text: 'hello' });
    expect(res.status).toBe(403);
  });
});

describe('Authorization: POST /session/:id/end', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(makeSession());
  });

  it('returns 401 when X-User-Id header is missing', async () => {
    const res = await request(app).post(`/session/${SESSION_ID}/end`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-User-Id does not match session owner', async () => {
    const res = await request(app).post(`/session/${SESSION_ID}/end`).set('X-User-Id', OTHER_ID);
    expect(res.status).toBe(403);
  });

  it('returns 200 when called on an already-completed session (idempotent)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(makeSession(OWNER_ID, 'completed'));
    const res = await request(app).post(`/session/${SESSION_ID}/end`).set('X-User-Id', OWNER_ID);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/already completed/i);
  });

  it('returns 400 when session is abandoned', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(makeSession(OWNER_ID, 'abandoned'));
    const res = await request(app).post(`/session/${SESSION_ID}/end`).set('X-User-Id', OWNER_ID);
    expect(res.status).toBe(400);
  });
});

describe('Authorization: GET /session/:id/compare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(makeSession());
  });

  it('returns 401 when X-User-Id header is missing', async () => {
    const res = await request(app).get(`/session/${SESSION_ID}/compare`);
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-User-Id does not match session owner', async () => {
    const res = await request(app).get(`/session/${SESSION_ID}/compare`).set('X-User-Id', OTHER_ID);
    expect(res.status).toBe(403);
  });
});
