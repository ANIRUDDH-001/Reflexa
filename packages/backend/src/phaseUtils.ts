import { BackendSessionState } from './state/types';

export function updateSessionPhase(session: BackendSessionState): void {
  const raw = parseInt(session.config.timeLimit || '20', 10);
  const timeLimit = Number.isNaN(raw) ? 20 : raw;
  const estimatedTurns = Math.max(4, Math.floor(timeLimit / 2.5));

  // Four equal-ish phase bands, scaled to session length
  const introEnd = Math.ceil(estimatedTurns * 0.15); // ~15% — greeting + context
  const explorationEnd = Math.ceil(estimatedTurns * 0.4); // ~40% — open questions, surface breadth
  const deepDiveEnd = Math.ceil(estimatedTurns * 0.85); // ~85% — probing, follow-ups, challenges

  if (session.turnCount <= introEnd) {
    session.interviewPhase = 'intro';
  } else if (session.turnCount <= explorationEnd) {
    session.interviewPhase = 'exploration';
  } else if (session.turnCount <= deepDiveEnd) {
    session.interviewPhase = 'deep_dive';
  } else {
    session.interviewPhase = 'closing';
  }
}
