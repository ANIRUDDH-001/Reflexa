import { z } from 'zod';
import { InterviewSession, Answer, EvaluationResult } from './schemas';

export const HealthResponse = z.object({ status: z.literal('ok'), ts: z.string() });

export const SessionConfig = z.object({
  role: z.string().nullable(),
  difficulty: z.string().nullable(),
  style: z.string().nullable(),
  timeLimit: z.string().nullable(),
  focusAreas: z.array(z.string()),
});

export const CreateSessionRequest = z.object({
  userId: z.string(),
  config: SessionConfig.optional(),
});
export const CreateSessionResponse = z.object({ session: InterviewSession });

export const GetSessionResponse = z.object({ session: InterviewSession });

export const TurnRequest = z.object({
  text: z.string(),
});
export const TurnResponse = z.object({
  text: z.string(),
  isThinking: z.boolean().optional(),
});

export const SubmitAnswerRequest = z.object({ sessionId: z.string(), answer: Answer });
export const SubmitAnswerResponse = z.object({ evaluation: EvaluationResult });

export const EndSessionRequest = z.object({});
export const EndSessionResponse = z.object({
  status: z.literal('completed'),
  analysisSummary: z.string().optional(),
});

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
