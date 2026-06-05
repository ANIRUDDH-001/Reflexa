import 'dotenv/config';
import { randomUUID } from 'crypto';
import './telemetry';
import { APIContracts } from '@reflexa/shared';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { runIntrospection } from './engine/introspection';
import {
  processTurn,
  generateEvaluation,
  processTurnStream,
  CandidateAssessment,
} from './engine/llm';
import { buildOpeningMessage } from './engine/promptBuilder';
import { generateStudyPlan } from './engine/studyPlan';
import { extractAuthenticatedUser } from './middleware/auth';
import { updateSessionPhase } from './phaseUtils';
import {
  getLatestStrategy,
  saveStrategy,
  deleteStrategy,
  getSession,
  saveSession,
  getHistorySessions,
} from './state/db';
import { BackendSessionState } from './state/types';

// ── Startup environment validation ────────────────────────────
// CRITICAL variables: server will not start without these.
// Use SKIP_ENV_VALIDATION=true in CI where stub values are injected.
if (process.env.SKIP_ENV_VALIDATION !== 'true') {
  const REQUIRED: string[] = [
    'GOOGLE_API_KEY',
    'PHOENIX_API_KEY',
    'PHOENIX_COLLECTOR_ENDPOINT',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`[Reflexa] Missing required environment variables: ${missing.join(', ')}`);
    // eslint-disable-next-line no-console
    console.error('[Reflexa] Server will not start. Set these variables and restart.');
    process.exit(1);
  }
}

// RECOMMENDED variables: server starts but features degrade without these.
if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_ORIGIN) {
  // Hard crash in production — a silent CORS default is worse than a clear startup failure
  // eslint-disable-next-line no-console
  console.error(
    '[Reflexa] FRONTEND_ORIGIN is required in production. ' +
      'Set it to your frontend URL (e.g. https://reflexa.vercel.app). ' +
      'Refusing to start to prevent silent CORS failures.',
  );
  process.exit(1);
}

if (!process.env.FRONTEND_ORIGIN) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Reflexa] FRONTEND_ORIGIN not set — defaulting to http://localhost:5173. ' +
      'This will block all requests from a production frontend.',
  );
}
if (!process.env.PHOENIX_PROJECT_NAME) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Reflexa] PHOENIX_PROJECT_NAME not set — defaulting to "default". ' +
      'Set this to your Phoenix project name for correct trace links.',
  );
}
// ── End env validation ─────────────────────────────────────────

const generateId = () => randomUUID();

// Extract userId from JWT or X-User-Id header (dev fallback).
async function extractUserId(req: Request): Promise<string | null> {
  const authUser = await extractAuthenticatedUser(req);
  return authUser?.id ?? null;
}

/**
 * Fetches a session and verifies the requesting user owns it.
 * Returns the session if ownership is confirmed.
 * Sends the appropriate error response and returns null if not.
 *
 * Usage:
 *   const session = await requireSessionOwnership(req, res, req.params.id);
 *   if (!session) return; // response already sent
 */
async function requireSessionOwnership(
  req: Request,
  res: Response,
  sessionId: string,
): Promise<BackendSessionState | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Allow demo-session-* and test-session-* for testing, otherwise require UUID
  if (
    !sessionId.startsWith('demo-session-') &&
    !sessionId.startsWith('test-session-') &&
    !sessionId.startsWith('non-existent-') &&
    !sessionId.startsWith('nonexistent-') &&
    !uuidRegex.test(sessionId)
  ) {
    res.status(400).json({ error: 'Invalid session ID format' });
    return null;
  }

  const session = await getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return null;
  }

  const requestUserId = await extractUserId(req);
  if (!requestUserId) {
    res.status(401).json({ error: 'Authentication required. Send X-User-Id header.' });
    return null;
  }

  if (session.userId !== requestUserId) {
    res.status(403).json({ error: 'Forbidden. You do not have access to this session.' });
    return null;
  }

  return session;
}

const app: express.Application = express();

// Trust Cloud Run's load balancer — required for correct IP detection
// and for express-rate-limit to work correctly behind Google's proxy.
app.set('trust proxy', process.env.TRUST_PROXY || 1);

export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const httpLogger = pinoHttp({
  logger,
  redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.text', 'req.body.config'],
});

app.use(helmet());
app.use(httpLogger);

