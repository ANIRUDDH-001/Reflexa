import { SemanticConventions } from '@arizeai/openinference-semantic-conventions';
import { GoogleGenAI, Type } from '@google/genai';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { getGoogleApiKey } from './llm';
import { BackendSessionState } from '../state/types';

const logger = pino();
const tracer = trace.getTracer('reflexa-study-plan');

export async function generateStudyPlan(session: BackendSessionState): Promise<string> {
  return tracer.startActiveSpan(
    'generateStudyPlan',
    {
      attributes: {
        [SemanticConventions.OPENINFERENCE_SPAN_KIND]: 'EVALUATOR',
        'session.id': session.id,
      },
    },
    async (span) => {
      try {
        const apiKey = getGoogleApiKey();
        const ai = new GoogleGenAI({ apiKey });

        const evaluation = session.evaluation;
        if (!evaluation) {
          throw new Error('Cannot generate study plan without a prior evaluation.');
        }

        const modelId = 'gemini-2.5-flash';
        const role = session.config.role || 'Software Engineer';
        const difficulty = session.config.difficulty || 'Mid-Level';

        const prompt = `You are an expert technical mentor creating a personalized Study Plan for a candidate.

Candidate Profile: ${difficulty} ${role}
Target Focus Areas: ${session.config.focusAreas.join(', ') || 'General'}

Here are the results from their recent mock interview evaluation:
- Overall AI Interviewer Score: ${evaluation.rubric?.overall}%
- Candidate Summary: ${evaluation.candidateSummary || 'Not provided'}
- The Introspection Agent determined the main failure pattern was: "${session.strategyUpdate?.whatFailed}"
  Root Cause: "${session.strategyUpdate?.whyItFailed}"

Your task:
Write a highly actionable, structured, and encouraging Markdown study plan for this candidate. Do NOT just summarize the interview. Provide concrete advice, specific topics to review, and suggested practice exercises.

Structure your response exactly as follows:

# 🎯 Personalized Study Plan
Brief encouraging opening sentence.

## 📉 Areas to Review
(List 2-3 specific topics they need to brush up on based on their weaknesses and failure patterns, explaining WHY it matters for a ${difficulty} ${role}.)

## 🛠 Actionable Practice Plan
(List 2-3 concrete coding tasks, architectural designs, or behavioral exercises they can do this week to improve.)

## 📚 Recommended Concepts
(List 3-5 specific technical concepts, APIs, or system design principles they should read about.)

Do not include any JSON wrapping, just raw Markdown text.`;

        const response = await ai.models.generateContent({
          model: modelId,
          contents: prompt,
          config: {
            temperature: 0.4,
          },
        });

        const text = response.text || '';
        span.setAttribute('studyPlan.length', text.length);
        span.end();
        return text;
      } catch (err) {
        span.recordException(err as Error);
        span.end();
        logger.error({ err, sessionId: session.id }, 'Failed to generate study plan');
        throw err;
      }
    },
  );
}
