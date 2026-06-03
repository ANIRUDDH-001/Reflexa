/* eslint-disable no-console */
// @ts-expect-error import.meta is injected by Vite
export const API_BASE: string = import.meta.env.VITE_API_URL || 'http://localhost:8000';

import type { SessionConfig, TurnStreamEvent } from '@reflexa/shared';

export let PHOENIX_TRACE_BASE = 'https://app.phoenix.arize.com/traces';
export function setPhoenixTraceBase(base: string) {
  PHOENIX_TRACE_BASE = base;
}

// ── Lazily resolved to avoid circular import at module init time ──────────────
// CURRENT_USER_ID is set in main.ts before any route is rendered.
let _userId = '';
export function setCurrentUserId(id: string): void {
  _userId = id;
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': _userId,
      ...(init?.headers ?? {}),
    },
  });
}

export const api = {
  async getConfig() {
    const res = await apiFetch('/config');
    if (!res.ok) throw new Error(`config failed: ${res.statusText}`);
    return res.json();
  },

  async createSession(config: SessionConfig) {
    const res = await apiFetch('/session', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  async getSession(id: string) {
    const res = await apiFetch(`/session/${id}`);
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
  },

  async getSessions() {
    // userId comes from X-User-Id header via apiFetch
    const res = await apiFetch('/sessions');
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },

  async getComparison(id: string) {
    const res = await apiFetch(`/session/${id}/compare`);
    if (!res.ok) throw new Error('Failed to fetch comparison');
    return res.json();
  },

  async submitTurn(id: string, text: string) {
    const res = await apiFetch(`/session/${id}/turn`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Failed to submit turn');
    return res.json();
  },

  async endSession(id: string) {
    const res = await apiFetch(`/session/${id}/end`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Failed to end session');
    return res.json();
  },
};

export async function getLatestStrategyInfo(): Promise<{
  version: string;
  rulesCount: number;
  rules: string[];
} | null> {
  try {
    const res = await apiFetch(`/strategy/latest`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Streaming turn via SSE.
 * Yields TurnStreamEvent objects as they arrive from the backend.
 */
export async function* sendTurnStream(
  sessionId: string,
  text: string,
): AsyncGenerator<TurnStreamEvent> {
  const response = await apiFetch(`/session/${sessionId}/turn/stream`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    yield {
      type: 'error',
      message: (err as { error?: string }).error ?? `HTTP ${response.status}`,
    };
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') return;
        try {
          yield JSON.parse(raw) as TurnStreamEvent;
        } catch {
          // Malformed SSE line — skip
        }
      }
    }
  } catch (err) {
    yield {
      type: 'error' as const,
      message: err instanceof Error ? err.message : 'Connection error. Please try again.',
    };
    return;
  }
}
