import { GoogleGenAI, Type, Schema } from '@google/genai';
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

const strategySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    whatFailed: {
      type: Type.STRING,
      description: 'Description of what specific behaviors failed in the interview.',
    },
    whyItFailed: {
      type: Type.STRING,
      description: 'Analysis of why those behaviors failed or missed the mark.',
    },
    whatToDoNextTime: {
      type: Type.STRING,
      description: 'Actionable advice on what the agent should do instead.',
    },
    whatToAvoidNextTime: {
      type: Type.STRING,
      description: 'Clear anti-patterns the agent should avoid.',
    },
    newRules: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific rules to prepend to the system prompt of the next session.',
    },
  },
  required: ['whatFailed', 'whyItFailed', 'whatToDoNextTime', 'whatToAvoidNextTime', 'newRules'],
};

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
          `You are the Reflexa Introspection Agent. The last interview session (ID: ${sessionId}) scored ${evalScore}/100. ` +
          `Use your tools to query the Phoenix MCP server for traces and spans. Find the specific LLM behaviors or weaknesses that led to low scores. ` +
          `Formulate a strategy update containing new system prompt rules that will fix these behaviors in the next session. You must output the strategy in a structured 4-part explanation.`;

        const chat = ai.chats.create({
          model: 'gemini-2.5-flash', // fast reasoning
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: tools }],
            temperature: 0.3,
          },
        });

        logger.info(`Starting introspection loop for session ${sessionId}...`);

        let response = await chat.sendMessage({
          message: `Session ${sessionId} just completed with score ${evalScore}. Please inspect the traces, analyze weaknesses, and provide a strategy update.`,
        });

        // Handle multi-turn function calls
        for (let i = 0; i < 5; i++) {
          // max 5 iterations
          if (response.functionCalls && response.functionCalls.length > 0) {
            const functionResponses = [];
            for (const call of response.functionCalls) {
              try {
                logger.info(`Introspection agent calling tool ${call.name}`);
                const resultText = await callMcpTool(
                  call.name as string,
                  (call.args || {}) as Record<string, unknown>,
                );
                functionResponses.push({
                  functionResponse: {
                    id: call.id as string, // ← required for Gemini 3.x
                    name: call.name as string,
                    response: { result: resultText },
                  },
                });
              } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                logger.error({ err }, `Tool ${call.name} failed`);
                functionResponses.push({
                  functionResponse: {
                    id: call.id as string, // ← required for Gemini 3.x
                    name: call.name as string,
                    response: { error: errorMessage },
                  },
                });
              }
            }

            // Send results back to model
            response = await chat.sendMessage({ message: functionResponses });
          } else {
            break; // No more tool calls
          }
        }

        // Final turn: ask it to format according to schema
        const finalChat = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction:
              'You summarize introspection findings into structured strategy updates.',
            responseMimeType: 'application/json',
            responseSchema: strategySchema,
          },
        });

        const finalResponse = await finalChat.sendMessage({
          message: `Based on your introspection findings:\n${response.text}\n\nProvide the final StrategyUpdate JSON.`,
        });

        if (!finalResponse.text) {
          throw new Error('Failed to generate StrategyUpdate JSON');
        }

        const strategy = JSON.parse(finalResponse.text);
        return strategy;
      } catch (err) {
        span.recordException(err as Error);
        logger.error({ err }, 'Introspection failed');
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
