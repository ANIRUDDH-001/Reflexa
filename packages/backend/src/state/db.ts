import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { BackendSessionState } from './types';

// Ensure db directory exists
const dbDir = path.join(__dirname, '../../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'reflexa.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    userId TEXT,
    status TEXT,
    interviewPhase TEXT,
    startedAt TEXT,
    endedAt TEXT,
    config TEXT,
    trace TEXT,
    evaluation TEXT,
    evalTraceId TEXT,
    strategyVersion TEXT,
    strategyUpdate TEXT,
    turnCount INTEGER,
    activeStrategyRules TEXT
  );

  CREATE TABLE IF NOT EXISTS strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE,
    rules TEXT,
    createdAt TEXT
  );
`);

// 1. Strategies
export function getLatestStrategy(): { version: string; rules: string[] } | null {
  const row = db
    .prepare('SELECT version, rules FROM strategies ORDER BY id DESC LIMIT 1')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .get() as any;
  if (!row) return null;
  return {
    version: row.version,
    rules: JSON.parse(row.rules),
  };
}

export function saveStrategy(version: string, rules: string[]) {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO strategies (version, rules, createdAt) VALUES (?, ?, ?)',
  );
  stmt.run(version, JSON.stringify(rules), new Date().toISOString());
}

// 2. Sessions
export function getSession(id: string): BackendSessionState | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
  if (!row) return null;

  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    interviewPhase: row.interviewPhase,
    startedAt: row.startedAt,
    endedAt: row.endedAt || undefined,
    config: JSON.parse(row.config),
    trace: JSON.parse(row.trace),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evaluation: row.evaluation ? JSON.parse(row.evaluation) : undefined,
    evalTraceId: row.evalTraceId || undefined,
    strategyVersion: row.strategyVersion,
    strategyUpdate: row.strategyUpdate ? JSON.parse(row.strategyUpdate) : undefined,
    turnCount: row.turnCount,
    activeStrategyRules: row.activeStrategyRules ? JSON.parse(row.activeStrategyRules) : undefined,
    lastAgentAction: null,
  } as BackendSessionState;
}

export function saveSession(session: BackendSessionState) {
  const stmt = db.prepare(`
    INSERT INTO sessions (
      id, userId, status, interviewPhase, startedAt, endedAt, config, trace,
      evaluation, evalTraceId, strategyVersion, strategyUpdate, turnCount, activeStrategyRules
    ) VALUES (
      @id, @userId, @status, @interviewPhase, @startedAt, @endedAt, @config, @trace,
      @evaluation, @evalTraceId, @strategyVersion, @strategyUpdate, @turnCount, @activeStrategyRules
    )
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      interviewPhase = excluded.interviewPhase,
      strategyVersion = excluded.strategyVersion,
      endedAt = excluded.endedAt,
      trace = excluded.trace,
      evaluation = excluded.evaluation,
      evalTraceId = excluded.evalTraceId,
      strategyUpdate = excluded.strategyUpdate,
      turnCount = excluded.turnCount,
      activeStrategyRules = excluded.activeStrategyRules
  `);

  stmt.run({
    id: session.id,
    userId: session.userId,
    status: session.status,
    interviewPhase: session.interviewPhase,
    startedAt: session.startedAt,
    endedAt: session.endedAt || null,
    config: JSON.stringify(session.config),
    trace: JSON.stringify(session.trace || []),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evaluation: (session as any).evaluation ? JSON.stringify((session as any).evaluation) : null,
    evalTraceId: session.evalTraceId || null,
    strategyVersion: session.strategyVersion,
    strategyUpdate: session.strategyUpdate ? JSON.stringify(session.strategyUpdate) : null,
    turnCount: session.turnCount,
    activeStrategyRules: session.activeStrategyRules
      ? JSON.stringify(session.activeStrategyRules)
      : null,
  });
}

export function getHistorySessions(userId: string) {
  const rows = db
    .prepare(
      'SELECT id, status, startedAt, config, evaluation FROM sessions WHERE userId = ? ORDER BY startedAt DESC',
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .all(userId) as any[];
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    startedAt: r.startedAt,
    config: JSON.parse(r.config),
    evaluation: r.evaluation ? JSON.parse(r.evaluation) : undefined,
  }));
}
