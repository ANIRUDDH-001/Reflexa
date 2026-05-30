import { z } from 'zod';

// Fundamental building blocks used across frontend and backend

export const SystemPromptVersion = z.object({
  version: z.string().regex(/^v\d+\.\d+\.\d+$/),
  notes: z.string().optional(),
});

export const UserSettings = z.object({
  userId: z.string(),
  preferredDifficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  notifyOnReview: z.boolean().default(true),
});

export const Question = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

export const Answer = z.object({
  id: z.string(),
  questionId: z.string(),
  authorId: z.string(),
  code: z.string().optional(),
  text: z.string().optional(),
  submittedAt: z.string(),
});

export const TraceEvent = z.object({
  id: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
  type: z.string(),
  payload: z.record(z.any()).optional(),
  traceId: z.string().optional(),
});

export const EvaluationRubric = z.object({
  relevance: z.number().min(0).max(100),
  depth: z.number().min(0).max(100),
  clarity: z.number().min(0).max(100),
  adaptability: z.number().min(0).max(100),
  pacing: z.number().min(0).max(100),
  missedOpportunities: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
});

export const WeakTurn = z.object({
  turnLabel: z.string(),
  summary: z.string(),
  explanation: z.string(),
  traceData: z.string(),
  failurePatternLabel: z.string(),
});

export const EvaluationResult = z.object({
  id: z.string(),
  sessionId: z.string(),
  questionId: z.string().optional(),
  score: z.number().min(0).max(100).optional(), // keeping for backwards compatibility initially
  rubric: EvaluationRubric.optional(),
  summary: z.string().optional(),
  weakTurns: z.array(WeakTurn).optional(),
  strategyOverrides: z.array(z.string()).optional(),
  details: z.any().optional(),
  evaluatedAt: z.string(),
});

export const StrategyUpdate = z.object({
  id: z.string(),
  sessionId: z.string(),
  whatFailed: z.string(),
  whyItFailed: z.string(),
  whatToDoNextTime: z.string(),
  whatToAvoidNextTime: z.string(),
  changes: z.record(z.any()).optional(),
  updatedAt: z.string(),
});

export const SessionComparison = z.object({
  baselineSessionId: z.string(),
  currentSessionId: z.string(),
  delta: z.record(z.number()), // e.g. { overall: +5, pacing: -2 }
  behaviorChanges: z.string(),
});

export const InterviewSession = z
  .object({
    id: z.string(),
    userId: z.string(),
    startedAt: z.string(),
    endedAt: z.string().nullable().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'abandoned']),
    questions: z.array(Question).optional(),
    trace: z.array(TraceEvent).optional(),
    results: z.array(EvaluationResult).optional(),
    evalTraceId: z.string().optional(),
    strategyUpdate: StrategyUpdate.optional(),
  })
  .passthrough();

// Type aliases
export type SystemPromptVersion = z.infer<typeof SystemPromptVersion>;
export type UserSettings = z.infer<typeof UserSettings>;
export type Question = z.infer<typeof Question>;
export type Answer = z.infer<typeof Answer>;
export type TraceEvent = z.infer<typeof TraceEvent>;
export type EvaluationRubric = z.infer<typeof EvaluationRubric>;
export type WeakTurn = z.infer<typeof WeakTurn>;
export type EvaluationResult = z.infer<typeof EvaluationResult>;
export type StrategyUpdate = z.infer<typeof StrategyUpdate>;
export type SessionComparison = z.infer<typeof SessionComparison>;
export type InterviewSession = z.infer<typeof InterviewSession>;

export const Schemas = {
  SystemPromptVersion,
  UserSettings,
  Question,
  Answer,
  TraceEvent,
  EvaluationRubric,
  WeakTurn,
  EvaluationResult,
  StrategyUpdate,
  SessionComparison,
  InterviewSession,
};