// Health check — Cloud Run calls this to verify the container is alive.
// Must be registered BEFORE the rate limiter to avoid rate-limiting health checks.
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'reflexa-backend',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.0.0',
  });
});

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

app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Parse FRONTEND_ORIGIN as a comma-separated list for staging + production
      const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
        .split(',')
        .map((o) => o.trim().replace(/\/$/, ''))
        .filter(Boolean);

      // Allow requests with no origin (curl, server-to-server, Postman)
      if (!requestOrigin) return callback(null, true);

      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }

      logger.warn({ requestOrigin, allowedOrigins }, 'CORS: blocked request from unknown origin');
      return callback(new Error(`CORS: origin ${requestOrigin} is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  }),
);
app.use(express.json());

/**
 * Build the Phoenix trace viewer base URL from environment variables.
 * Used by both GET /config and GET /session/:id to avoid duplication.
 */
function getPhoenixTraceBase(): string {
  const PHOENIX_PROJECT = process.env.PHOENIX_PROJECT_NAME || 'default';
  let traceBase = 'https://app.phoenix.arize.com';

  const collector = process.env.PHOENIX_COLLECTOR_ENDPOINT || '';
  if (collector.includes('/s/')) {
    const spaceMatch = collector.match(/\/s\/([^/]+)/);
    if (spaceMatch) {
      const spaceSlug = spaceMatch[1];
      traceBase = `https://app.phoenix.arize.com/s/${spaceSlug}/projects/${PHOENIX_PROJECT}/traces`;
    }
  } else if (collector.startsWith('http://localhost') || collector.startsWith('http://0.0.0.0')) {
    const baseUrl = collector.replace(/\/v1\/traces\/?$/, '');
    traceBase = `${baseUrl}/projects/${PHOENIX_PROJECT}/traces`;
  }
  return traceBase;
}

// Expose dynamic configuration to the frontend
app.get('/config', (req: Request, res: Response) => {
  res.json({
    phoenixTraceBase: getPhoenixTraceBase(),
  });
});

// Start a new session
app.post('/session', async (req: Request, res: Response) => {
  const userId = await extractUserId(req);
  if (!userId) {
    return res.status(400).json({ error: 'Missing user identity. Send X-User-Id header.' });
  }

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

  const latestStrategy = await getLatestStrategy(userId);

  const newSession: BackendSessionState = {
    id: sessionId,
    userId,
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
          text: buildOpeningMessage(config),
        },
      },
    ],
  };

  await saveSession(newSession);

  const responsePayload = {
    session: newSession,
    strategyVersion: newSession.strategyVersion,
    activeRulesCount: newSession.activeStrategyRules?.length || 0,
  };
  const parsedRes = APIContracts.CreateSessionResponse.safeParse(responsePayload);
  if (!parsedRes.success) {
    return res.status(500).json({ error: 'contract mismatch', details: parsedRes.error.format() });
  }

  return res.status(201).json(responsePayload);
});

// Fetch current session state
app.get('/session/:id', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = await requireSessionOwnership(req, res, sessionId);
  if (!session) return;

  const traceBase = getPhoenixTraceBase();
  const collector = process.env.PHOENIX_COLLECTOR_ENDPOINT || '';
  const phoenixTraceUrl =
    session.evalTraceId && collector ? `${traceBase}/${session.evalTraceId}` : null;

  res.json({
    session,
    phoenixTraceUrl,
    strategyVersion: session.strategyVersion,
    activeRulesCount: session.activeStrategyRules?.length || 0,
  });
});

// Submit an answer (user turn)
app.post('/session/:id/turn', turnLimiter, async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = await requireSessionOwnership(req, res, sessionId);
  if (!session) return;
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
    updateSessionPhase(session);

    // Call the real Gemini SDK integration
    const llmOutput = await processTurn(session, parsedBody.data.text);

    // Update state based on LLM output
    const validActions = ['asked_question', 'probed', 'hinted', 'summarized'] as const;
    const action = validActions.includes(
      llmOutput.nextActionIndicator as (typeof validActions)[number],
    )
      ? (llmOutput.nextActionIndicator as BackendSessionState['lastAgentAction'])
      : 'asked_question';

    session.lastAgentAction = action;

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
        assessment: llmOutput.candidateAssessment,
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
    logger.error({ err: error }, 'Failed to process turn');
    return res.status(500).json({ error: 'Failed to process turn' });
  }
});

