import { GoogleGenAI, Type, Schema } from '@google/genai';
import { BackendSessionState } from '../state/types';
import { assemblePrompt } from './promptBuilder';
import 'dotenv/config';

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

      if (!rawText) throw new Error('Empty response from LLM');
      return JSON.parse(rawText);
    } catch (e: unknown) {
      // Fallback silently
      if (e instanceof Error) {
        // We could log error metrics here
      }
    }
  }

  throw new Error('All fallback models failed.');
}
