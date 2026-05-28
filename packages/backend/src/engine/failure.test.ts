import { describe, it, expect, vi } from 'vitest';

vi.mock('./mcp', () => ({
  getMcpToolsAsGemini: vi.fn(),
  callMcpTool: vi.fn(),
}));

import { BackendSessionState } from '../state/types';
import { runIntrospection } from './introspection';
import { getMcpToolsAsGemini } from './mcp';
import { assemblePrompt } from './promptBuilder';

describe('Engine Failure Paths', () => {
  describe('runIntrospection fallback', () => {
    it('returns graceful fallback when MCP is unavailable', async () => {
      vi.mocked(getMcpToolsAsGemini).mockRejectedValueOnce(new Error('MCP unavailable'));

      const result = await runIntrospection('test-session', 50);

      expect(result.whatFailed).toContain('MCP unavailable');
      expect(Array.isArray(result.newRules)).toBe(true);
    });
  });

  describe('assemblePrompt resilience', () => {
    it('does not crash with completely empty/null config', () => {
      const state: BackendSessionState = {
        id: 'test-session',
        userId: 'test-user',
        startedAt: new Date().toISOString(),
        endedAt: null,
        status: 'in_progress',
        interviewPhase: 'intro',
        lastAgentAction: null,
        strategyVersion: 'v1.0.0',
        turnCount: 0,
        config: {
          role: null,
          difficulty: null,
          style: null,
          timeLimit: null,
          focusAreas: [],
        },
        activeStrategyRules: [],
        trace: [],
      };

      const result = assemblePrompt(state);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('does not crash with very long input strings', () => {
      const state: BackendSessionState = {
        id: 'test-session',
        userId: 'test-user',
        startedAt: new Date().toISOString(),
        endedAt: null,
        status: 'in_progress',
        interviewPhase: 'intro',
        lastAgentAction: null,
        strategyVersion: 'v1.0.0',
        turnCount: 0,
        config: {
          role: 'A'.repeat(10000),
          difficulty: 'Hard',
          style: 'System Design',
          timeLimit: null,
          focusAreas: [],
        },
        activeStrategyRules: [],
        trace: [],
      };

      const result = assemblePrompt(state);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
