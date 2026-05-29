import { randomUUID } from 'crypto';
import './telemetry';
import { trace } from '@opentelemetry/api';
import { APIContracts } from '@reflexa/shared';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { runIntrospection } from './engine/introspection';
import { processTurn, generateEvaluation } from './engine/llm';
import {
  getLatestStrategy,
  saveStrategy,
  getSession,
  saveSession,
  getHistorySessions,
} from './state/db';
import { BackendSessionState } from './state/types';

// ── Startup env validation ─────────────────────────────────────
// Fail fast if required environment variables are missing.
// This prevents silent failures buried in LLM call stack traces.
const REQUIRED_ENV_VARS = [
  'GOOGLE_API_KEY',
  'PHOENIX_API_KEY',
  'PHOENIX_COLLECTOR_ENDPOINT',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    // eslint-disable-next-line no-console
    console.error(`[Reflexa] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}
// ── End env validation ─────────────────────────────────────────

const generateId = () => randomUUID();

const app = express();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const httpLogger = pinoHttp({
  logger,
  redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.text', 'req.body.config'],
});

app.use(helmet());
app.use(httpLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

const turnLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 turn requests per minute
  message: { error: 'Rate limit exceeded for turn submission.' },
});

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  const payload = { status: 'ok' as const, ts: new Date().toISOString() };
  const parsed = APIContracts.HealthResponse.safeParse(payload);
  if (!parsed.success) {
    return res.status(500).json({ error: 'contract mismatch', details: parsed.error.format() });
  }
  return res.json(payload);
});

// Start a new session
app.post('/session', async (req: Request, res: Response) => {
  const parsedBody = APIContracts.CreateSessionRequest.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: 'invalid request', details: parsedBody.error.format() });
  }

  const sessionId = generateId();
  const config = {
    role: parsedBody.data.config?.role ?? null,
    difficulty: parsedBody.data.config?.difficulty ?? null,
    style: parsedBody.data.config?.style ?? null,
    timeLimit: parsedBody.data.config?.timeLimit ?? null,
    focusAreas: parsedBody.data.config?.focusAreas ?? [],
  };

  const latestStrategy = await getLatestStrategy();

  const newSession: BackendSessionState = {
    id: sessionId,
    userId: parsedBody.data.userId,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    interviewPhase: 'intro',
    lastAgentAction: null,
    strategyVersion: latestStrategy?.version || 'v1.0.0',
    turnCount: 0,
    config,
    activeStrategyRules: latestStrategy?.rules || [],
    trace: [
      {
        id: generateId(),
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'ai_message',
        payload: {
          text: `Hello! I'll be acting as your engineering manager for this ${
            config.style || 'technical'
          } interview. Today we're going to design a distributed system. Are you ready to begin?`,
        },
      },
    ],
  };

  await saveSession(newSession);

  const responsePayload = { session: newSession };
  const parsedRes = APIContracts.CreateSessionResponse.safeParse(responsePayload);
  if (!parsedRes.success) {
    return res.status(500).json({ error: 'contract mismatch', details: parsedRes.error.format() });
  }

  return res.status(201).json(responsePayload);
});

// Fetch current session state
app.get('/session/:id', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = await getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const responsePayload = { session };
  const parsedRes = APIContracts.GetSessionResponse.safeParse(responsePayload);
  if (!parsedRes.success) {
    return res.status(500).json({ error: 'contract mismatch', details: parsedRes.error.format() });
  }

  return res.json(responsePayload);
});

