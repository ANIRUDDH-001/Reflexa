/* eslint-disable no-console */
/**
 * Reflexa – database seeding script.
 *
 * Inserts deterministic demo data so the frontend can be explored without
 * running a real interview.  Idempotent: uses fixed IDs so re-running the
 * script simply upserts the same rows.
 *
 * Usage:  npx ts-node src/seed.ts   (or  npx tsx src/seed.ts)
 */

import { saveSession, saveStrategy } from './state/db';
import { BackendSessionState } from './state/types';

/* ------------------------------------------------------------------ */
/*  1. Baseline strategy v1.0.0                                       */
/* ------------------------------------------------------------------ */

const baselineRules: string[] = [
  'Ask open-ended questions that encourage the candidate to explain trade-offs.',
  'Probe deeper when the candidate gives a surface-level answer.',
  'Adapt pacing based on candidate confidence signals.',
];

saveStrategy('v1.0.0', baselineRules);
console.log('✓ Strategy v1.0.0 seeded');

/* ------------------------------------------------------------------ */
/*  2. Weak baseline session  (demo-session-1)                        */
/* ------------------------------------------------------------------ */

const session1StartedAt = '2026-05-20T10:00:00.000Z';
const session1EndedAt = '2026-05-20T10:42:00.000Z';

const session1: BackendSessionState = {
  id: 'demo-session-1',
  userId: 'demo-user',
  startedAt: session1StartedAt,
  endedAt: session1EndedAt,
  status: 'completed',
  interviewPhase: 'closing',
  lastAgentAction: 'summarized',
  strategyVersion: 'v1.0.0',
  turnCount: 6,
  config: {
    role: 'backend',
    difficulty: 'senior',
    style: 'system-design',
    timeLimit: '45',
    focusAreas: ['Scalability', 'Database Modeling'],
  },
  activeStrategyRules: baselineRules,

  /* Trace ---------------------------------------------------------- */
  trace: [
    {
      id: 'trace-1-1',
      sessionId: 'demo-session-1',
      timestamp: session1StartedAt,
      type: 'ai_message',
      payload: {
        text: "Hello! I'll be acting as your engineering manager for this system-design interview focused on backend scalability and database modeling. Let's start by discussing how you'd design a real-time analytics pipeline. Are you ready?",
      },
    },
    {
      id: 'trace-1-2',
      sessionId: 'demo-session-1',
      timestamp: '2026-05-20T10:05:00.000Z',
      type: 'user_message',
      payload: {
        text: "Sure, I'd probably use Kafka for the event stream and maybe PostgreSQL for storing aggregates.",
      },
    },
    {
      id: 'trace-1-3',
      sessionId: 'demo-session-1',
      timestamp: '2026-05-20T10:06:30.000Z',
      type: 'ai_message',
      payload: {
        text: "Okay, Kafka and PostgreSQL — those are common choices. Let's move on to the next topic.",
      },
    },
  ],

  /* Strategy update ------------------------------------------------ */
  strategyUpdate: {
    id: 'su-1',
    sessionId: 'demo-session-1',
    whatFailed:
      'The agent accepted shallow answers without probing for depth. It moved to new topics prematurely and ignored contextual cues from the candidate.',
    whyItFailed:
      'The baseline strategy rules lacked specificity around when to probe and how to detect shallow responses. The agent defaulted to a checklist approach rather than a conversational deep-dive.',
    whatToDoNextTime:
      'Add explicit rules for detecting surface-level answers (e.g., no trade-off analysis, missing failure modes). Require at least one follow-up probe before changing topics.',
    whatToAvoidNextTime:
      'Avoid accepting one-sentence answers as complete. Do not change topics until at least two probing questions have been asked on the current subtopic.',
    updatedAt: session1EndedAt,
  },

  evalTraceId: 'eval-trace-1',
};

// Attach evaluation via `as any` — mirrors the real code path
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(session1 as any).evaluation = {
  id: 'eval-1',
  sessionId: 'demo-session-1',
  score: 42,
  rubric: {
    overall: 42,
    relevance: 50,
    depth: 35,
    clarity: 55,
    adaptability: 40,
    pacing: 45,
    opportunityCoverage: 30,
  },
  summary:
    'The agent conducted a shallow interview, frequently accepting brief answers and moving on without probing. Multiple opportunities to explore trade-offs and failure modes were missed.',
  weakTurns: [
    {
      turnLabel: 'Turn 2 — Kafka/Postgres response',
      summary: 'Agent accepted a two-technology answer with no follow-up.',
      explanation:
        'The candidate mentioned Kafka and PostgreSQL but gave no rationale for the choice, no discussion of partitioning, replication, or failure handling. The agent should have probed on at least one axis.',
      traceData: 'trace-1-3',
      failurePatternLabel: 'shallow_probing',
    },
    {
      turnLabel: 'Turn 4 — Context switch',
      summary: 'Agent changed topics despite unresolved candidate confusion.',
      explanation:
        'The candidate hinted at uncertainty about consistency guarantees, but the agent moved to a new topic instead of clarifying the gap.',
      traceData: 'trace-1-3',
      failurePatternLabel: 'ignored_context',
    },
    {
      turnLabel: 'Turn 5 — Rapid-fire questions',
      summary: 'Three questions posed in a single turn.',
      explanation:
        'The agent asked about caching, indexing, and sharding in one message, overwhelming the candidate and yielding superficial answers.',
      traceData: 'trace-1-3',
      failurePatternLabel: 'poor_pacing',
    },
  ],
  strategyOverrides: [],
  evaluatedAt: session1EndedAt,
};

