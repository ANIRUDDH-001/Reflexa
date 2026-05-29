import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { app } from './index';

vi.mock('./state/db', () => ({
  getLatestStrategy: vi.fn().mockResolvedValue({ version: 'v1.0.0', rules: [] }),
  saveStrategy: vi.fn().mockResolvedValue(true),
  getSession: vi.fn().mockImplementation((id) => {
    if (id.includes('non-existent')) return Promise.resolve(null);
    return Promise.resolve({
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
  }),
  saveSession: vi.fn().mockResolvedValue(true),
  getHistorySessions: vi.fn().mockResolvedValue([{ id: 'sess-1' }]),
}));

vi.mock('./engine/llm', () => ({
  processTurn: vi.fn().mockResolvedValue({ agentMessage: 'Hello', traceId: '123' }),
  generateEvaluation: vi.fn().mockResolvedValue({ rubric: { overall: 50 }, summary: 'test' }),
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

      const getRes = await request(app).get(`/session/${id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.session.id).toBe(id);
    });

    it('returns 404 for non-existent id', async () => {
      const getRes = await request(app).get(`/session/non-existent-12345`);
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

      const res = await request(app).get(`/session/${id}/compare`);
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
});
