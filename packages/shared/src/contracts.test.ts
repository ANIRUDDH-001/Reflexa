import { describe, it, expect } from 'vitest';
import { APIContracts } from './contracts';

describe('contracts', () => {
  describe('APIContracts.HealthResponse', () => {
    it('accepts { status: "ok", ts: "..." }', () => {
      const valid = { status: 'ok', ts: '2023-10-10T10:00:00Z' };
      expect(APIContracts.HealthResponse.safeParse(valid).success).toBe(true);
    });

    it('rejects missing ts', () => {
      const invalid = { status: 'ok' };
      expect(APIContracts.HealthResponse.safeParse(invalid).success).toBe(false);
    });

    it('rejects extra fields (strict mode)', () => {
      const invalid = { status: 'ok', ts: '2023-10-10T10:00:00Z', extra: true };
      expect(APIContracts.HealthResponse.safeParse(invalid).success).toBe(false);
    });
  });

  describe('APIContracts.CreateSessionRequest', () => {
    it('accepts valid body with userId', () => {
      const valid = { userId: 'user-1' };
      expect(APIContracts.CreateSessionRequest.safeParse(valid).success).toBe(true);
    });

    it('rejects missing userId', () => {
      const invalid = {};
      expect(APIContracts.CreateSessionRequest.safeParse(invalid).success).toBe(false);
    });

    it('rejects userId longer than 100 chars', () => {
      const longId = 'a'.repeat(101);
      const invalid = { userId: longId };
      expect(APIContracts.CreateSessionRequest.safeParse(invalid).success).toBe(false);
    });
  });

  describe('APIContracts.SessionConfig', () => {
    it('rejects extra fields (strict mode)', () => {
      const valid = { role: 'developer', focusAreas: [] };
      expect(APIContracts.SessionConfig.safeParse(valid).success).toBe(true);

      const invalid = { role: 'developer', focusAreas: [], extra: 'field' };
      expect(APIContracts.SessionConfig.safeParse(invalid).success).toBe(false);
    });
  });

  describe('APIContracts.TurnRequest', () => {
    it('accepts valid text', () => {
      const valid = { text: 'Hello, world!' };
      expect(APIContracts.TurnRequest.safeParse(valid).success).toBe(true);
    });

    it('rejects text longer than 5000 chars', () => {
      const longText = 'a'.repeat(5001);
      const invalid = { text: longText };
      expect(APIContracts.TurnRequest.safeParse(invalid).success).toBe(false);
    });

    it('rejects empty object', () => {
      const invalid = {};
      expect(APIContracts.TurnRequest.safeParse(invalid).success).toBe(false);
    });
  });

  describe('APIContracts.EndSessionRequest', () => {
    it('accepts empty object', () => {
      const valid = {};
      expect(APIContracts.EndSessionRequest.safeParse(valid).success).toBe(true);
    });
  });

  describe('APIContracts.EndSessionResponse', () => {
    it('validates a correct completed response', () => {
      const valid = {
        status: 'completed',
        analysisSummary: 'Summary',
        strategySummary: 'Strategy',
        traceId: 'trace-1',
      };
      expect(APIContracts.EndSessionResponse.safeParse(valid).success).toBe(true);
    });

    it('rejects non-"completed" status', () => {
      const invalid = {
        status: 'in_progress',
        analysisSummary: 'Summary',
        strategySummary: 'Strategy',
        traceId: 'trace-1',
      };
      expect(APIContracts.EndSessionResponse.safeParse(invalid).success).toBe(false);
    });
  });
});