saveSession(session1);
console.log('✓ Session demo-session-1 (weak baseline) seeded');

/* ------------------------------------------------------------------ */
/*  3. Improved session  (demo-session-2)                             */
/* ------------------------------------------------------------------ */

const session2StartedAt = '2026-05-25T14:00:00.000Z';
const session2EndedAt = '2026-05-25T14:48:00.000Z';

const improvedRules: string[] = [
  'When a candidate gives a one-sentence answer, ask a targeted follow-up before moving on.',
  'Detect surface-level responses: if no trade-offs, failure modes, or alternatives are mentioned, probe explicitly.',
  'Limit questions to one per turn — allow the candidate time to think.',
  'Track candidate confidence signals and adjust difficulty accordingly.',
  'Ensure at least two probing exchanges on each major subtopic before changing topics.',
];

const session2: BackendSessionState = {
  id: 'demo-session-2',
  userId: 'demo-user',
  startedAt: session2StartedAt,
  endedAt: session2EndedAt,
  status: 'completed',
  interviewPhase: 'closing',
  lastAgentAction: 'summarized',
  strategyVersion: 'v2.0.0',
  turnCount: 8,
  config: {
    role: 'backend',
    difficulty: 'senior',
    style: 'system-design',
    timeLimit: '45',
    focusAreas: ['Scalability', 'Database Modeling'],
  },
  activeStrategyRules: improvedRules,

  /* Trace ---------------------------------------------------------- */
  trace: [
    {
      id: 'trace-2-1',
      sessionId: 'demo-session-2',
      timestamp: session2StartedAt,
      type: 'ai_message',
      payload: {
        text: "Welcome back! In today's session we'll continue exploring system-design topics with a focus on scalability and database modeling. Let's design a notification delivery system — walk me through your high-level architecture.",
      },
    },
    {
      id: 'trace-2-2',
      sessionId: 'demo-session-2',
      timestamp: '2026-05-25T14:04:00.000Z',
      type: 'user_message',
      payload: {
        text: "I'd use a fan-out-on-write approach with a message queue. Notifications get produced into a topic partitioned by user-id so we can scale consumers horizontally.",
      },
    },
    {
      id: 'trace-2-3',
      sessionId: 'demo-session-2',
      timestamp: '2026-05-25T14:05:30.000Z',
      type: 'ai_message',
      payload: {
        text: "Good start — you've mentioned fan-out-on-write and partitioning by user-id. What trade-offs did you consider versus fan-out-on-read, especially for users with very high follower counts?",
      },
    },
    {
      id: 'trace-2-4',
      sessionId: 'demo-session-2',
      timestamp: '2026-05-25T14:10:00.000Z',
      type: 'user_message',
      payload: {
        text: 'For high-follower users we could switch to fan-out-on-read to avoid writing millions of copies. A hybrid approach uses a threshold — say 10K followers — to decide the strategy per user.',
      },
    },
  ],

  /* Strategy update ------------------------------------------------ */
  strategyUpdate: {
    id: 'su-2',
    sessionId: 'demo-session-2',
    whatFailed:
      'Minor gap: the agent could have explored failure-mode scenarios more deeply (e.g., queue back-pressure, dead-letter handling).',
    whyItFailed:
      'The improved rules focused heavily on probing breadth but lacked explicit prompts for failure-mode exploration.',
    whatToDoNextTime:
      'Introduce a dedicated failure-mode probing rule: after covering the happy path, explicitly ask about error handling, retries, and degradation.',
    whatToAvoidNextTime:
      'Avoid spending excessive time on trade-off comparisons when the candidate has already demonstrated strong reasoning — shift to failure modes earlier.',
    updatedAt: session2EndedAt,
  },

  evalTraceId: 'eval-trace-2',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(session2 as any).evaluation = {
  id: 'eval-2',
  sessionId: 'demo-session-2',
  score: 71,
  rubric: {
    overall: 71,
    relevance: 75,
    depth: 68,
    clarity: 80,
    adaptability: 72,
    pacing: 70,
    opportunityCoverage: 62,
  },
  summary:
    'Significant improvement from the baseline session. The agent probed deeper on trade-offs and maintained better pacing. Remaining gap: failure-mode exploration was surface-level.',
  weakTurns: [
    {
      turnLabel: 'Turn 6 — Failure-mode gap',
      summary: 'Agent skipped failure-mode probing on the notification pipeline.',
      explanation:
        'After the candidate outlined the hybrid fan-out strategy, the agent moved to database schema design without asking about error handling, retries, or back-pressure.',
      traceData: 'trace-2-3',
      failurePatternLabel: 'shallow_probing',
    },
  ],
  strategyOverrides: improvedRules,
  evaluatedAt: session2EndedAt,
};

saveSession(session2);
console.log('✓ Session demo-session-2 (improved) seeded');

/* ------------------------------------------------------------------ */
/*  4. Improved strategy v2.0.0                                       */
/* ------------------------------------------------------------------ */

saveStrategy('v2.0.0', improvedRules);
console.log('✓ Strategy v2.0.0 seeded');

/* ------------------------------------------------------------------ */
/*  Summary                                                           */
/* ------------------------------------------------------------------ */

console.log('\n🌱 Seed complete:');
console.log('   • Strategies : v1.0.0 (baseline, 3 rules), v2.0.0 (improved, 5 rules)');
console.log('   • Sessions   : demo-session-1 (score 42), demo-session-2 (score 71)');
console.log('   • User       : demo-user');