// Submit an answer (user turn)
app.post('/session/:id/turn', turnLimiter, async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = await getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  if (session.status !== 'in_progress') {
    return res.status(400).json({ error: 'Session is not active' });
  }

  const parsedBody = APIContracts.TurnRequest.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: 'invalid request', details: parsedBody.error.format() });
  }

  // Record user turn
  session.trace = session.trace || [];
  session.trace.push({
    id: generateId(),
    sessionId,
    timestamp: new Date().toISOString(),
    type: 'user_message',
    payload: { text: parsedBody.data.text },
  });

  try {
    session.turnCount += 1;
    if (session.turnCount > 2) session.interviewPhase = 'deep_dive';

    // Call the real Gemini SDK integration
    const llmOutput = await processTurn(session, parsedBody.data.text);

    // Update state based on LLM output
    session.lastAgentAction =
      llmOutput.nextActionIndicator as BackendSessionState['lastAgentAction'];

    const traceId = llmOutput.traceId;

    session.trace.push({
      id: generateId(),
      sessionId,
      timestamp: new Date().toISOString(),
      type: 'ai_message',
      traceId,
      payload: {
        text: llmOutput.agentMessage,
        metadata: {
          status: llmOutput.statusMetadata,
          scoreHint: llmOutput.scoreHints,
        },
      },
    });

    await saveSession(session);

    const responsePayload = {
      text: llmOutput.agentMessage,
      traceId,
    };
    const parsedRes = APIContracts.TurnResponse.safeParse(responsePayload);
    if (!parsedRes.success) {
      return res
        .status(500)
        .json({ error: 'contract mismatch', details: parsedRes.error.format() });
    }

    return res.json(responsePayload);
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to process turn', details: err });
  }
});

// Close a session
app.post('/session/:id/end', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = await getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const parsedBody = APIContracts.EndSessionRequest.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: 'invalid request', details: parsedBody.error.format() });
  }

  session.status = 'completed';
  session.interviewPhase = 'closing';
  session.endedAt = new Date().toISOString();

  try {
    const evaluation = await generateEvaluation(session.trace || [], sessionId);

    // Introspection via MCP
    const evalScore = evaluation.rubric?.overall || evaluation.score || 0;
    const introspection = await runIntrospection(sessionId, evalScore);

    // Save new strategy version
    const newVersionId = `v${Date.now()}`;
    await saveStrategy(newVersionId, introspection.newRules);

    evaluation.strategyOverrides = introspection.newRules;

    // Save the evaluation and strategy update into session state
    session.evaluation = evaluation;
    session.strategyUpdate = {
      id: newVersionId,
      sessionId: session.id,
      whatFailed: introspection.whatFailed,
      whyItFailed: introspection.whyItFailed,
      whatToDoNextTime: introspection.whatToDoNextTime,
      whatToAvoidNextTime: introspection.whatToAvoidNextTime,
      updatedAt: new Date().toISOString(),
    };
    session.strategyVersion = newVersionId;
    session.activeStrategyRules = introspection.newRules;

    const traceId = trace.getActiveSpan()?.spanContext().traceId;
    session.evalTraceId = traceId;

    await saveSession(session);

    const responsePayload = {
      status: 'completed' as const,
      analysisSummary: evaluation.summary,
      strategySummary: introspection.whatFailed,
      traceId,
    };

    const parsedRes = APIContracts.EndSessionResponse.safeParse(responsePayload);
    if (!parsedRes.success) {
      return res
        .status(500)
        .json({ error: 'contract mismatch', details: parsedRes.error.format() });
    }

    return res.json(responsePayload);
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to generate evaluation', details: err });
  }
});

// Fetch all history sessions
app.get('/sessions', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default_user';
  try {
    const history = await getHistorySessions(userId);
    return res.json({ sessions: history });
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Failed to fetch history', details: err });
  }
});

// Compare session to previous
app.get('/session/:id/compare', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = await getSession(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const history = await getHistorySessions(session.userId);
  const currentIndex = history.findIndex((h) => h.id === sessionId);

  if (currentIndex === -1 || currentIndex === history.length - 1) {
    return res.json({ comparison: null }); // No previous session
  }

  const previousSession = history[currentIndex + 1];

  const currentRubric = session.evaluation?.rubric;
  const previousRubric = (previousSession as { evaluation?: { rubric?: Record<string, number> } })
    .evaluation?.rubric;

  if (!currentRubric || !previousRubric) {
    return res.json({ comparison: null });
  }

  const delta: Record<string, number> = {};
  for (const key of Object.keys(currentRubric)) {
    delta[key] =
      (currentRubric[key as keyof typeof currentRubric] || 0) - (previousRubric[key] || 0);
  }

  const comparison = {
    baselineSessionId: previousSession.id,
    currentSessionId: session.id,
    delta,
    behaviorChanges: `Compared to the previous session (${
      previousSession.id
    }), overall score changed by ${delta.overall > 0 ? '+' : ''}${delta.overall} points.`,
  };

  return res.json({ comparison });
});

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Export app for supertest integration tests
export { app };

const PORT = process.env.PORT || 8000;
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`);
  });
}
