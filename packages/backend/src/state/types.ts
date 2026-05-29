import { InterviewSession } from '@reflexa/shared';
import { EvaluationResultData } from '../engine/llm';

export interface BackendSessionState extends InterviewSession {
  interviewPhase: 'intro' | 'exploration' | 'deep_dive' | 'closing';
  lastAgentAction: 'asked_question' | 'probed' | 'hinted' | 'summarized' | null;
  strategyVersion: string;
  config: {
    role: string | null;
    difficulty: string | null;
    style: string | null;
    timeLimit: string | null;
    focusAreas: string[];
  };
  turnCount: number;
  activeStrategyRules?: string[];
  evaluation?: EvaluationResultData;
  evalTraceId?: string;
}
