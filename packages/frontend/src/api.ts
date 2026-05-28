// @ts-expect-error import.meta is injected by Vite
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

import type { SessionConfig } from '@reflexa/shared';

export const api = {
  async createSession(config: SessionConfig) {
    const res = await fetch(`${API_BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'demo-user', config }),
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  async getSession(id: string) {
    const res = await fetch(`${API_BASE}/session/${id}`);
    if (!res.ok) throw new Error('Failed to fetch session');
    return res.json();
  },

  async submitTurn(id: string, text: string) {
    const res = await fetch(`${API_BASE}/session/${id}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Failed to submit turn');
    return res.json();
  },

  async endSession(id: string) {
    const res = await fetch(`${API_BASE}/session/${id}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Failed to end session');
    return res.json();
  },
};
