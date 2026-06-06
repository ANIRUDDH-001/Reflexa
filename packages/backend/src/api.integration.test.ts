import request from 'supertest';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { app } from './index';

vi.mock('./state/db', () => {
  const sessions = new Map();
  return {
    getLatestStrategy: vi.fn().mockResolvedValue({ version: 'v1.0.0', rules: [] }),
    saveStrategy: vi.fn().mockResolvedValue(true),
    getSession: vi.fn().mockImplementation((id) => {
      if (id.includes('non-existent')) return Promise.resolve(null);
      if (!sessions.has(id)) {
        sessions.set(id, {
          id,
          userId: 'test-user',
          status: 'in_progress',
          startedAt: new Date().toISOString(),
          interviewPhase: 'intro',
          strategyVersion: 'v1',
          config: { role: 'backend', difficulty: 'mid', style: 'technical', timeLimit: '30' },
          turnCount: 0,
          trace: [],
        });
      }
      return Promise.resolve(sessions.get(id));
    }),
    saveSession: vi.fn().mockImplementation((session) => {
      sessions.set(session.id, session);
      return Promise.resolve(true);
    }),
    getHistorySessions: vi.fn().mockResolvedValue([{ id: 'sess-1' }]),
  };
});

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

vi.mock('./engine/llm', () => ({
  processTurn: vi.fn().mockResolvedValue({ agentMessage: 'Hello', traceId: '123' }),
  generateEvaluation: vi.fn().mockResolvedValue({
    rubric: {
      overall: 50,
      relevance: 50,
      depth: 50,
      clarity: 50,
      adaptability: 50,
      pacing: 50,
      opportunityCoverage: 50,
    },
    candidateRubric: {
      overall: 45,
      technicalAccuracy: 50,
      communicationClarity: 40,
      problemSolving: 45,
      depthOfKnowledge: 50,
    },
    summary: 'test',
    candidateSummary: 'test candidate summary',
    weakTurns: [],
    strategyOverrides: [],
    traceId: 'c'.repeat(32),
  }),
}));

const TEST_USER_ID = 'test-user-integration';

describe('API Integration Tests', () => {
  describe('GET /health', () => {
    it('returns 200 with status ok and a timestamp', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('service', 'reflexa-backend');
      expect(typeof res.body.timestamp).toBe('string');
    });
  });

  describe('POST /session', () => {
    it('creates a session with a valid config', async () => {
      const res = await request(app)
        .post('/session')
        .set('X-User-Id', TEST_USER_ID)
        .send({
          config: { role: 'backend', difficulty: 'mid', style: 'technical', timeLimit: '30' },
        });

      expect(res.status).toBe(201);
      expect(res.body.session).toMatchObject({
        id: expect.any(String),
        status: 'in_progress',
        userId: TEST_USER_ID,
      });
    });

    it('returns 400 when X-User-Id header is missing', async () => {
      const res = await request(app)
        .post('/session')
        .send({ config: { role: 'backend', difficulty: 'mid' } });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('user identity');
    });
  });

  describe('GET /session/:id', () => {
    it('returns 200 for a just created session', async () => {
      const createRes = await request(app)
        .post('/session')
        .set('X-User-Id', TEST_USER_ID)
        .send({ config: {} });
      const id = createRes.body.session.id;

      const getRes = await request(app).get(`/session/${id}`).set('X-User-Id', TEST_USER_ID);
      expect(getRes.status).toBe(200);
      expect(getRes.body.session.id).toBe(id);
    });

    it('returns 404 for non-existent id', async () => {
      const getRes = await request(app)
        .get(`/session/non-existent-12345`)
        .set('X-User-Id', TEST_USER_ID);
      expect(getRes.status).toBe(404);
    });
  });

  describe('POST /session/:id/turn', () => {
    let sessionId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/session')
        .set('X-User-Id', TEST_USER_ID)
        .send({ config: { role: 'backend', difficulty: 'senior' } });
      sessionId = res.body.session.id;
    });

    it.skipIf(!process.env.GOOGLE_API_KEY)('returns 200 with valid text', async () => {
      const res = await request(app)
        .post(`/session/${sessionId}/turn`)
        .set('X-User-Id', TEST_USER_ID)
        .send({ text: 'Hello' });
      expect(res.status).toBe(200);
    });

    it('returns 400 with missing text', async () => {
      const res = await request(app)
        .post(`/session/${sessionId}/turn`)
        .set('X-User-Id', TEST_USER_ID)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent session', async () => {
      const res = await request(app)
        .post(`/session/non-existent-12345/turn`)
        .set('X-User-Id', TEST_USER_ID)
        .send({ text: 'Hello' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /session/:id/compare', () => {
    it('returns comparison: null for a session with no previous', async () => {
      const createRes = await request(app)
        .post('/session')
        .set('X-User-Id', 'compare-user-1')
        .send({ config: {} });
      const id = createRes.body.session.id;

      const res = await request(app)
        .get(`/session/${id}/compare`)
        .set('X-User-Id', 'compare-user-1');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('comparison', null);
    });
  });

  describe('GET /sessions', () => {
    it('returns sessions array for a known user', async () => {
      const res = await request(app).get('/sessions').set('X-User-Id', TEST_USER_ID);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.sessions)).toBe(true);
    });

    it('returns 400 when X-User-Id is missing', async () => {
      const res = await request(app).get('/sessions');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('user identity');
    });
  });
  describe('Session ownership enforcement', () => {
    it('GET /session/:id with no X-User-Id returns 401', async () => {
      const res = await request(app).get('/session/demo-session-1');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });

    it('GET /session/:id with wrong X-User-Id returns 403', async () => {
      const res = await request(app).get('/session/demo-session-1').set('X-User-Id', 'wrong-user');
      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });

    it('POST /session/:id/end on completed session returns 200 without re-running evaluation', async () => {
      // First end
      await request(app).post('/session/demo-session-1/end').set('X-User-Id', 'test-user');

      // Second end — should be idempotent
      const res = await request(app)
        .post('/session/demo-session-1/end')
        .set('X-User-Id', 'test-user');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
    });
  });

  describe('CORS configuration', () => {
    beforeEach(() => {
      process.env.FRONTEND_ORIGIN = 'https://reflexa.vercel.app';
    });

    it('allows requests from FRONTEND_ORIGIN', async () => {
      const res = await request(app)
        .options('/session')
        .set('Origin', 'https://reflexa.vercel.app')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBe('https://reflexa.vercel.app');
    });

    it('blocks requests from unknown origin', async () => {
      const res = await request(app).get('/health').set('Origin', 'https://evil.example.com');

      // Should not reflect the evil origin back
      expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example.com');
    });

    it('allows multiple origins when comma-separated', async () => {
      process.env.FRONTEND_ORIGIN = 'https://reflexa.vercel.app,https://staging.reflexa.app';

      const res = await request(app)
        .options('/session')
        .set('Origin', 'https://staging.reflexa.app')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.headers['access-control-allow-origin']).toBe('https://staging.reflexa.app');
    });

    it('allows requests with no origin (curl, server-to-server)', async () => {
      const res = await request(app).get('/health');

      expect(res.status).not.toBe(403);
    });
  });
});
