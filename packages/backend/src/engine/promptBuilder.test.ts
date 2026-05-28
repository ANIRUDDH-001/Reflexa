import { describe, it, expect } from 'vitest';
import { BackendSessionState } from '../state/types';
import { assemblePrompt } from './promptBuilder';

/**
 * Helper: build a minimal BackendSessionState with optional overrides.
 */
function makeState(overrides: Partial<BackendSessionState> = {}): BackendSessionState {
  return {
    id: 'test-session-1',
    userId: 'user-1',
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    endedAt: null,
    interviewPhase: 'exploration',
    lastAgentAction: null,
    strategyVersion: 'v1.2.3',
    config: {
      role: 'Backend Engineer',
      difficulty: 'Hard',
      style: 'System Design',
      timeLimit: '45',
      focusAreas: ['distributed systems', 'databases'],
    },
    trace: [],
    turnCount: 5,
    activeStrategyRules: undefined,
    ...overrides,
  } as BackendSessionState;
}

// ---------------------------------------------------------------------------
// Config fields in the prompt
// ---------------------------------------------------------------------------
describe('assemblePrompt – config interpolation', () => {
  it('includes the role, difficulty, and style from config', () => {
    const prompt = assemblePrompt(makeState());

    expect(prompt).toContain('Backend Engineer');
    expect(prompt).toContain('Hard');
    expect(prompt).toContain('System Design');
  });

  it('includes focus areas when provided', () => {
    const prompt = assemblePrompt(
      makeState({
        config: {
          role: 'Frontend Engineer',
          difficulty: 'Easy',
          style: 'Behavioral',
          timeLimit: '30',
          focusAreas: ['React', 'CSS', 'accessibility'],
        },
      }),
    );

    expect(prompt).toContain('React');
    expect(prompt).toContain('CSS');
    expect(prompt).toContain('accessibility');
  });

  it('uses default fallbacks when config fields are null', () => {
    const prompt = assemblePrompt(
      makeState({
        config: {
          role: null,
          difficulty: null,
          style: null,
          timeLimit: null,
          focusAreas: [],
        },
      }),
    );

    // The defaults from promptBuilder.ts
    expect(prompt).toContain('Software Engineer');
    expect(prompt).toContain('Medium');
    expect(prompt).toContain('Technical Interview');
    expect(prompt).toContain('general engineering practices');
  });
});

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------
describe('assemblePrompt – sanitization', () => {
  it('strips < and > from user-provided config values', () => {
    const prompt = assemblePrompt(
      makeState({
        config: {
          role: "<script>alert('xss')</script>",
          difficulty: '<b>Hard</b>',
          style: 'Normal',
          timeLimit: '30',
          focusAreas: ['<img onerror=alert(1)>'],
        },
      }),
    );

    expect(prompt).not.toContain('<script>');
    expect(prompt).not.toContain('</script>');
    expect(prompt).not.toContain('<b>');
    expect(prompt).not.toContain('</b>');
    expect(prompt).not.toContain('<img');
    // The sanitized text should still be present without the angle brackets
    expect(prompt).toContain("scriptalert('xss')/script");
    expect(prompt).toContain('bHard/b');
  });
});

// ---------------------------------------------------------------------------
// Strategy overrides
// ---------------------------------------------------------------------------
describe('assemblePrompt – strategy overrides', () => {
  it('includes Strategy Overrides section when activeStrategyRules has entries', () => {
    const prompt = assemblePrompt(
      makeState({
        activeStrategyRules: ['Probe deeper on vague answers', 'Reduce hint frequency'],
      }),
    );

    expect(prompt).toContain('Strategy Overrides');
    expect(prompt).toContain('Probe deeper on vague answers');
    expect(prompt).toContain('Reduce hint frequency');
  });

  it('omits Strategy Overrides section when activeStrategyRules is empty', () => {
    const prompt = assemblePrompt(makeState({ activeStrategyRules: [] }));

    expect(prompt).not.toContain('Strategy Overrides');
  });

  it('omits Strategy Overrides section when activeStrategyRules is undefined', () => {
    const prompt = assemblePrompt(makeState({ activeStrategyRules: undefined }));

    expect(prompt).not.toContain('Strategy Overrides');
  });
});

// ---------------------------------------------------------------------------
// Session metadata
// ---------------------------------------------------------------------------
describe('assemblePrompt – session metadata', () => {
  it('includes the interview phase (uppercased) and turn count', () => {
    const prompt = assemblePrompt(makeState({ interviewPhase: 'deep_dive', turnCount: 12 }));

    expect(prompt).toContain('DEEP_DIVE');
    expect(prompt).toContain('Turn Count: 12');
  });

  it('includes the strategy version', () => {
    const prompt = assemblePrompt(makeState({ strategyVersion: 'v3.7.1' }));

    expect(prompt).toContain('Strategy Version: v3.7.1');
  });

  it('shows "None" for lastAgentAction when it is null', () => {
    const prompt = assemblePrompt(makeState({ lastAgentAction: null }));

    expect(prompt).toContain('Last Action: None');
  });

  it('shows the actual lastAgentAction when set', () => {
    const prompt = assemblePrompt(makeState({ lastAgentAction: 'probed' }));

    expect(prompt).toContain('Last Action: probed');
  });
});
