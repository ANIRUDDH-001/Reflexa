import { GoogleGenAI, Type, Schema } from '@google/genai';
import { trace } from '@opentelemetry/api';
import { BackendSessionState } from '../state/types';
import { assemblePrompt } from './promptBuilder';
import 'dotenv/config';

const tracer = trace.getTracer('reflexa-agent');

const MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro',
  'gemini-2-flash',
];

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    agentMessage: {
      type: Type.STRING,
      description: 'The text response from the agent to the user.',
    },
    statusMetadata: {
      type: Type.STRING,
      description: "Internal status note (e.g., 'evaluating scalability')",
    },
    scoreHints: { type: Type.INTEGER, description: 'Estimated score for this turn out of 100' },
    nextActionIndicator: {
      type: Type.STRING,
      description: "The chosen next action: 'asked_question', 'probed', 'hinted', or 'summarized'",
    },
  },
  required: ['agentMessage', 'statusMetadata', 'nextActionIndicator'],
};

export interface ProcessTurnResult {
  agentMessage: string;
  statusMetadata: string;
  scoreHints: number;
  nextActionIndicator: string;
}

export async function processTurn(
  state: BackendSessionState,
  userMessage: string,
): Promise<ProcessTurnResult> {
  return tracer.startActiveSpan(
    'processTurn',
    {
      attributes: {
        'openinference.span.kind': 'AGENT',
        'session.id': state.id,
      },
    },
    async (agentSpan) => {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GOOGLE_API_KEY || '',
        });

        const systemInstruction = assemblePrompt(state);

        // Build history from trace
        const history = (state.trace || []).map((event) => ({
          role: event.type === 'user_message' ? 'user' : 'model',
          parts: [{ text: event.payload?.text || '' }],
        }));

        for (const model of MODELS) {
          try {
            return await tracer.startActiveSpan(
              'gemini_chat',
              {
                attributes: {
                  'openinference.span.kind': 'LLM',
                  'session.id': state.id,
                  'llm.model_name': model,
                  'llm.input_messages': JSON.stringify(history),
                },
              },
              async (llmSpan) => {
                try {
                  const chat = ai.chats.create({
                    model,
                    history,
                    config: {
                      systemInstruction,
                      temperature: 0.7,
                      responseMimeType: 'application/json',
                      responseSchema,
                    },
                  });

                  const response = await chat.sendMessage({ message: userMessage });
                  const rawText = response.text;

                  if (rawText) {
                    llmSpan.setAttribute(
                      'llm.output_messages',
                      JSON.stringify([{ role: 'model', content: rawText }]),
                    );
                  }

                  if (!rawText) throw new Error('Empty response from LLM');
                  return JSON.parse(rawText);
                } catch (err) {
                  llmSpan.recordException(err as Error);
                  throw err;
                } finally {
                  llmSpan.end();
                }
              },
            );
          } catch (e: unknown) {
            // Fallback silently
            if (e instanceof Error) {
              agentSpan.recordException(e);
            }
          }
        }

        throw new Error('All fallback models failed.');
      } catch (e) {
        agentSpan.recordException(e as Error);
        throw e;
      } finally {
        agentSpan.end();
      }
    },
  );
}

export interface EvaluationResultData {
  score?: number; // legacy
  rubric: {
    relevance: number;
    depth: number;
    clarity: number;
    adaptability: number;
    pacing: number;
    missedOpportunities: number;
    overall: number;
  };
  summary: string;
  weakTurns: Array<{
    turnLabel: string;
    summary: string;
    explanation: string;
    traceData: string;
    failurePatternLabel: string;
  }>;
  strategyOverrides: string[];
}

const evalSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    rubric: {
      type: Type.OBJECT,
      properties: {
        relevance: {
          type: Type.INTEGER,
          description: 'Score out of 100 for relevance of follow-up questions',
        },
        depth: { type: Type.INTEGER, description: 'Score out of 100 for depth of probing' },
        clarity: {
          type: Type.INTEGER,
          description: 'Score out of 100 for clarity of reasoning checks',
        },
        adaptability: {
          type: Type.INTEGER,
          description: 'Score out of 100 for adaptability to candidate responses',
        },
        pacing: { type: Type.INTEGER, description: 'Score out of 100 for interview pacing' },
        missedOpportunities: {
          type: Type.INTEGER,
          description: 'Score out of 100 (100 means no missed opportunities)',
        },
        overall: { type: Type.INTEGER, description: 'Overall score out of 100' },
      },
      required: [
        'relevance',
        'depth',
        'clarity',
        'adaptability',
        'pacing',
        'missedOpportunities',
        'overall',
      ],
    },
    summary: { type: Type.STRING, description: "Brief summary of the agent's performance" },
    weakTurns: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          turnLabel: { type: Type.STRING, description: "e.g., 'Turn 4'" },
          summary: { type: Type.STRING, description: "Short label like 'Missed Requirement'" },
          explanation: {
            type: Type.STRING,
            description: 'Detailed explanation of what went wrong and how to fix it',
          },
          traceData: {
            type: Type.STRING,
            description: 'HTML snippet containing the exact AI and User messages for this turn',
          },
          failurePatternLabel: {
            type: Type.STRING,
            description:
              "A categorical label for the failure (e.g. 'shallow_probing', 'ignored_context', 'poor_pacing')",
          },
        },
        required: ['turnLabel', 'summary', 'explanation', 'traceData', 'failurePatternLabel'],
      },
    },
    strategyOverrides: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['rubric', 'summary', 'weakTurns', 'strategyOverrides'],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateEvaluation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  traceData: Array<{ type: string; payload?: any }>,
  sessionId?: string,
): Promise<EvaluationResultData> {
  return tracer.startActiveSpan(
    'generateEvaluation',
    {
      attributes: {
        'openinference.span.kind': 'EVALUATOR',
        'session.id': sessionId || 'unknown',
      },
    },
    async (evalSpan) => {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GOOGLE_API_KEY || '',
        });

        const traceText = traceData
          .map((t) => `${t.type === 'ai_message' ? 'AI' : 'User'}: ${t.payload?.text || ''}`)
          .join('\n\n');

        const systemInstruction =
          "You are an expert engineering manager evaluating the AI Agent's performance as an interviewer in a completed session. Analyze the following interview trace and identify the weakest turns where the AI struggled, made assumptions, failed to probe deeply, or missed opportunities. Provide a comprehensive structured evaluation including a rubric breakdown and strategy overrides.";

        for (const model of MODELS) {
          try {
            return await tracer.startActiveSpan(
              'gemini_eval',
              {
                attributes: {
                  'openinference.span.kind': 'LLM',
                  'session.id': sessionId || 'unknown',
                  'llm.model_name': model,
                  'llm.input_messages': JSON.stringify([{ role: 'user', content: traceText }]),
                },
              },
              async (llmSpan) => {
                try {
                  const response = await ai.models.generateContent({
                    model,
                    contents: traceText,
                    config: {
                      systemInstruction,
                      temperature: 0.2,
                      responseMimeType: 'application/json',
                      responseSchema: evalSchema,
                    },
                  });

                  const rawText = response.text;
                  if (rawText) {
                    llmSpan.setAttribute(
                      'llm.output_messages',
                      JSON.stringify([{ role: 'model', content: rawText }]),
                    );
                  }

                  if (!rawText) throw new Error('Empty response from LLM');
                  return JSON.parse(rawText);
                } catch (err) {
                  llmSpan.recordException(err as Error);
                  throw err;
                } finally {
                  llmSpan.end();
                }
              },
            );
          } catch (e: unknown) {
            if (e instanceof Error) {
              evalSpan.recordException(e);
            }
          }
        }

        throw new Error('All fallback models failed.');
      } catch (e) {
        evalSpan.recordException(e as Error);
        throw e;
      } finally {
        evalSpan.end();
      }
    },
  );
}
