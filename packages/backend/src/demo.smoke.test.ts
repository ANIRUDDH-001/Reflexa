import { describe, it, expect } from 'vitest';

const SMOKE = process.env.RUN_SMOKE_TESTS === 'true';

describe.skipIf(!SMOKE)('Demo smoke test — full self-improvement loop', () => {
  const BASE = process.env.API_BASE || 'http://localhost:8000';

  it('GET /health returns ok', async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
  });

  it('GET /session/demo-session-1 returns the baseline weak session', async () => {
    const res = await fetch(`${BASE}/session/demo-session-1`, {
      headers: { 'X-User-Id': 'demo-user' },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.session?.evaluation?.rubric?.overall).toBeLessThan(50);
  });

  it('GET /session/demo-session-2 returns the improved session', async () => {
    const res = await fetch(`${BASE}/session/demo-session-2`, {
      headers: { 'X-User-Id': 'demo-user' },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.session?.evaluation?.rubric?.overall).toBeGreaterThan(60);
  });

  it('GET /session/demo-session-1/compare returns a comparison with higher scores in session 2', async () => {
    const res = await fetch(`${BASE}/session/demo-session-2/compare`, {
      headers: { 'X-User-Id': 'demo-user' },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.comparison.delta.overall).toBeGreaterThan(0);
  });

  it('GET /sessions returns both demo sessions for demo-user', async () => {
    const res = await fetch(`${BASE}/sessions`, {
      headers: { 'X-User-Id': 'demo-user' },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.sessions.length).toBeGreaterThanOrEqual(2);
  });
});
