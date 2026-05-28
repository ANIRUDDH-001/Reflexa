import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from './index';

describe('API Integration Tests', () => {
  describe('GET /health', () => {
    it('returns 200 with status ok and a timestamp', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(typeof res.body.ts).toBe('string');
    });
  });

  describe('POST /session', () => {
    it('returns 201 with a session object when given a valid userId', async () => {
      const res = await request(app).post('/session').send({ userId: 'test-user' });
      expect(res.status).toBe(201);
      expect(res.body.session).toHaveProperty('id');
    });

    it('returns 400 when userId is missing', async () => {
      const res = await request(app).post('/session').send({});
      expect(res.status).toBe(400);
    });

    it('returns 201 with extra fields in config', async () => {
      const res = await request(app)
        .post('/session')
        .send({
          userId: 'test-user',
          config: { role: 'tester', difficulty: 'easy' },
        });
      expect(res.status).toBe(201);
      expect(res.body.session).toHaveProperty('id');
    });
  });

  describe('GET /session/:id', () => {
    it('returns 200 for a just created session', async () => {
      const createRes = await request(app).post('/session').send({ userId: 'test-user-2' });
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
    it.skipIf(!process.env.GOOGLE_API_KEY)('returns 200 with valid text', async () => {
      const createRes = await request(app).post('/session').send({ userId: 'test-user-3' });
      const id = createRes.body.session.id;

      const res = await request(app).post(`/session/${id}/turn`).send({ text: 'Hello' });
      expect(res.status).toBe(200);
    });

    it('returns 400 with missing text', async () => {
      const createRes = await request(app).post('/session').send({ userId: 'test-user-4' });
      const id = createRes.body.session.id;

      const res = await request(app).post(`/session/${id}/turn`).send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent session', async () => {
      const res = await request(app)
        .post(`/session/non-existent-12345/turn`)
        .send({ text: 'Hello' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /session/:id/compare', () => {
    it('returns comparison: null for a session with no previous', async () => {
      const createRes = await request(app).post('/session').send({ userId: 'compare-user-1' });
      const id = createRes.body.session.id;

      const res = await request(app).get(`/session/${id}/compare`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('comparison', null);
    });
  });

  describe('GET /sessions', () => {
    it('returns 200 with a sessions array', async () => {
      const res = await request(app).get('/sessions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.sessions)).toBe(true);
    });

    it('returns 200 with empty sessions array for nonexistent userId', async () => {
      const res = await request(app).get('/sessions?userId=nonexistent');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.sessions)).toBe(true);
      expect(res.body.sessions.length).toBe(0);
    });
  });
});
