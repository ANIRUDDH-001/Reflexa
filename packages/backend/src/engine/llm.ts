import { SemanticConventions } from '@arizeai/openinference-semantic-conventions';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { trace, context } from '@opentelemetry/api';
import { logger } from '../index';
import { BackendSessionState } from '../state/types';
import { assemblePrompt } from './promptBuilder';
import 'dotenv/config';

const tracer = trace.getTracer('reflexa-agent');

export const MODELS = [
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
    candidateAssessment: {
      type: Type.OBJECT,
      description:
        "Your structured assessment of the candidate's LAST answer. " +
        'Used for adaptive questioning and self-improvement.',
      properties: {
        depthSignal: {
          type: Type.STRING,
          enum: ['shallow', 'adequate', 'deep'],
          description:
            '"shallow": surface-level, vague, or missing key concepts. ' +
            '"adequate": correct and covers basics. ' +
            '"deep": demonstrates strong understanding with unprompted nuance.',
        },
        topicCoverage: {
          type: Type.INTEGER,
          description: '0-100. What % of the expected answer space did the candidate cover?',
        },
        shouldTransition: {
          type: Type.BOOLEAN,
          description:
            'true if this topic is sufficiently covered and you should move to a new area. ' +
            'false if you should probe deeper on the current topic.',
        },
        observedWeakness: {
          type: Type.STRING,
          description:
            'One-sentence description of the primary gap or weakness in the answer, ' +
            'or empty string if the answer was strong.',
        },
      },
      required: ['depthSignal', 'topicCoverage', 'shouldTransition', 'observedWeakness'],
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
  required: [
    'agentMessage',
    'candidateAssessment',
    'statusMetadata',
    'nextActionIndicator',
    'scoreHints',
  ],
};

export interface CandidateAssessment {
  depthSignal: 'shallow' | 'adequate' | 'deep';
  topicCoverage: number; // 0-100
  shouldTransition: boolean;
  observedWeakness: string;
}

export interface ProcessTurnResult {
  agentMessage: string;
  statusMetadata: string;
  scoreHints: number;
  nextActionIndicator: string;
  candidateAssessment: CandidateAssessment;
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
                  const parsed = JSON.parse(rawText);
                  // Defensive validation — ensure all fields exist with correct types
                  const result: ProcessTurnResult = {
                    agentMessage: parsed.agentMessage || '',
                    candidateAssessment: parsed.candidateAssessment || {
                      depthSignal: 'shallow',
                      topicCoverage: 0,
                      shouldTransition: false,
                      observedWeakness: '',
                    },
                    statusMetadata: parsed.statusMetadata || 'in_progress',
                    scoreHints: typeof parsed.scoreHints === 'number' ? parsed.scoreHints : 50,
                    nextActionIndicator: parsed.nextActionIndicator || 'asked_question',
                    traceId: capturedTraceId,
                  };
                  return result;
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

  const agentSpan = tracer.startSpan('processTurnStream', {
    attributes: {
      [SemanticConventions.OPENINFERENCE_SPAN_KIND]: 'AGENT',
      'session.id': state.id,
    },
  });

  const agentContext = trace.setSpan(context.active(), agentSpan);

  try {
    yield* context.with(agentContext, async function* (): AsyncGenerator<TurnStreamChunk> {
      for (const modelId of MODELS) {
        const llmSpan = tracer.startSpan('gemini_chat_stream', {
          attributes: {
            [SemanticConventions.OPENINFERENCE_SPAN_KIND]: 'LLM',
            'session.id': state.id,
            [SemanticConventions.LLM_MODEL_NAME]: modelId,
          },
        });

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
            model: modelId,
            config: {
              systemInstruction,
              temperature: 0.7,
              responseMimeType: 'application/json',
              responseSchema,
            },
            history,
          });

          const traceId = agentSpan.spanContext().traceId;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000);

          try {
            const stream = await chat.sendMessageStream({
              message: userMessage,
              config: { abortSignal: controller.signal },
            });

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
              if (controller.signal.aborted) throw new Error('Model timeout after 30s');
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

            let extractedMessage = '';
            try {
              const parsed = JSON.parse(fullText);
              extractedMessage = parsed.agentMessage ?? '';
            } catch {
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
              llmSpan.end();
              return;
            }

            llmSpan.setAttribute(
              `${SemanticConventions.LLM_OUTPUT_MESSAGES}.0.message.role`,
              'model',
            );
            llmSpan.setAttribute(
              `${SemanticConventions.LLM_OUTPUT_MESSAGES}.0.message.content`,
              fullText,
            );

            yield { type: 'done', fullText, traceId, phase: state.interviewPhase };
            llmSpan.end();
            return;
          } finally {
            clearTimeout(timeout);
          }
        } catch (err) {
          llmSpan.recordException(err as Error);
          llmSpan.end();
          const message = err instanceof Error ? err.message : String(err);
          logger.warn(`[LLM Fallback] Model ${modelId} failed: ${message}`);
          continue;
        }
      }

      throw new Error('All fallback models failed.');
    });
  } catch (e) {
    agentSpan.recordException(e as Error);
    throw e;
  } finally {
    agentSpan.end();
  }
}

