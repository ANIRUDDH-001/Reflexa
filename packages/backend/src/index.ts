import { APIContracts } from '@reflexa/shared';
import cors from 'cors';
import express, { Request, Response } from 'express';
import 'dotenv/config';
import { processTurn, generateEvaluation } from './engine/llm';
import { BackendSessionState } from './state/types';

const generateId = () => Math.random().toString(36).substring(2, 11);

const app = express();
app.use(cors());
app.use(express.json());

// In-memory state store
const sessions = new Map<string, BackendSessionState>();

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
  const config = parsedBody.data.config || {
    role: null,
    difficulty: null,
    style: null,
    timeLimit: null,
    focusAreas: [],
  };

  const newSession: BackendSessionState = {
    id: sessionId,
    userId: parsedBody.data.userId,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    interviewPhase: 'intro',
    lastAgentAction: null,
    strategyVersion: 'v1.0.0',
    turnCount: 0,
    config,
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

  sessions.set(sessionId, newSession);

  const responsePayload = { session: newSession };
  const parsedRes = APIContracts.CreateSessionResponse.safeParse(responsePayload);
  if (!parsedRes.success) {
    return res.status(500).json({ error: 'contract mismatch', details: parsedRes.error.format() });
  }

  return res.status(201).json(responsePayload);
});

// Fetch current session state
app.get('/session/:id', (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = sessions.get(sessionId);

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
app.post('/session/:id/turn', async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const session = sessions.get(sessionId);

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

    session.trace.push({
      id: generateId(),
      sessionId,
      timestamp: new Date().toISOString(),
      type: 'ai_message',
      payload: {
        text: llmOutput.agentMessage,
        metadata: {
          status: llmOutput.statusMetadata,
          scoreHint: llmOutput.scoreHints,
        },
      },
    });

    const responsePayload = { text: llmOutput.agentMessage };
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
  const session = sessions.get(sessionId);

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
    const evaluation = await generateEvaluation(session.trace || []);
    // Save the evaluation in the session state so GET /session/:id returns it
    (session as unknown as { evaluation: unknown }).evaluation = evaluation;

    const responsePayload = {
      status: 'completed' as const,
      analysisSummary: evaluation.summary,
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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  // Server started
});
