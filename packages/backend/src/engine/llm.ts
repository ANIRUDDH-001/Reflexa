import { SemanticConventions } from '@arizeai/openinference-semantic-conventions';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { trace } from '@opentelemetry/api';
import { logger } from '../index';
import { BackendSessionState } from '../state/types';
import { assemblePrompt } from './promptBuilder';
import 'dotenv/config';

const tracer = trace.getTracer('reflexa-agent');

const MODELS = [
  'gemini-2.5-flash', // GA — stable, fast primary
  'gemini-2.5-pro', // premium reasoning fallback
  'gemini-2.0-flash', // older stable fallback
  'gemini-2.0-flash-lite', // cost-efficient last resort
];

export function getGoogleApiKey(): string {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is required to run Gemini-backed interview features');
  }

  return apiKey;
}

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
  traceId: string;
}

export async function processTurn(
  state: BackendSessionState,
  userMessage: string,
): Promise<ProcessTurnResult> {
  return tracer.startActiveSpan(
    'processTurn',
    {
      attributes: {
        [SemanticConventions.OPENINFERENCE_SPAN_KIND]: 'AGENT',
        'session.id': state.id,
      },
    },
    async (agentSpan) => {
      try {
        const ai = new GoogleGenAI({ apiKey: getGoogleApiKey() });

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
                  [SemanticConventions.OPENINFERENCE_SPAN_KIND]: 'LLM',
                  'session.id': state.id,
                  [SemanticConventions.LLM_MODEL_NAME]: model,
                },
              },
              async (llmSpan) => {
                try {
                  if (Array.isArray(history)) {
                    history.forEach((msg, idx) => {
                      llmSpan.setAttribute(
                        `${SemanticConventions.LLM_INPUT_MESSAGES}.${idx}.message.role`,
                        msg.role ?? 'user',
                      );
                      llmSpan.setAttribute(
                        `${SemanticConventions.LLM_INPUT_MESSAGES}.${idx}.message.content`,
                        JSON.stringify(msg.parts || msg),
                      );
                    });
                  }

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
                      `${SemanticConventions.LLM_OUTPUT_MESSAGES}.0.message.role`,
                      'model',
                    );
                    llmSpan.setAttribute(
                      `${SemanticConventions.LLM_OUTPUT_MESSAGES}.0.message.content`,
                      rawText,
                    );
                  }

                  if (!rawText) throw new Error('Empty response from LLM');
                  const capturedTraceId = agentSpan.spanContext().traceId;
                  return { ...JSON.parse(rawText), traceId: capturedTraceId };
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

export type TurnStreamChunk =
  | { type: 'token'; text: string }
  | { type: 'done'; fullText: string; traceId: string; phase: string }
  | { type: 'error'; message: string };

/**
 * Streaming variant of processTurn.
 * Yields token chunks as they arrive from Gemini via sendMessageStream.
 * Falls back through MODELS on quota / rate-limit errors (429).
 * The caller is responsible for persisting the session after the stream ends.
 */
export async function* processTurnStream(
  state: BackendSessionState,
  userMessage: string,
  clientSignal?: AbortSignal,
): AsyncGenerator<TurnStreamChunk> {
  const ai = new GoogleGenAI({ apiKey: getGoogleApiKey() });
  const systemInstruction = assemblePrompt(state);

  const history = (state.trace || []).map((event) => ({
    role: event.type === 'user_message' ? ('user' as const) : ('model' as const),
    parts: [{ text: event.payload?.text || '' }],
  }));

  for (const modelId of MODELS) {
    try {
      const chat = ai.chats.create({
        model: modelId,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema,
        },
        history,
      });

      // Capture traceId from the active span BEFORE streaming starts
      const activeSpan = trace.getActiveSpan();
      const traceId = activeSpan?.spanContext().traceId ?? 'unknown';

      // Add a 15-second timeout per model attempt
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const stream = await chat.sendMessageStream({ message: userMessage });

        let fullText = '';
        let streamedMessageLength = 0;

        for await (const chunk of stream) {
          if (clientSignal?.aborted) {
            logger.info(
              { sessionId: state.id },
              '[stream] Client disconnected, aborting generation loop',
            );
            throw new Error('Client disconnected');
          }
          if (controller.signal.aborted) throw new Error('Model timeout after 15s');
          const token = chunk.text ?? '';
          if (token) {
            fullText += token;

            const match = fullText.match(/"agentMessage"\s*:\s*"((?:[^"\\]|\\.)*)/);
            if (match) {
              const extractedText = match[1];
              if (extractedText.length > streamedMessageLength) {
                const newToken = extractedText.substring(streamedMessageLength);
                const unescapedToken = newToken
                  .replace(/\\n/g, '\n')
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, '\\');
                yield { type: 'token', text: unescapedToken };
                streamedMessageLength = extractedText.length;
              }
            }
          }
        }

        // Extract clean agentMessage to verify it exists
        let extractedMessage = '';
        try {
          const parsed = JSON.parse(fullText);
          extractedMessage = parsed.agentMessage ?? '';
        } catch {
          // JSON.parse failed — try regex as last resort
          const match = fullText.match(/"agentMessage"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          extractedMessage = match ? match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
          logger.warn(
            { sessionId: state.id },
            '[stream] Could not parse structured response — using regex fallback',
          );
        }

        if (!extractedMessage) {
          logger.error(
            { sessionId: state.id, fullText: fullText.slice(0, 200) },
            '[stream] Empty agentMessage after extraction',
          );
          yield { type: 'error', message: 'AI returned an empty response. Please try again.' };
          return;
        }

        yield { type: 'done', fullText, traceId, phase: state.interviewPhase };
        return; // Success — stop trying fallback models
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Fallback silently for any error (e.g. 503, 429, quota, 500, timeout)
      console.warn(`[LLM Fallback] Model ${modelId} failed: ${message}`);
      continue;
    }
  }

  yield {
    type: 'error',
    message: 'All fallback models exhausted or unavailable — no response generated.',
  };
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
): Promise<EvaluationResultData & { traceId: string }> {
  return tracer.startActiveSpan(
    'generateEvaluation',
    {
      attributes: {
        [SemanticConventions.OPENINFERENCE_SPAN_KIND]: 'EVALUATOR',
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

        const userMessageCount = traceData.filter((t) => t.type === 'user_message').length;
        const penaltyClause =
          userMessageCount < 2
            ? `\n\nCRITICAL INSTRUCTION: This trace is extremely short (only ${userMessageCount} user reply). The candidate abandoned the interview early or just said "hi". You MUST assign a 0 to all rubric scores, state explicitly in the summary that the interview was abandoned, and provide strategy overrides to engage the user faster.`
            : '';

        const systemInstruction =
          "You are an expert engineering manager evaluating the AI Agent's performance as an interviewer in a completed session. Analyze the following interview trace and identify the weakest turns where the AI struggled, made assumptions, failed to probe deeply, or missed opportunities. Provide a comprehensive structured evaluation including a rubric breakdown and strategy overrides." +
          penaltyClause;

        for (const model of MODELS) {
          try {
            return await tracer.startActiveSpan(
              'gemini_eval',
              {
                attributes: {
                  [SemanticConventions.OPENINFERENCE_SPAN_KIND]: 'LLM',
                  'session.id': sessionId || 'unknown',
                  [SemanticConventions.LLM_MODEL_NAME]: model,
                },
              },
              async (llmSpan) => {
                try {
                  llmSpan.setAttribute(
                    `${SemanticConventions.LLM_INPUT_MESSAGES}.0.message.role`,
                    'user',
                  );
                  llmSpan.setAttribute(
                    `${SemanticConventions.LLM_INPUT_MESSAGES}.0.message.content`,
                    traceText,
                  );

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
                      `${SemanticConventions.LLM_OUTPUT_MESSAGES}.0.message.role`,
                      'model',
                    );
                    llmSpan.setAttribute(
                      `${SemanticConventions.LLM_OUTPUT_MESSAGES}.0.message.content`,
                      rawText,
                    );
                  }

                  if (!rawText) throw new Error('Empty response from LLM');

                  const result = JSON.parse(rawText);
                  const traceId = evalSpan.spanContext().traceId;

                  evalSpan.setAttributes({
                    'evaluation.overall_score': result.rubric?.overall ?? 0,
                  });

                  return { ...result, traceId };
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
