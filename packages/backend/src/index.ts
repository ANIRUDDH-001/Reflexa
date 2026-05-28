import { APIContracts } from '@reflexa/shared';
import cors from 'cors';
import express, { Request, Response } from 'express';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  const payload = { status: 'ok', ts: new Date().toISOString() };
  const parsed = APIContracts.HealthResponse.safeParse(payload);
  if (!parsed.success)
    return res.status(500).json({ error: 'contract mismatch', details: parsed.error.format() });
  return res.json(payload);
});

app.listen(4000);
