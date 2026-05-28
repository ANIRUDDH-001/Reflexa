import { describe, it, expect } from 'vitest';
import { Schemas } from './schemas';

describe('schemas', () => {
  describe('Schemas.EvaluationRubric', () => {
    it('accepts valid scores (0-100 for each field) and produces correct types', () => {
      const valid = {
        relevance: 100,
        depth: 0,
        clarity: 50,
        adaptability: 75,
        pacing: 80,
        missedOpportunities: 10,
        overall: 90,
      };
      const result = Schemas.EvaluationRubric.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(valid);
      }
    });

    it('rejects scores below 0 and above 100', () => {
      const tooLow = {
        relevance: -1,
        depth: 50,
        clarity: 50,
        adaptability: 50,
        pacing: 50,
        missedOpportunities: 50,
        overall: 50,
      };
      expect(Schemas.EvaluationRubric.safeParse(tooLow).success).toBe(false);

      const tooHigh = {
        relevance: 50,
        depth: 101,
        clarity: 50,
        adaptability: 50,
        pacing: 50,
        missedOpportunities: 50,
        overall: 50,
      };
      expect(Schemas.EvaluationRubric.safeParse(tooHigh).success).toBe(false);
    });
  });

  describe('Schemas.WeakTurn', () => {
    it('requires all fields including failurePatternLabel', () => {
      const valid = {
        turnLabel: 'turn-1',
        summary: 'summary',
        explanation: 'explanation',
        traceData: 'trace-data',
        failurePatternLabel: 'pattern-1',
      };
      expect(Schemas.WeakTurn.safeParse(valid).success).toBe(true);
    });

    it('rejects objects missing failurePatternLabel', () => {
      const invalid = {
        turnLabel: 'turn-1',
        summary: 'summary',
        explanation: 'explanation',
        traceData: 'trace-data',
      };
      expect(Schemas.WeakTurn.safeParse(invalid).success).toBe(false);
    });
  });

  describe('Schemas.EvaluationResult', () => {
    it('is valid with rubric, summary, weakTurns, and strategyOverrides', () => {
      const valid = {
        id: 'result-1',
        sessionId: 'session-1',
        rubric: {
          relevance: 90,
          depth: 85,
          clarity: 80,
          adaptability: 95,
          pacing: 90,
          missedOpportunities: 10,
          overall: 88,
        },
        summary: 'Good session overall',
        weakTurns: [
          {
            turnLabel: 'Turn 3',
            summary: 'Lost context',
            explanation: 'The AI forgot the previous question',
            traceData: 't3',
            failurePatternLabel: 'Context Loss',
          },
        ],
        strategyOverrides: ['Focus on clarity'],
        evaluatedAt: '2023-10-10T10:00:00Z',
      };
      expect(Schemas.EvaluationResult.safeParse(valid).success).toBe(true);
    });

    it('allows optional score (legacy field)', () => {
      const validWithScore = {
        id: 'result-2',
        sessionId: 'session-2',
        score: 85,
        evaluatedAt: '2023-10-10T10:00:00Z',
      };
      expect(Schemas.EvaluationResult.safeParse(validWithScore).success).toBe(true);
    });
  });

  describe('Schemas.StrategyUpdate', () => {
    it('requires whatFailed, whyItFailed, whatToDoNextTime, whatToAvoidNextTime', () => {
      const valid = {
        id: 'su-1',
        sessionId: 'session-1',
        whatFailed: 'fail',
        whyItFailed: 'why',
        whatToDoNextTime: 'do',
        whatToAvoidNextTime: 'avoid',
        updatedAt: '2023-10-10T10:00:00Z',
      };
      expect(Schemas.StrategyUpdate.safeParse(valid).success).toBe(true);
    });

    it('rejects objects missing any of the 4 required fields', () => {
      const base = {
        id: 'su-2',
        sessionId: 'session-2',
        updatedAt: '2023-10-10T10:00:00Z',
      };
      expect(
        Schemas.StrategyUpdate.safeParse({
          ...base,
          whyItFailed: 'x',
          whatToDoNextTime: 'y',
          whatToAvoidNextTime: 'z',
        }).success,
      ).toBe(false);
      expect(
        Schemas.StrategyUpdate.safeParse({
          ...base,
          whatFailed: 'w',
          whatToDoNextTime: 'y',
          whatToAvoidNextTime: 'z',
        }).success,
      ).toBe(false);
      expect(
        Schemas.StrategyUpdate.safeParse({
          ...base,
          whatFailed: 'w',
          whyItFailed: 'x',
          whatToAvoidNextTime: 'z',
        }).success,
      ).toBe(false);
      expect(
        Schemas.StrategyUpdate.safeParse({
          ...base,
          whatFailed: 'w',
          whyItFailed: 'x',
          whatToDoNextTime: 'y',
        }).success,
      ).toBe(false);
    });
  });

  describe('Schemas.SessionComparison', () => {
    it('delta is a record of numbers', () => {
      const valid = {
        baselineSessionId: 's1',
        currentSessionId: 's2',
        delta: { overall: 5, pacing: -2 },
        behaviorChanges: 'Improved pacing',
      };
      expect(Schemas.SessionComparison.safeParse(valid).success).toBe(true);

      const invalid = {
        baselineSessionId: 's1',
        currentSessionId: 's2',
        delta: { overall: '5' },
        behaviorChanges: 'Improved pacing',
      };
      expect(Schemas.SessionComparison.safeParse(invalid).success).toBe(false);
    });
  });

  describe('Schemas.InterviewSession', () => {
    it('accepts a full valid session object', () => {
      const valid = {
        id: 'session-1',
        userId: 'user-1',
        startedAt: '2023-10-10T09:00:00Z',
        endedAt: '2023-10-10T10:00:00Z',
        status: 'completed',
        questions: [
          {
            id: 'q1',
            title: 'Q1',
            body: 'Body1',
            difficulty: 'medium',
          },
        ],
        trace: [
          {
            id: 't1',
            sessionId: 'session-1',
            timestamp: '2023-10-10T09:05:00Z',
            type: 'interaction',
          },
        ],
        results: [
          {
            id: 'r1',
            sessionId: 'session-1',
            evaluatedAt: '2023-10-10T10:05:00Z',
          },
        ],
        evalTraceId: 'eval-t1',
        strategyUpdate: {
          id: 'su-1',
          sessionId: 'session-1',
          whatFailed: 'fail',
          whyItFailed: 'why',
          whatToDoNextTime: 'do',
          whatToAvoidNextTime: 'avoid',
          updatedAt: '2023-10-10T10:10:00Z',
        },
      };
      expect(Schemas.InterviewSession.safeParse(valid).success).toBe(true);
    });
  });

  describe('Schemas.TraceEvent', () => {
    it('validates correctly with optional fields', () => {
      const validMinimal = {
        id: 't1',
        sessionId: 's1',
        timestamp: '2023-10-10T09:00:00Z',
        type: 'log',
      };
      expect(Schemas.TraceEvent.safeParse(validMinimal).success).toBe(true);

      const validFull = {
        id: 't2',
        sessionId: 's2',
        timestamp: '2023-10-10T09:00:00Z',
        type: 'error',
        payload: { error: 'OOM' },
        traceId: 'tr-1',
      };
      expect(Schemas.TraceEvent.safeParse(validFull).success).toBe(true);
    });
  });
});
