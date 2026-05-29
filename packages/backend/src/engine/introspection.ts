import { GoogleGenAI } from '@google/genai';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
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

const PHOENIX_PROJECT = process.env.PHOENIX_PROJECT_NAME || 'default';

export async function runIntrospection(
  sessionId: string,
  evalScore: number,
): Promise<StrategyUpdateResult> {
  return tracer.startActiveSpan(
    'runIntrospection',
    { attributes: { 'openinference.span.kind': 'AGENT', 'session.id': sessionId } },
    async (span) => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' });

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

        const systemInstruction =
          `You are the Reflexa Introspection Agent. ` +
          `The last interview session (ID: ${sessionId}) scored ${evalScore}/100. ` +
          `Use your Phoenix MCP tools to query traces and spans for this session. ` +
          `Find specific LLM behaviours or weaknesses that led to a low score. ` +
          `Formulate a strategy update with new system prompt rules that will fix these behaviours.`;

        const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: tools }],
            temperature: 0.3,
          },
        });

        // ── Task 5: include Phoenix project name explicitly ───────────────
        const introspectionContext =
          `Phoenix project name: "${PHOENIX_PROJECT}"\n` +
          `Session ID to introspect: "${sessionId}"\n` +
          `Session evaluation overall score: ${evalScore ?? 'unknown'}\n\n` +
          `Use the Phoenix MCP tools to retrieve the traces and evaluation scores for this session, ` +
          `then identify the weakest turns and generate a StrategyUpdate to improve future sessions. ` +
          `Start by calling get_traces with project_name="${PHOENIX_PROJECT}" and filter by the session ID above.`;

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
          model: 'gemini-2.5-flash',
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

        return parsed as StrategyUpdateResult;
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
