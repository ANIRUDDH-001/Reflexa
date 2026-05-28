import { APIContracts, InterviewSession } from '@reflexa/shared';
import cors from 'cors';
import express, { Request, Response } from 'express';

const generateId = () => Math.random().toString(36).substring(2, 11);

const app = express();
app.use(cors());
app.use(express.json());

// In-memory state store for Subphase 4.1 skeleton
const sessions = new Map<string, InterviewSession>();

app.get('/health', (_req: Request, res: Response) => {
  const payload = { status: 'ok' as const, ts: new Date().toISOString() };
  const parsed = APIContracts.HealthResponse.safeParse(payload);
  if (!parsed.success) {
    return res.status(500).json({ error: 'contract mismatch', details: parsed.error.format() });
  }
  return res.json(payload);
});

// Start a new session
app.post('/session', (req: Request, res: Response) => {
  const parsedBody = APIContracts.CreateSessionRequest.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: 'invalid request', details: parsedBody.error.format() });
  }

  const sessionId = generateId();
  const newSession: InterviewSession = {
    id: sessionId,
    userId: parsedBody.data.userId,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    trace: [
      {
        id: generateId(),
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'ai_message',
        payload: {
          text: "Hello! I'll be acting as your engineering manager for this System Design interview. Today we're going to design a distributed rate limiter. Are you ready to begin?",
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
app.post('/session/:id/turn', (req: Request, res: Response) => {
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

  // Generate mock next question from AI
  const mockFollowUps = [
    "That's a solid starting point. What specific data structures would you use for the token bucket algorithm?",
    'Interesting approach. How would you handle race conditions in a concurrent environment?',
    'Can you clarify how your solution scales across multiple regional data centers?',
  ];
  const randomResponse = mockFollowUps[Math.floor(Math.random() * mockFollowUps.length)];

  session.trace.push({
    id: generateId(),
    sessionId,
    timestamp: new Date().toISOString(),
    type: 'ai_message',
    payload: { text: randomResponse },
  });

  const responsePayload = { text: randomResponse };
  const parsedRes = APIContracts.TurnResponse.safeParse(responsePayload);
  if (!parsedRes.success) {
    return res.status(500).json({ error: 'contract mismatch', details: parsedRes.error.format() });
  }

  return res.json(responsePayload);
});

// Close a session
app.post('/session/:id/end', (req: Request, res: Response) => {
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
  session.endedAt = new Date().toISOString();

  const responsePayload = {
    status: 'completed' as const,
    analysisSummary: 'Mock analysis summary generated for the session.',
  };

  const parsedRes = APIContracts.EndSessionResponse.safeParse(responsePayload);
  if (!parsedRes.success) {
    return res.status(500).json({ error: 'contract mismatch', details: parsedRes.error.format() });
  }

  return res.json(responsePayload);
});

app.listen(4000);
