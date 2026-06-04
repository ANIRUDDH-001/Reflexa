import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEvaluation, evalSchema } from './llm';

// Mock the Gemini AI client so it never gets called
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: vi.fn().mockResolvedValue({
        text: '{"rubric":{"overall":99,"relevance":90,"depth":85,"clarity":95,"adaptability":88,"pacing":92,"opportunityCoverage":80},"candidateRubric":{"overall":85,"technicalAccuracy":82,"communicationClarity":90,"problemSolving":78,"depthOfKnowledge":88},"summary":"Test summary","candidateSummary":"Candidate performed well","weakTurns":[],"strategyOverrides":[]}',
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
    expect(result.rubric.opportunityCoverage).toBe(0);
    // Candidate rubric must also be zero for abandoned sessions
    expect(result.candidateRubric.overall).toBe(0);
    expect(result.candidateRubric.technicalAccuracy).toBe(0);
    expect(result.candidateRubric.communicationClarity).toBe(0);
    expect(result.candidateRubric.problemSolving).toBe(0);
    expect(result.candidateRubric.depthOfKnowledge).toBe(0);
    expect(result.candidateSummary).toBeDefined();
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
          opportunityCoverage: 62,
        },
        candidateRubric: {
          overall: 68,
          technicalAccuracy: 72,
          communicationClarity: 75,
          problemSolving: 60,
          depthOfKnowledge: 65,
        },
        summary: 'Good session',
        candidateSummary: 'Candidate showed solid understanding',
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

describe('opportunityCoverage field semantics', () => {
  it('high score means many opportunities captured (not many missed)', () => {
    const rubricSchema = evalSchema.properties?.['rubric'];
    const rubricProps = rubricSchema?.properties;
    expect(rubricProps).toBeDefined();

    const opportunitySchema = rubricProps?.['opportunityCoverage'];
    const fieldDesc = opportunitySchema?.description;
    expect(fieldDesc).toBeDefined();
    expect(fieldDesc?.toLowerCase()).toContain('100 = captured all key opportunities');
    expect(fieldDesc?.toLowerCase()).not.toContain('100 means many missed');
  });
});
