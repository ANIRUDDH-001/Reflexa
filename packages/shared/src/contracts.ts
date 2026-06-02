import { z } from 'zod';
import { InterviewSession, Answer, EvaluationResult } from './schemas';

export const HealthResponse = z.object({ status: z.literal('ok'), ts: z.string() }).strict();

export const SessionConfig = z
  .object({
    role: z.string().max(100).nullish(),
    difficulty: z.string().max(50).nullish(),
    style: z.string().max(50).nullish(),
    timeLimit: z.string().max(20).nullish(),
    focusAreas: z.array(z.string().max(100)).max(10).optional(),
  })
  .strict();
export type SessionConfig = z.infer<typeof SessionConfig>;

export const CreateSessionRequest = z
  .object({
    userId: z.string().max(100).optional(),
    config: SessionConfig.optional(),
  })
  .strict();
export const CreateSessionResponse = z.object({ session: InterviewSession }).strict();

export const GetSessionResponse = z
  .object({ session: InterviewSession, phoenixTraceUrl: z.string().nullable().optional() })
  .strict();

export const TurnRequest = z
  .object({
    text: z.string().max(5000),
  })
  .strict();
export const TurnResponse = z
  .object({
    text: z.string(),
    isThinking: z.boolean().optional(),
    traceId: z.string().optional(),
  })
  .strict();

export const SubmitAnswerRequest = z
  .object({ sessionId: z.string().max(100), answer: Answer })
  .strict();
export const SubmitAnswerResponse = z.object({ evaluation: EvaluationResult }).strict();

export const EndSessionRequest = z.object({}).strict();
export const EndSessionResponse = z
  .object({
    status: z.literal('completed'),
    analysisSummary: z.string().optional(),
    strategySummary: z.string().optional(),
    traceId: z.string().optional(),
  })
  .strict();

// SSE streaming event types — shared between backend emitter and frontend consumer
export type TurnStreamEvent =
  | { type: 'token'; text: string }
  | { type: 'done'; traceId: string; phase: string; turnCount: number }
  | { type: 'error'; message: string };

export const APIContracts = {
  HealthResponse,
  SessionConfig,
  CreateSessionRequest,
  CreateSessionResponse,
  GetSessionResponse,
  TurnRequest,
  TurnResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  EndSessionRequest,
  EndSessionResponse,
};