// POST /session/:id/turn/stream — streaming variant using SSE
app.post('/session/:id/turn/stream', turnLimiter, async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const parsed = APIContracts.TurnRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
  }

  const session = await requireSessionOwnership(req, res, sessionId);
  if (!session) return;
  if (session.status !== 'in_progress') {
    return res.status(400).json({ error: 'Session is not in progress' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx/Cloud Run buffering
  res.flushHeaders();

  // Append user message to trace immediately
  session.trace = session.trace || [];
  session.trace.push({
    id: generateId(),
    sessionId,
    timestamp: new Date().toISOString(),
    type: 'user_message',
    payload: { text: parsed.data.text },
  });

  // Detect client disconnection and abort the stream
  const clientController = new AbortController();
  req.on('close', () => {
    clientController.abort();
  });

  // Heartbeat: prevents Cloud Run / Nginx from closing the connection
  // during long LLM response times (Gemini can take 3–8 seconds for first token)
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 5000);

  try {
    session.turnCount += 1;
    updateSessionPhase(session);

    for await (const chunk of processTurnStream(
      session,
      parsed.data.text,
      clientController.signal,
    )) {
      if (chunk.type === 'token') {
        res.write(`data: ${JSON.stringify({ type: 'token', text: chunk.text })}\n\n`);
      } else if (chunk.type === 'done') {
        let extractedMessage = chunk.fullText;
        let extractedStatus: string | undefined = undefined;
        let extractedScore: number | undefined = undefined;
        let extractedAssessment: CandidateAssessment | undefined = undefined;

        let extractedNextAction: string | undefined = undefined;

        try {
          const parsedText = JSON.parse(chunk.fullText);
          if (parsedText.agentMessage) extractedMessage = parsedText.agentMessage;
          extractedStatus = parsedText.statusMetadata;
          extractedScore = parsedText.scoreHints;
          extractedAssessment = parsedText.candidateAssessment;
          extractedNextAction = parsedText.nextActionIndicator;
        } catch {
          const match = chunk.fullText.match(/"agentMessage"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          if (match) extractedMessage = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }

        // Append AI message to trace
        session.trace.push({
          id: generateId(),
          sessionId,
          timestamp: new Date().toISOString(),
          type: 'ai_message',
          payload: {
            text: extractedMessage,
            metadata: {
              status: extractedStatus,
              scoreHint: extractedScore,
            },
            assessment: extractedAssessment,
          },
          traceId: chunk.traceId,
        });

        // Persist lastAgentAction so the next turn sees it even via streaming path
        if (extractedNextAction) {
          const validActions = ['asked_question', 'probed', 'hinted', 'summarized'] as const;
          session.lastAgentAction = validActions.includes(
            extractedNextAction as (typeof validActions)[number],
          )
            ? (extractedNextAction as BackendSessionState['lastAgentAction'])
            : 'asked_question';
        }

        await saveSession(session);

        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            traceId: chunk.traceId,
            phase: session.interviewPhase,
            turnCount: session.turnCount,
            metadata: {
              nextActionIndicator: extractedNextAction || session.lastAgentAction || 'ask_question',
              statusMetadata: extractedStatus,
              assessment: extractedAssessment,
            },
          })}\n\n`,
        );
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', message: chunk.message })}\n\n`);
      }
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ sessionId, error: err }, 'Stream failed');
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`);
    }
  } finally {
    clearInterval(heartbeat);
    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

// Close a session
app.post('/session/:id/end', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = await requireSessionOwnership(req, res, sessionId);
  if (!session) return;

  // Idempotency: if already completed, return existing data without re-running evaluation
  if (session.status === 'completed') {
    logger.info({ sessionId: session.id }, 'Session already completed — returning existing state');
    return res.json({
      status: 'completed' as const,
      analysisSummary: session.evaluation?.summary ?? '',
      strategySummary: session.strategyUpdate?.whatToDoNextTime ?? '',
      traceId: session.evalTraceId ?? '',
    });
  }

  // Status guard: only in_progress sessions can be ended
  if (session.status !== 'in_progress') {
    return res.status(400).json({
      error: `Cannot end a session with status '${session.status}'. Only in_progress sessions can be ended.`,
    });
  }

  const parsedBody = APIContracts.EndSessionRequest.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: 'invalid request', details: parsedBody.error.format() });
  }

  session.status = 'completed';
  session.interviewPhase = 'closing';
  session.endedAt = new Date().toISOString();

  try {
    const evaluation = await generateEvaluation(session.trace || [], sessionId, {
      role: session.config.role,
      difficulty: session.config.difficulty,
      style: session.config.style,
      focusAreas: session.config.focusAreas,
    });

    // Introspection via MCP
    const evalScore = evaluation.rubric?.overall ?? evaluation.score ?? 0;
    const introspection = await runIntrospection(sessionId, evalScore);

    // Save new strategy version
    const newVersionId = `v${Date.now()}`;
    try {
      await saveStrategy(
        newVersionId,
        introspection.newRules ?? session.activeStrategyRules,
        session.userId,
      );
    } catch (strategyErr) {
      logger.error(
        { sessionId: session.id, newVersionId, err: strategyErr },
        '[end] saveStrategy failed — session evaluation will be saved without new strategy version',
      );
      // Continue — the session evaluation is more important than the strategy version
    }

    // Merge evaluation-suggested overrides with introspection-generated rules
    evaluation.strategyOverrides = [
      ...(evaluation.strategyOverrides || []),
      ...(introspection.newRules || []),
    ];

    // Save the evaluation and strategy update into session state
    session.evaluation = evaluation;
    session.strategyUpdate = {
      id: newVersionId,
      sessionId: session.id,
      whatFailed: introspection.whatFailed,
      whyItFailed: introspection.whyItFailed,
      whatToDoNextTime: introspection.whatToDoNextTime,
      whatToAvoidNextTime: introspection.whatToAvoidNextTime,
      newRules: introspection.newRules,
      updatedAt: new Date().toISOString(),
    };
    session.strategyVersion = newVersionId;
    session.activeStrategyRules = introspection.newRules;

    session.evalTraceId = evaluation.traceId;

    try {
      await saveSession(session);
    } catch (sessionErr) {
      logger.error(
        {
          sessionId: session.id,
          newVersionId,
          err: sessionErr,
        },
        '[end] saveSession failed after saveStrategy succeeded. Rolling back strategy version.',
      );
      // Compensating logic: rollback the strategy if session save fails
      try {
        await deleteStrategy(newVersionId);
      } catch (rollbackErr) {
        logger.error(
          { err: rollbackErr, newVersionId },
          '[end] Failed to rollback orphaned strategy. Needs manual cleanup.',
        );
      }

      // Re-throw so the client gets a 500 and can retry
      throw sessionErr;
    }

    const responsePayload = {
      status: 'completed' as const,
      analysisSummary: evaluation.summary,
      strategySummary: introspection.whatFailed,
      traceId: evaluation.traceId,
    };

    const parsedRes = APIContracts.EndSessionResponse.safeParse(responsePayload);
    if (!parsedRes.success) {
      return res
        .status(500)
        .json({ error: 'contract mismatch', details: parsedRes.error.format() });
    }

    return res.json(responsePayload);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to generate evaluation');
    return res.status(500).json({ error: 'Failed to generate evaluation' });
  }
});

// Generate Study Plan
app.post('/session/:id/study-plan', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  try {
    const session = await requireSessionOwnership(req, res, sessionId);
    if (!session) return;

    if (!session.evaluation) {
      return res.status(400).json({ error: 'Cannot generate study plan without evaluation' });
    }

    const planMarkdown = await generateStudyPlan(session);

    // Store it in the session evaluation
    session.evaluation.studyPlan = {
      contentMarkdown: planMarkdown,
      generatedAt: new Date().toISOString(),
    };

    await saveSession(session);

    return res.json({ studyPlan: session.evaluation.studyPlan });
  } catch (error: unknown) {
    logger.error({ err: error, sessionId }, 'Failed to generate study plan');
    return res.status(500).json({ error: 'Failed to generate study plan' });
  }
});

// Fetch all history sessions
app.get('/sessions', async (req: Request, res: Response) => {
  const userId = await extractUserId(req);
  if (!userId) {
    return res.status(400).json({ error: 'Missing user identity. Send X-User-Id header.' });
  }
  try {
    const history = await getHistorySessions(userId);
    return res.json({ sessions: history });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to fetch history');
    return res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /strategy/latest
app.get('/strategy/latest', async (req: Request, res: Response) => {
  const userId = await extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required. Send X-User-Id header.' });
  }
  const strategy = await getLatestStrategy(userId ?? undefined);
  res.json({
    version: strategy?.version || 'v0',
    rules: strategy?.rules || [],
    rulesCount: strategy?.rules?.length || 0,
  });
});

// GET /strategy/evolution
app.get('/strategy/evolution', async (req: Request, res: Response) => {
  const userId = await extractUserId(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const history = await getHistorySessions(userId);
    // Filter sessions that actually produced a strategy update
    const evolution = history
      .filter((s) => s.strategyUpdate && s.strategyUpdate.newRules)
      .map((s) => ({
        sessionId: s.id,
        endedAt: s.endedAt,
        whatFailed: s.strategyUpdate!.whatFailed,
        newRules: s.strategyUpdate!.newRules,
        strategyVersion: s.strategyVersion, // This is the version the session was evaluating, the output is technically version + 1
        overallScore: s.evaluation?.rubric?.overall ?? s.evaluation?.score ?? 0,
      }))
      .sort((a, b) => new Date(a.endedAt!).getTime() - new Date(b.endedAt!).getTime());

    res.json({ evolution });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to fetch strategy evolution');
    return res.status(500).json({ error: 'Failed to fetch strategy evolution' });
  }
});

// GET /session/:id/trace-spans (Phoenix GraphQL Proxy)
app.get('/session/:id/trace-spans', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = await requireSessionOwnership(req, res, sessionId);
  if (!session) return;

  try {
    const collectorUrl =
      process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006/v1/traces';
    const phoenixBase = collectorUrl.replace('/v1/traces', '');
    const graphqlUrl = `${phoenixBase}/graphql`;

    // Attempt to query Phoenix GraphQL for spans matching this session
    // We search for spans where the session ID might be tracked, or just return the latest traces for the project
    const query = `
      query GetSpans {
        spans(first: 50, condition: { spanKind: SERVER }) {
          edges {
            node {
              id
              name
              startTime
              endTime
              latencyMs
              attributes
              statusMessage
            }
          }
        }
      }
    `;

    const fetchRes = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.PHOENIX_API_KEY ? { api_key: process.env.PHOENIX_API_KEY } : {}),
      },
      body: JSON.stringify({ query }),
    });

    if (fetchRes.ok) {
      const data = await fetchRes.json();
      return res.json({
        spans: data.data?.spans?.edges?.map((e: { node: unknown }) => e.node) || [],
        source: 'phoenix',
      });
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to fetch spans from Phoenix, falling back to local trace');
  }

  // Fallback: Synthesize spans from local session.trace
  const synthesizedSpans = (session.trace || []).map(
    (t: { id?: string; traceId?: string; type?: string; timestamp?: string }) => ({
      id: t.id || t.traceId || Math.random().toString(),
      name: t.type === 'ai_message' ? 'LLM_GENERATE' : 'USER_INPUT',
      startTime: t.timestamp || new Date().toISOString(),
      endTime: t.timestamp || new Date().toISOString(),
      latencyMs: t.type === 'ai_message' ? 1200 + Math.random() * 800 : 0, // Simulated latency
      attributes: JSON.stringify({
        'llm.model': 'gemini-2.5-flash',
        'llm.token_count.total': Math.floor(Math.random() * 500) + 100,
      }),
      statusMessage: 'OK',
    }),
  );

  return res.json({ spans: synthesizedSpans, source: 'fallback' });
});

// Compare session to previous
app.get('/session/:id/compare', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = await requireSessionOwnership(req, res, sessionId);
  if (!session) return;

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

// ── 404 catch-all ─────────────────────────────────────────────
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ───────────────────────────────────────
// Catches unhandled errors from route handlers.
// Returns JSON instead of Express's default HTML error page which leaks stack traces.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const isOperational = err instanceof Error && (err as any).isOperational === true;

  logger.error({ err }, '[global] Unhandled error in route handler');

  if (res.headersSent) return; // cannot send error if response already started (e.g., SSE)

  res.status(500).json({
    error: 'Internal server error',
    // Only include message in development — never leak stack traces to clients
    ...(process.env.NODE_ENV === 'development' ? { detail: message } : {}),
  });
});

// Export app for supertest integration tests
export { app };

const PORT = process.env.PORT || 8000;
if (require.main === module) {
  const server = app.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`);
  });

  // Graceful shutdown for containerized deployments
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
    // Force shutdown after 10 seconds if connections aren't drained
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
