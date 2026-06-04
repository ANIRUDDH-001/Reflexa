/* eslint-disable no-console */
// @ts-expect-error import.meta is injected by Vite
export const API_BASE: string = import.meta.env.VITE_API_URL || 'http://localhost:8000';

import type { SessionConfig, TurnStreamEvent } from '@reflexa/shared';
import { getSession } from './auth';

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
  // Get JWT access token and user ID from Supabase session in one call
  const session = await getSession();
  const token = session?.access_token;
  const authUserId = session?.user?.id;

  // Get authenticated user ID as fallback X-User-Id
  const authHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Id': authUserId || _userId,
  };

  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
  });

  // Handle auth errors by redirecting to login
  if (response.status === 401) {
    window.location.hash = '#/login';
    throw new Error('Unauthorized — redirecting to login');
  }
  if (response.status === 403) {
    throw new Error('Forbidden — you do not have access to this resource');
  }

  return response;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sessionsCache: any = null;
let _sessionsCacheTime: number = 0;

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

  async getSessions(forceRefresh = false) {
    if (!forceRefresh && _sessionsCache && Date.now() - _sessionsCacheTime < 30000) {
      return _sessionsCache;
    }
    // userId comes from X-User-Id header via apiFetch
    const res = await apiFetch('/sessions');
    if (!res.ok) throw new Error('Failed to fetch sessions');
    const data = await res.json();
    _sessionsCache = data;
    _sessionsCacheTime = Date.now();
    return data;
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
  signal?: AbortSignal,
): AsyncGenerator<TurnStreamEvent> {
  const response = await apiFetch(`/session/${sessionId}/turn/stream`, {
    method: 'POST',
    body: JSON.stringify({ text }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    yield {
      type: 'error',
      message: (err as { error?: string }).error ?? `HTTP ${response.status}`,
    };
    return;
  }

  if (!response.body) {
    yield { type: 'error', message: 'Streaming not supported — response body is null' };
    return;
  }

  const reader = response.body.getReader();
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
