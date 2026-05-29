import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runIntrospection } from './introspection';

// ── Mocks ──────────────────────────────────────────────────────

// Mock the Gemini AI client
vi.mock('@google/genai', () => ({
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    INTEGER: 'INTEGER',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
  },
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    chats: {
      create: vi.fn().mockReturnValue({
        sendMessage: vi.fn(),
      }),
    },
  })),
}));

// Mock the MCP client
vi.mock('./mcp', () => ({
  getMcpToolsAsGemini: vi.fn().mockResolvedValue([{ name: 'get_spans' }]),
  callMcpTool: vi.fn(),
  getOrInitMcpClient: vi.fn().mockResolvedValue({
    callTool: vi.fn(),
    listTools: vi.fn().mockResolvedValue({ tools: [] }),
  }),
}));

const VALID_STRATEGY_UPDATE = {
  whatFailed: 'Agent accepted surface answers.',
  whyItFailed: 'No rule requiring probe after tech mention.',
  whatToDoNextTime: 'Ask: Why this technology? What is the failure mode?',
  whatToAvoidNextTime: 'Do not use generic Are there any other considerations.',
  newRules: ['Rule 1', 'Rule 2'],
};

// ── Tests ──────────────────────────────────────────────────────

describe('runIntrospection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_API_KEY = 'test-key';
  });

  it('returns a valid StrategyUpdate when the model responds with clean JSON', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const mockSendMessage = vi
      .fn()
      .mockResolvedValueOnce({ text: 'I will now query Phoenix.', functionCalls: [] })
      .mockResolvedValueOnce({ text: JSON.stringify(VALID_STRATEGY_UPDATE), functionCalls: [] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GoogleGenAI as any).mockImplementation(() => ({
      chats: { create: vi.fn().mockReturnValue({ sendMessage: mockSendMessage }) },
    }));

    const result = await runIntrospection('test-session-1', 40);

    expect(result).toMatchObject({
      whatFailed: expect.any(String),
      whyItFailed: expect.any(String),
      whatToDoNextTime: expect.any(String),
      whatToAvoidNextTime: expect.any(String),
      newRules: expect.any(Array),
    });
  });

  it('strips markdown code fences from model output before parsing', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const jsonWithFences = `\`\`\`json\n${JSON.stringify(VALID_STRATEGY_UPDATE)}\n\`\`\``;
    const mockSendMessage = vi.fn().mockResolvedValue({
      text: jsonWithFences,
      functionCalls: [],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GoogleGenAI as any).mockImplementation(() => ({
      chats: { create: vi.fn().mockReturnValue({ sendMessage: mockSendMessage }) },
    }));

    const result = await runIntrospection('test-session-2', 40);

    expect(result.whatFailed).toBe(VALID_STRATEGY_UPDATE.whatFailed);
  });

  it('accumulates findings across multiple tool-call turns (no context loss)', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const { callMcpTool } = await import('./mcp');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (callMcpTool as any).mockResolvedValue({
      content: [{ type: 'text', text: 'Found 3 weak spans in session test-session-3' }],
    });

    let callCount = 0;
    const mockSendMessage = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: model decides to use a tool
        return Promise.resolve({
          text: null,
          functionCalls: [{ id: 'fc-1', name: 'get_spans', args: { project_name: 'default' } }],
        });
      }
      // After tool result: model synthesises
      return Promise.resolve({
        text: JSON.stringify(VALID_STRATEGY_UPDATE),
        functionCalls: [],
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GoogleGenAI as any).mockImplementation(() => ({
      chats: { create: vi.fn().mockReturnValue({ sendMessage: mockSendMessage }) },
    }));

    const result = await runIntrospection('test-session-3', 40);

    // Verify MCP tool was actually called
    expect(callMcpTool).toHaveBeenCalledWith('get_spans', expect.any(Object));
    // Verify final output is valid
    expect(result.whatFailed).toBeTruthy();
  });

  it('returns safe fallback placeholder when model consistently returns null text', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const mockSendMessage = vi.fn().mockResolvedValue({ text: null, functionCalls: [] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GoogleGenAI as any).mockImplementation(() => ({
      chats: { create: vi.fn().mockReturnValue({ sendMessage: mockSendMessage }) },
    }));

    // Should not throw — should return fallback
    const result = await runIntrospection('test-session-4', 40);

    // The fallback must be a valid object, not undefined
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.whatFailed).toContain('Introspection failed due to an error.');
  });

  it('returns fallback when JSON parsing fails', async () => {
    const { GoogleGenAI } = await import('@google/genai');
    const mockSendMessage = vi.fn().mockResolvedValue({
      text: 'This is not JSON at all!',
      functionCalls: [],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (GoogleGenAI as any).mockImplementation(() => ({
      chats: { create: vi.fn().mockReturnValue({ sendMessage: mockSendMessage }) },
    }));

    // Should not throw — should log error and return fallback
    const result = await runIntrospection('test-session-5', 40);

    expect(result).toBeDefined();
    expect(result.whatFailed).toContain('Introspection failed due to an error.');
  });
});
