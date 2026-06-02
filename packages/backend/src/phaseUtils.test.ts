import { describe, it, expect } from 'vitest';
import { updateSessionPhase } from './phaseUtils';

function makeSession(turnCount: number, timeLimit = '20') {
  return {
    turnCount,
    config: { timeLimit },
    interviewPhase: 'intro' as const,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('updateSessionPhase', () => {
  it('returns intro for early turns', () => {
    const s = makeSession(1);
    updateSessionPhase(s);
    expect(s.interviewPhase).toBe('intro');
  });

  it('returns exploration for middle-early turns', () => {
    const s = makeSession(4, '20');
    updateSessionPhase(s);
    expect(s.interviewPhase).toBe('exploration');
  });

  it('returns deep_dive for main body turns', () => {
    const s = makeSession(7, '20');
    updateSessionPhase(s);
    expect(s.interviewPhase).toBe('deep_dive');
  });

  it('returns closing for final turns', () => {
    const s = makeSession(12, '20');
    updateSessionPhase(s);
    expect(s.interviewPhase).toBe('closing');
  });

  it('never returns exploration-less transitions', () => {
    const phases = new Set<string>();
    for (let t = 0; t <= 20; t++) {
      const s = makeSession(t, '20');
      updateSessionPhase(s);
      phases.add(s.interviewPhase);
    }
    expect(phases.has('exploration')).toBe(true);
    expect(phases.has('intro')).toBe(true);
    expect(phases.has('deep_dive')).toBe(true);
    expect(phases.has('closing')).toBe(true);
  });

  it('scales phase thresholds with longer sessions', () => {
    const s30 = makeSession(5, '30');
    const s5 = makeSession(5, '5');
    updateSessionPhase(s30);
    updateSessionPhase(s5);
    // A turn-5 in a 30-min session should be exploration; in a 5-min session, closing
    expect(s30.interviewPhase).toBe('exploration');
    expect(s5.interviewPhase).toBe('closing');
  });
});
