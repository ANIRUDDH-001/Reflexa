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

export interface EvaluationResultData {
  score: number;
  summary: string;
  weakTurns: Array<{
    turnLabel: string;
    summary: string;
    explanation: string;
    traceData: string;
  }>;
  strategyOverrides: string[];
}

const evalSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: 'Overall score out of 100' },
    summary: { type: Type.STRING, description: "Brief summary of the candidate's performance" },
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
        },
        required: ['turnLabel', 'summary', 'explanation', 'traceData'],
      },
    },
    strategyOverrides: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['score', 'summary', 'weakTurns', 'strategyOverrides'],
};

export async function generateEvaluation(trace: unknown[]): Promise<EvaluationResultData> {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_API_KEY || '',
  });

  const traceText = trace
    .map((t) => `${t.type === 'ai_message' ? 'AI' : 'User'}: ${t.payload.text}`)
    .join('\n\n');

  const systemInstruction =
    'You are an expert engineering manager evaluating a completed interview. Analyze the following interview trace and identify the weakest turns where the candidate struggled, made assumptions, or missed requirements. Provide a comprehensive evaluation with strategy overrides to focus on in future sessions.';

  for (const model of MODELS) {
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
      if (!rawText) throw new Error('Empty response from LLM');
      return JSON.parse(rawText);
    } catch (e: unknown) {
      if (e instanceof Error) {
        // fallback
      }
    }
  }

  throw new Error('All fallback models failed.');
}
