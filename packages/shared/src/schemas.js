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
});
export const EvaluationResult = z.object({
  id: z.string(),
  sessionId: z.string(),
  questionId: z.string().optional(),
  score: z.number().min(0).max(100),
  summary: z.string().optional(),
  details: z.any().optional(),
  evaluatedAt: z.string(),
});
export const StrategyUpdate = z.object({
  id: z.string(),
  sessionId: z.string(),
  changes: z.record(z.any()),
  updatedAt: z.string(),
});
export const InterviewSession = z.object({
  id: z.string(),
  userId: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'abandoned']),
  questions: z.array(Question).optional(),
  trace: z.array(TraceEvent).optional(),
  results: z.array(EvaluationResult).optional(),
});
export const Schemas = {
  SystemPromptVersion,
  UserSettings,
  Question,
  Answer,
  TraceEvent,
  EvaluationResult,
  StrategyUpdate,
  InterviewSession,
};
//# sourceMappingURL=schemas.js.map
