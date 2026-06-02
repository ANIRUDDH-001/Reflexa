import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEvaluation } from './llm';

// Mock the Gemini AI client so it never gets called
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: '{"rubric":{"overall":99},"summary":"","weakTurns":[],"strategyOverrides":[]}',
      }),
    },
  })),
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', INTEGER: 'INTEGER', ARRAY: 'ARRAY' },
  Schema: {},
}));

describe('generateEvaluation — minimal input guard', () => {
  beforeEach(() => {
    process.env.GOOGLE_API_KEY = 'test-key';
    vi.clearAllMocks();
  });

  it('returns all-zero rubric for 0 user messages without calling LLM', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const mockGenerateContent = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GoogleGenAI as any).mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    }));

    const result = await generateEvaluation(
      [{ type: 'ai_message', payload: { text: 'Hello, ready to begin?' } }],
      'test-session-zero',
    );

    expect(result.rubric.overall).toBe(0);
    expect(result.rubric.relevance).toBe(0);
    expect(result.rubric.depth).toBe(0);
    expect(result.rubric.clarity).toBe(0);
    expect(result.rubric.adaptability).toBe(0);
    expect(result.rubric.pacing).toBe(0);
    expect(result.rubric.missedOpportunities).toBe(0);
    expect(result.summary).toContain('abandoned');
    expect(result.strategyOverrides.length).toBeGreaterThan(0);
    // LLM must NOT have been called
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('returns all-zero rubric for 1 user message without calling LLM', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const mockGenerateContent = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GoogleGenAI as any).mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    }));

    const trace = [
      { type: 'ai_message', payload: { text: 'Hello!' } },
      { type: 'user_message', payload: { text: 'hi' } },
    ];

    const result = await generateEvaluation(trace, 'test-session-one');

    expect(result.rubric.overall).toBe(0);
    expect(result.rubric.pacing).toBe(0);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('calls LLM normally for sessions with 2+ user messages', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const mockGenerateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        rubric: {
          overall: 70,
          relevance: 75,
          depth: 65,
          clarity: 80,
          adaptability: 72,
          pacing: 70,
          missedOpportunities: 62,
        },
        summary: 'Good session',
        weakTurns: [],
        strategyOverrides: [],
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GoogleGenAI as any).mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    }));

    const trace = [
      { type: 'ai_message', payload: { text: 'Hello' } },
      { type: 'user_message', payload: { text: 'First answer' } },
      { type: 'ai_message', payload: { text: 'Follow up' } },
      { type: 'user_message', payload: { text: 'Second answer' } },
    ];

    await generateEvaluation(trace, 'test-session-two');

    expect(mockGenerateContent).toHaveBeenCalledOnce();
  });
});
