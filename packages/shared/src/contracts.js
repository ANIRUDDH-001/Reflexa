import { z } from 'zod';
import { InterviewSession, Answer, EvaluationResult } from './schemas';
// API contract shapes (first version)
export const HealthResponse = z.object({ status: z.literal('ok'), ts: z.string() });
export const CreateSessionRequest = z.object({ userId: z.string(), settings: z.any().optional() });
export const CreateSessionResponse = z.object({ session: InterviewSession });
export const GetSessionResponse = z.object({ session: InterviewSession });
export const SubmitAnswerRequest = z.object({ sessionId: z.string(), answer: Answer });
export const SubmitAnswerResponse = z.object({ evaluation: EvaluationResult });
export const APIContracts = {
  HealthResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  GetSessionResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
};
//# sourceMappingURL=contracts.js.map