export interface EvaluationResultData {
  score?: number; // legacy
  rubric: {
    relevance: number;
    depth: number;
    clarity: number;
    adaptability: number;
    pacing: number;
    opportunityCoverage: number;
    overall: number;
  };
  candidateRubric: {
    technicalAccuracy: number;
    communicationClarity: number;
    problemSolving: number;
    depthOfKnowledge: number;
    overall: number;
  };
  summary: string;
  candidateSummary: string;
  weakTurns: Array<{
    turnLabel: string;
    summary: string;
    explanation: string;
    traceData: string;
    failurePatternLabel: string;
  }>;
  strategyOverrides: string[];
  studyPlan?: {
    contentMarkdown: string;
    generatedAt: string;
  };
}

const FAILURE_PATTERN_VALUES = [
  'shallow_probing',
  'ignored_context',
  'poor_pacing',
  'missed_followup',
  'leading_question',
  'off_topic',
  'candidate_shallow_answer',
  'candidate_incorrect',
  'candidate_no_structure',
  'candidate_communication_gap',
  'other',
] as const;

export const evalSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    rubric: {
      type: Type.OBJECT,
      description:
        'Interviewer performance rubric — how well did the AI interviewer conduct the session.',
      properties: {
        relevance: {
          type: Type.INTEGER,
          description:
            'Score out of 100 for relevance of follow-up questions to the target role and domain',
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
        opportunityCoverage: {
          type: Type.INTEGER,
          description:
            'Score out of 100. How many significant follow-up opportunities did the interviewer ' +
            'identify and pursue? 100 = captured all key opportunities; 0 = missed most opportunities.',
        },
        overall: { type: Type.INTEGER, description: 'Overall interviewer score out of 100' },
      },
      required: [
        'relevance',
        'depth',
        'clarity',
        'adaptability',
        'pacing',
        'opportunityCoverage',
        'overall',
      ],
    },
    candidateRubric: {
      type: Type.OBJECT,
      description: 'Candidate performance rubric — how well did the interviewee perform.',
      properties: {
        technicalAccuracy: {
          type: Type.INTEGER,
          description:
            'Score out of 100. Did the candidate give technically correct answers? ' +
            'Account for the target difficulty level.',
        },
        communicationClarity: {
          type: Type.INTEGER,
          description:
            'Score out of 100. Did the candidate communicate their reasoning clearly ' +
            'and structure their answers logically?',
        },
        problemSolving: {
          type: Type.INTEGER,
          description:
            'Score out of 100. Did the candidate show strong problem-solving approach? ' +
            'Breaking down problems, considering edge cases, evaluating trade-offs.',
        },
        depthOfKnowledge: {
          type: Type.INTEGER,
          description:
            'Score out of 100. Did the candidate demonstrate deep domain knowledge ' +
            'or only surface-level understanding?',
        },
        overall: {
          type: Type.INTEGER,
          description:
            'Overall candidate score out of 100. Should be influenced by the algorithmic ' +
            'baseline provided in the prompt (if available).',
        },
      },
      required: [
        'technicalAccuracy',
        'communicationClarity',
        'problemSolving',
        'depthOfKnowledge',
        'overall',
      ],
    },
    summary: {
      type: Type.STRING,
      description: "Brief summary of the AI interviewer's performance",
    },
    candidateSummary: {
      type: Type.STRING,
      description:
        "Brief summary of the candidate's performance, strengths, and areas for improvement. " +
        'Written as constructive feedback the candidate would benefit from reading.',
    },
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
            description: 'Deprecated — leave empty. Trace data is rendered from session history.',
          },
          failurePatternLabel: {
            type: Type.STRING,
            enum: [...FAILURE_PATTERN_VALUES],
            description:
              'A categorical label from the failure taxonomy. ' +
              'interviewer-side: shallow_probing, ignored_context, poor_pacing, missed_followup, leading_question, off_topic. ' +
              'candidate-side: candidate_shallow_answer, candidate_incorrect, candidate_no_structure, candidate_communication_gap. ' +
              'or: other.',
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
  required: [
    'rubric',
    'candidateRubric',
    'summary',
    'candidateSummary',
    'weakTurns',
    'strategyOverrides',
  ],
};

