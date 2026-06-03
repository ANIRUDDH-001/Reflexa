import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock auth module so apiFetch doesn't call real Supabase
vi.mock('../auth', () => ({
  getAccessToken: vi.fn().mockResolvedValue(null),
  getUser: vi.fn().mockResolvedValue(null),
}));

import { getLatestStrategyInfo } from '../api';

describe('getLatestStrategyInfo', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns null on network error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    const result = await getLatestStrategyInfo();
    expect(result).toBeNull();
  });

  it('returns strategy data on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ version: 'v123', rulesCount: 3, rules: ['r1', 'r2', 'r3'] }),
    } as unknown as Response);
    const result = await getLatestStrategyInfo();
    expect(result?.version).toBe('v123');
    expect(result?.rulesCount).toBe(3);
  });
});
