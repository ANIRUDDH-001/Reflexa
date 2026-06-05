<p align="center">
  <h1 align="center">Reflexa</h1>
  <p align="center"><strong>Self-Improving Technical Interview Intelligence</strong></p>
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#demo-walkthrough">Demo</a> •
  <a href="#testing">Testing</a> •
  <a href="#license">License</a>
</p>

---

Reflexa is an AI-powered interview preparation platform that continuously learns from every session to deliver sharper questions, more targeted feedback, and measurable improvement over time. It combines a Gemini-backed interview engine with an introspection agent that identifies failure patterns and rewrites its own strategy rules—so each session is smarter than the last.

## Architecture

Reflexa is a monorepo with three packages:

| Package             | Role                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/backend`  | Express 5 + TypeScript API server. Supabase PostgreSQL persistence via `@supabase/supabase-js`. |
| `packages/frontend` | Vanilla TypeScript SPA (Vite). Interview UI, analysis dashboard, session history.               |
| `packages/shared`   | Shared Zod schemas and API contracts used by both packages.                                     |

### Data Stores

| Store                     | Purpose                                                                       |
| ------------------------- | ----------------------------------------------------------------------------- |
| **Supabase (PostgreSQL)** | Session state, evaluation results, strategy history                           |
| **Arize Phoenix Cloud**   | OpenTelemetry traces, LLM evaluation spans, MCP-accessible observability data |

### External Services

| Service             | Used for                                                    |
| ------------------- | ----------------------------------------------------------- |
| Google Gemini API   | Interview AI turns, evaluation scoring, introspection agent |
| Arize Phoenix Cloud | Trace ingestion, MCP server for self-reflection             |

## Tech Stack

| Layer         | Technology                             |
| ------------- | -------------------------------------- |
| AI            | Google Gemini 2.5 Pro + Flash          |
| Observability | Arize Phoenix Cloud                    |
| Database      | Supabase PostgreSQL                    |
| Auth          | Supabase OAuth (Google)                |
| Frontend      | Vanilla TypeScript, Vite               |
| Deployment    | Cloud Run (backend), Vercel (frontend) |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Arize Phoenix Cloud](https://app.phoenix.arize.com) account (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key

### 1. Clone and install

```bash
git clone https://github.com/your-org/reflexa
cd reflexa
pnpm install
```

### 2. Set up Supabase

Run the schema migration against your Supabase project:

```bash
# Apply the schema (see supabase/schema.sql)
psql "$SUPABASE_URL" -f supabase/schema.sql
# OR use the Supabase dashboard SQL editor to paste and run schema.sql
```

### 3. Configure environment variables

```bash
cp .env.example packages/backend/.env
# Edit packages/backend/.env and fill in all required values
```

See `.env.example` for descriptions of each variable.

### 4. Seed Demo Data

The demo walkthrough requires pre-seeded sessions to demonstrate the improvement arc.
Run the seeder after your backend is connected to Supabase:

```bash
cd packages/backend
pnpm run seed
```

This creates:

- A **baseline session** (42% overall score) showing shallow answers and missed follow-ups
- An **improved session** (71% overall score) showing the same candidate after strategy updates
- The strategy evolution entries that connect them

> Re-run `pnpm run seed` any time you want to reset to a clean demo state.

### 5. Run in development

```bash
# Terminal 1 — backend
cd packages/backend && pnpm dev

# Terminal 2 — frontend
cd packages/frontend && pnpm dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:8000

### 6. Run tests

```bash
pnpm test
```

## Demo Walkthrough

1. Sign in with Google (OAuth via Supabase)
2. **Dashboard** — shows seeded baseline session at 42% overall score
3. **Start a new session** — role: Senior Backend Engineer, difficulty: Hard
4. Complete 5–6 turns of interview
5. **End session** — triggers evaluation + introspection + strategy update
6. **Analysis page** — view rubric scores, study plan, and trace spans in Phoenix
7. **Strategy page** — evolution timeline shows rules generated from the weak session
8. **Start another session** — the new rules are injected into the system prompt
9. Complete the session — higher scores reflect strategy improvement

## Testing

```bash
# Run the full test suite
pnpm test

# TypeScript type checking
pnpm run typecheck

# Lint with ESLint
pnpm run lint
```

## Project Structure

```
reflexa/
├── packages/
│   ├── shared/                  # @reflexa/shared
│   │   └── src/
│   │       ├── index.ts         # Package entry point
│   │       ├── schemas.ts       # Zod schemas (Session, Rubric, etc.)
│   │       └── contracts.ts     # API contract definitions
│   ├── backend/                 # @reflexa/backend
│   │   └── src/
│   │       ├── index.ts         # Express server, routes, interview engine
│   │       ├── seed.ts          # Demo data seeder
│   │       ├── telemetry.ts     # OpenTelemetry setup
│   │       ├── engine/          # Interview & introspection agents
│   │       ├── state/           # Supabase persistence layer
│   └── frontend/                # @reflexa/frontend
│       └── src/
│           ├── main.ts          # App bootstrap
│           ├── shell.ts         # Application shell & layout
│           ├── router.ts        # Client-side routing
│           ├── api.ts           # Backend API client
│           ├── styles.css       # Global styles
│           ├── components/      # Reusable UI components
│           └── views/           # Page-level views
├── docs/                        # Documentation
│   └── CONTRACTS.md             # Human-readable API contracts
├── prompts/                     # LLM prompt templates
├── pnpm-workspace.yaml          # Workspace configuration
├── tsconfig.base.json           # Shared TypeScript config
├── vitest.config.ts             # Test configuration
└── package.json                 # Root scripts & devDependencies
```

## License

MIT