/**
 * Compute an algorithmic baseline score from per-turn candidateAssessment data.
 * Returns { avgCoverage, depthBreakdown, totalTurns } or null if no assessments found.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeAlgorithmicBaseline(traceData: Array<{ type: string; payload?: any }>) {
  const aiMessages = traceData.filter((t) => t.type === 'ai_message');
  const assessments = aiMessages
    .filter((t) => t.payload?.assessment)
    .map((t) => t.payload.assessment as CandidateAssessment);

  const missingCount = aiMessages.length - assessments.length;
  if (missingCount > 0) {
    logger.warn(
      { missingCount },
      '[llm] Missing assessments in AI messages — degrading baseline accuracy',
    );
  }

  if (assessments.length === 0) return null;

  const avgCoverage = Math.round(
    assessments.reduce((sum, a) => sum + (a.topicCoverage ?? 0), 0) / assessments.length,
  );

  const depthCounts = { shallow: 0, adequate: 0, deep: 0 };
  assessments.forEach((a) => {
    const signal = a.depthSignal ?? 'adequate';
    if (signal in depthCounts) depthCounts[signal as keyof typeof depthCounts]++;
  });

  const weaknesses = assessments
    .map((a) => a.observedWeakness)
    .filter((w) => w && w.trim().length > 0);

  return {
    avgCoverage,
    depthBreakdown: depthCounts,
    totalTurns: assessments.length,
    topWeaknesses: weaknesses.slice(0, 5),
  };
}

/** Session configuration passed to the evaluator for domain-aware scoring. */
export interface EvalSessionConfig {
  role?: string | null;
  difficulty?: string | null;
  style?: string | null;
  focusAreas?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateEvaluation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  traceData: Array<{ type: string; payload?: any }>,
  sessionId?: string,
  config?: EvalSessionConfig,
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
        const userMessageCount = traceData.filter((t) => t.type === 'user_message').length;

        // ── EARLY RETURN: insufficient data ───────────────────────────────
        // Do NOT call the LLM for sessions with < 2 user messages.
        // The LLM cannot produce meaningful evaluation data from a single greeting
        // and will generate misleading non-zero scores regardless of instructions.
        if (userMessageCount < 2) {
          const traceId = evalSpan.spanContext().traceId;
          evalSpan.setAttributes({ 'evaluation.overall_score': 0, 'evaluation.abandoned': true });

          return {
            rubric: {
              relevance: 0,
              depth: 0,
              clarity: 0,
              adaptability: 0,
              pacing: 0,
              opportunityCoverage: 0,
              overall: 0,
            },
            candidateRubric: {
              technicalAccuracy: 0,
              communicationClarity: 0,
              problemSolving: 0,
              depthOfKnowledge: 0,
              overall: 0,
            },
            summary:
              `Session abandoned after ${userMessageCount} user message(s). ` +
              `Insufficient data to evaluate interview quality. ` +
              `Consider adjusting the opening question to better engage the candidate faster.`,
            candidateSummary:
              `The candidate sent only ${userMessageCount} message(s). ` +
              `No meaningful candidate assessment is possible from this session.`,
            weakTurns: [
              {
                turnLabel: 'Full session',
                summary: 'Session abandoned before evaluation data could be collected',
                explanation:
                  `The candidate sent only ${userMessageCount} message(s) before the session ended. ` +
                  `No meaningful assessment of depth, clarity, or adaptability is possible.`,
                traceData: '',
                failurePatternLabel: 'other',
              },
            ],
            strategyOverrides: [
              'Open with a concrete, compelling scenario immediately to engage the candidate faster.',
              'Ask a question that has a clear right/wrong direction so the candidate feels invested.',
            ],
            traceId,
          };
        }
        // ── END EARLY RETURN ──────────────────────────────────────────────

        const ai = new GoogleGenAI({
          apiKey: getGoogleApiKey(),
        });

        const traceText = traceData
          .map((t) => `${t.type === 'ai_message' ? 'AI' : 'User'}: ${t.payload?.text || ''}`)
          .join('\n\n');

