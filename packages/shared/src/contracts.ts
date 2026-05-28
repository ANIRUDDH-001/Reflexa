import { z } from 'zod';
import { InterviewSession, Answer, EvaluationResult } from './schemas';

export const HealthResponse = z.object({ status: z.literal('ok'), ts: z.string() }).strict();

export const SessionConfig = z
  .object({
    role: z.string().max(100).nullable(),
    difficulty: z.string().max(50).nullable(),
    style: z.string().max(50).nullable(),
    timeLimit: z.string().max(20).nullable(),
    focusAreas: z.array(z.string().max(100)).max(10),
  })
  .strict();
export type SessionConfig = z.infer<typeof SessionConfig>;

export const CreateSessionRequest = z
  .object({
    userId: z.string().max(100),
    config: SessionConfig.optional(),
  })
  .strict();
export const CreateSessionResponse = z.object({ session: InterviewSession }).strict();

export const GetSessionResponse = z.object({ session: InterviewSession }).strict();

export const TurnRequest = z
  .object({
    text: z.string().max(5000),
  })
  .strict();
export const TurnResponse = z
  .object({
    text: z.string(),
    isThinking: z.boolean().optional(),
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
  })
  .strict();

export const APIContracts = {
  HealthResponse,
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
