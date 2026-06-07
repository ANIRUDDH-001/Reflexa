import { SemanticConventions } from '@arizeai/openinference-semantic-conventions';
import { GoogleGenAI } from '@google/genai';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { getGoogleApiKey, ANALYSIS_MODELS } from './llm';
import { getMcpToolsAsGemini, callMcpTool } from './mcp';

const logger = pino();
const tracer = trace.getTracer('reflexa-introspection');

export interface StrategyUpdateResult {
  whatFailed: string;
  whyItFailed: string;
  whatToDoNextTime: string;
  whatToAvoidNextTime: string;
  newRules: string[];
}

const ARIZE_PROJECT = process.env.ARIZE_PROJECT_NAME || 'default';

export async function runIntrospection(
  sessionId: string,
  evalScore: number,
): Promise<StrategyUpdateResult> {
  return tracer.startActiveSpan(
    'runIntrospection',
    {
      attributes: {
        [SemanticConventions.OPENINFERENCE_SPAN_KIND]: 'AGENT',
        'session.id': sessionId,
      },
    },
    async (span) => {
      try {
        const ai = new GoogleGenAI({ apiKey: getGoogleApiKey() });

        let tools;
        try {
          tools = await getMcpToolsAsGemini();
        } catch (e) {
          logger.warn({ err: e }, 'Introspection MCP tools not available, using fallback.');
          return {
            whatFailed: 'MCP unavailable. Retaining baseline strategy.',
            whyItFailed: 'N/A',
            whatToDoNextTime: 'Continue evaluating normally.',
            whatToAvoidNextTime: 'N/A',
            newRules: ['Continue evaluating normally.'],
          };
        }

        const systemInstruction = `
You are a quality assurance agent evaluating the performance of an AI technical interviewer.

Your job:
1. Use the available Arize MCP tools to retrieve traces for session: ${sessionId} (scored ${evalScore}/100)
2. Analyse the interviewer's behaviour across all turns
3. Identify specific failure patterns (e.g. "failed to probe shallow answers", "inconsistent topic focus")
4. Generate concrete improvement rules for the next session

Your output MUST include:
- whatFailed: a specific description of the most critical failure pattern (or "No significant issues" if none)
- whyItFailed: the root cause of the failure
- whatToDoNextTime: one concrete, actionable rule the interviewer should follow
- whatToAvoidNextTime: one concrete behaviour to avoid
- newRules: an array of 2-5 short, specific strategy rules (strings) for the next session

Example newRules:
- "If the candidate gives a shallow answer, ask 'Can you be more specific about X?' before moving on"
- "Do not introduce a new topic until the current topic has reached depth score >=60"
- "For behavioral interviews, always ask for a specific past example — reject hypothetical answers"
`;

        let result: StrategyUpdateResult | null = null;
        let lastError: Error | null = null;

        for (const modelId of ANALYSIS_MODELS) {
          try {
            const chat = ai.chats.create({
              model: modelId,
              config: {
                systemInstruction,
                tools: [{ functionDeclarations: tools }],
                temperature: 0.3,
              },
            });

            // ── Task 5: include Arize project name explicitly ───────────────
            const introspectionContext =
              `Arize project name: "${ARIZE_PROJECT}"\n` +
              `Session ID to introspect: "${sessionId}"\n` +
              `Session evaluation overall score: ${evalScore ?? 'unknown'}\n\n` +
              `Use the Arize MCP tools to retrieve the traces and evaluation scores for this session, ` +
              `then identify the weakest turns and generate a StrategyUpdate to improve future sessions. ` +
              `Start by calling get_traces with project_name="${ARIZE_PROJECT}" and filter by the session ID above.`;

            logger.info(`Starting introspection loop for session ${sessionId}...`);

            // ── Task 3: accumulate findings, never lose context ───────────────
            const findings: string[] = [];
            let response = await chat.sendMessage({ message: introspectionContext });

            for (let i = 0; i < 8; i++) {
              // Capture any prose the model emitted this turn
              if (response.text) {
                findings.push(response.text);
              }

              const calls = response.functionCalls;
              if (!calls || calls.length === 0) {
                // Model has finished reasoning — no more tool calls
                break;
              }

              // Execute each tool call and accumulate results
              const functionResponses = [];
              for (const call of calls) {
                try {
                  logger.info(`Introspection agent calling tool ${call.name}`);
                  const resultText = await callMcpTool(
                    call.name as string,
                    (call.args || {}) as Record<string, unknown>,
                  );
                  findings.push(`[Tool: ${call.name}]\n${resultText}`);
                  functionResponses.push({
                    functionResponse: {
                      id: call.id as string, // Required for Gemini 3.x
                      name: call.name as string,
                      response: { result: resultText },
                    },
                  });
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : String(err);
                  logger.error({ err }, `Tool ${call.name} failed`);
                  findings.push(`[Tool: ${call.name} ERROR]\n${errorMessage}`);
                  functionResponses.push({
                    functionResponse: {
                      id: call.id as string, // Required for Gemini 3.x
                      name: call.name as string,
                      response: { error: errorMessage },
                    },
                  });
                }
              }

              response = await chat.sendMessage({ message: functionResponses });
            }

            // Capture any final prose after the last tool result
            if (response.text) {
              findings.push(response.text);
            }

            // ── Synthesise findings into a structured StrategyUpdate ──────────
            // Use a FRESH chat with the full accumulated context — not just response.text
            const combinedFindings =
              findings.length > 0
                ? findings.join('\n\n---\n\n')
                : 'The introspection tools returned no data. Generate a conservative strategy update based on the session evaluation scores provided in the original context.';

            const synthesisChat = ai.chats.create({
              model: modelId,
              config: {
                temperature: 0.3,
                systemInstruction: [
                  'You are a meta-learning agent.',
                  'Based on the introspection findings below, produce a valid JSON object with EXACTLY these keys:',
                  '  whatFailed, whyItFailed, whatToDoNextTime, whatToAvoidNextTime, newRules (array of strings).',
                  'Output ONLY raw JSON with no markdown fences, no explanation, no preamble.',
                ].join(' '),
              },
            });

            const synthesisResponse = await synthesisChat.sendMessage({
              message: `Introspection findings:\n\n${combinedFindings}\n\nProduce the StrategyUpdate JSON now.`,
            });

            const rawJson = synthesisResponse.text?.trim() ?? '';
            if (!rawJson) {
              throw new Error(
                '[introspection] Synthesis model returned empty response — cannot produce StrategyUpdate',
              );
            }

            // Strip markdown fences if the model added them despite instructions
            const cleaned = rawJson
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```$/i, '')
              .trim();

            let parsed: unknown;
            try {
              parsed = JSON.parse(cleaned);
            } catch (err) {
              throw new Error(
                `[introspection] Failed to parse StrategyUpdate JSON: ${
                  err instanceof Error ? err.message : String(err)
                }\nRaw output was:\n${cleaned}`,
              );
            }

            // Validate the parsed result instead of unsafe cast
            const obj = parsed as Record<string, unknown>;
            result = {
              whatFailed: typeof obj.whatFailed === 'string' ? obj.whatFailed : 'Unknown',
              whyItFailed: typeof obj.whyItFailed === 'string' ? obj.whyItFailed : 'Unknown',
              whatToDoNextTime:
                typeof obj.whatToDoNextTime === 'string'
                  ? obj.whatToDoNextTime
                  : 'No recommendation',
              whatToAvoidNextTime:
                typeof obj.whatToAvoidNextTime === 'string'
                  ? obj.whatToAvoidNextTime
                  : 'No recommendation',
              newRules: Array.isArray(obj.newRules)
                ? obj.newRules.filter((r): r is string => typeof r === 'string')
                : ['Continue evaluating normally.'],
            };
            break; // Success, exit model loop
          } catch (err) {
            lastError = err as Error;
            logger.warn({ err, modelId }, '[introspection] Model attempt failed, trying next...');
          }
        }

        if (!result) throw lastError || new Error('All introspection models failed');
        return result;
      } catch (err) {
        span.recordException(err as Error);
        logger.error({ err }, '[introspection] runIntrospection failed');
        return {
          whatFailed: 'Introspection failed due to an error.',
          whyItFailed: 'N/A',
          whatToDoNextTime: 'Continue evaluating normally.',
          whatToAvoidNextTime: 'N/A',
          newRules: ['Continue evaluating normally.'],
        };
      } finally {
        span.end();
      }
    },
  );
}