        // Build domain context for the evaluator
        const role = config?.role || 'Software Engineer';
        const difficulty = config?.difficulty || 'Medium';
        const style = config?.style || 'Technical Interview';
        const focusAreas = config?.focusAreas?.join(', ') || 'general engineering practices';

        // Compute algorithmic baseline from per-turn assessments
        const baseline = computeAlgorithmicBaseline(traceData);
        let baselineBlock = '';
        if (baseline) {
          baselineBlock =
            `\n## Algorithmic Baseline (from per-turn assessment data)\n` +
            `The system tracked the candidate's performance across ${baseline.totalTurns} assessed turns:\n` +
            `- Average topic coverage: ${baseline.avgCoverage}%\n` +
            `- Depth distribution: shallow=${baseline.depthBreakdown.shallow}, adequate=${baseline.depthBreakdown.adequate}, deep=${baseline.depthBreakdown.deep}\n` +
            (baseline.topWeaknesses.length > 0
              ? `- Observed weaknesses: ${baseline.topWeaknesses.join('; ')}\n`
              : '') +
            `\nUse this algorithmic baseline to ANCHOR your candidateRubric.overall score. ` +
            `The algorithmic average coverage was ${baseline.avgCoverage}% — your overall candidate score ` +
            `should be within ±15 points of this baseline unless you have strong qualitative reasons to deviate. ` +
            `If you deviate significantly, explain why in candidateSummary.\n`;
        }

        const systemInstruction =
          `You are an expert engineering manager evaluating a completed interview session.\n\n` +
          `## Session Context\n` +
          `- Role: ${role}\n` +
          `- Difficulty: ${difficulty}\n` +
          `- Style: ${style}\n` +
          `- Focus Areas: ${focusAreas}\n\n` +
          `## Your Task\n` +
          `Evaluate BOTH the AI Interviewer's performance AND the Candidate's performance.\n\n` +
          `### Interviewer Rubric (rubric field)\n` +
          `Score the AI interviewer on: relevance (were follow-ups relevant to ${role} at ${difficulty} level?), ` +
          `depth (did it probe deep enough for the difficulty?), clarity, adaptability, pacing, and opportunityCoverage.\n\n` +
          `### Candidate Rubric (candidateRubric field)\n` +
          `Score the candidate on: technicalAccuracy (correctness for a ${role} at ${difficulty} level), ` +
          `communicationClarity (structured thinking, clear explanations), ` +
          `problemSolving (approach, edge cases, trade-offs), ` +
          `depthOfKnowledge (surface-level vs deep domain expertise).\n` +
          baselineBlock +
          `\n### Weak Turns\n` +
          `Identify turns where EITHER the interviewer or candidate had issues. ` +
          `Use the failurePatternLabel taxonomy:\n` +
          `- Interviewer failures: shallow_probing, ignored_context, poor_pacing, missed_followup, leading_question, off_topic\n` +
          `- Candidate failures: candidate_shallow_answer, candidate_incorrect, candidate_no_structure, candidate_communication_gap\n` +
          `- Use 'other' only if nothing else fits.\n` +
          `\nFor opportunityCoverage: score 100 if the interviewer captured and pursued all significant follow-up threads. ` +
          `Score 0 if they let many opportunities pass.`;

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

                  const parsed = JSON.parse(rawText);
                  const traceId = evalSpan.spanContext().traceId;

                  // Defensive validation — ensure all required evaluation fields exist
                  const zeroRubric = {
                    overall: 0,
                    relevance: 0,
                    depth: 0,
                    clarity: 0,
                    adaptability: 0,
                    pacing: 0,
                    opportunityCoverage: 0,
                  };
                  const zeroCandRubric = {
                    overall: 0,
                    technicalAccuracy: 0,
                    communicationClarity: 0,
                    problemSolving: 0,
                    depthOfKnowledge: 0,
                  };
                  const result = {
                    rubric: parsed.rubric ? { ...zeroRubric, ...parsed.rubric } : zeroRubric,
                    candidateRubric: parsed.candidateRubric
                      ? { ...zeroCandRubric, ...parsed.candidateRubric }
                      : zeroCandRubric,
                    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
                    candidateSummary:
                      typeof parsed.candidateSummary === 'string' ? parsed.candidateSummary : '',
                    weakTurns: Array.isArray(parsed.weakTurns) ? parsed.weakTurns : [],
                    strategyOverrides: Array.isArray(parsed.strategyOverrides)
                      ? parsed.strategyOverrides
                      : [],
                  };

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
