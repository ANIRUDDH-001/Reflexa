import request from 'supertest';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the LLM engine
vi.mock('./engine/llm', () => ({
  processTurnStream: vi.fn(),
  processTurn: vi.fn(),
  generateEvaluation: vi.fn(),
}));

vi.mock('./state/db', () => ({
  getSession: vi.fn(),
  saveSession: vi.fn().mockResolvedValue(undefined),
  getHistorySessions: vi.fn().mockResolvedValue([]),
  getLatestStrategy: vi.fn().mockResolvedValue({ version: 'v1.0.0', rules: [] }),
  saveStrategy: vi.fn().mockResolvedValue(undefined),
}));

import { processTurnStream } from './engine/llm';
import { getSession } from './state/db';
import type { BackendSessionState } from './state/types';
import { app } from './index';

function mockSession(userId = 'test-user', status = 'in_progress'): BackendSessionState {
  return {
    id: 'test-session-stream',
    userId,
    status,
    interviewPhase: 'intro',
    startedAt: new Date().toISOString(),
    config: { role: 'backend', difficulty: 'senior', timeLimit: '30' },
    trace: [],
    turnCount: 0,
    strategyVersion: 'v1.0.0',
    activeStrategyRules: [],
    lastAgentAction: null,
  } as BackendSessionState;
}

// Helper to parse SSE response body into events
function parseSSEEvents(text: string): Array<Record<string, unknown>> {
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: ') && !line.includes('[DONE]'))
    .map((line) => {
      try {
        return JSON.parse(line.slice(6));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

describe('POST /session/:id/turn/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(mockSession());
  });

  it('returns 401 when X-User-Id header is missing', async () => {
    const res = await request(app)
      .post('/session/test-session-stream/turn/stream')
      .send({ text: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-User-Id does not match session owner', async () => {
    const res = await request(app)
      .post('/session/test-session-stream/turn/stream')
      .set('X-User-Id', 'wrong-user')
      .send({ text: 'Hello' });
    expect(res.status).toBe(403);
  });

  it('sets correct SSE headers', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (processTurnStream as any).mockImplementation(async function* () {
      yield {
        type: 'done',
        fullText: '{"agentMessage":"Hi"}',
        traceId: 'a'.repeat(32),
        phase: 'intro',
      };
    });

    const res = await request(app)
      .post('/session/test-session-stream/turn/stream')
      .set('X-User-Id', 'test-user')
      .set('Content-Type', 'application/json')
      .send({ text: 'Hello' });

    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['x-accel-buffering']).toBe('no');
  });

  it('emits token events followed by done event', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (processTurnStream as any).mockImplementation(async function* () {
      yield { type: 'token', text: 'What ' };
      yield { type: 'token', text: 'is ' };
      yield { type: 'token', text: 'a goroutine?' };
      yield {
        type: 'done',
        fullText: '{"agentMessage":"What is a goroutine?"}',
        traceId: 'a'.repeat(32),
        phase: 'deep_dive',
      };
    });

    const res = await request(app)
      .post('/session/test-session-stream/turn/stream')
      .set('X-User-Id', 'test-user')
      .send({ text: 'Tell me about Go' });

    const events = parseSSEEvents(res.text);
    const tokenEvents = events.filter((e) => e.type === 'token');
    const doneEvents = events.filter((e) => e.type === 'done');

    expect(tokenEvents.length).toBe(3);
    expect(doneEvents.length).toBe(1);
    expect(doneEvents[0].phase).toBe('intro');
  });

  it('emits error event and still sends [DONE]', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (processTurnStream as any).mockImplementation(async function* () {
      yield { type: 'error', message: 'All fallback models exhausted' };
    });

    const res = await request(app)
      .post('/session/test-session-stream/turn/stream')
      .set('X-User-Id', 'test-user')
      .send({ text: 'Hello' });

    const events = parseSSEEvents(res.text);
    expect(events.some((e) => e.type === 'error')).toBe(true);
    expect(res.text).toContain('[DONE]');
  });

  it('returns 400 when session is not in_progress', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (getSession as any).mockResolvedValue(mockSession('test-user', 'completed'));

    const res = await request(app)
      .post('/session/test-session-stream/turn/stream')
      .set('X-User-Id', 'test-user')
      .send({ text: 'Hello' });

    expect(res.status).toBe(400);
  });
});
