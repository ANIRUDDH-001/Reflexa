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

| Package             | Role                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/backend`  | Express + TypeScript API server. Hosts the Gemini-powered interview engine, Phoenix observability instrumentation, MCP client, and Supabase persistence layer. |
| `packages/frontend` | Vanilla TypeScript SPA (Vite). Interview UI, analysis dashboard, session history.                                                                              |
| `packages/shared`   | Shared Zod schemas and API contracts used by both packages.                                                                                                    |

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

- **Runtime:** Node.js 22, TypeScript
- **API server:** Express 5, Zod validation, Pino logging
- **AI:** Google Gemini 2.5 Pro (`@google/genai`), OpenInference instrumentation
- **Observability:** Arize Phoenix Cloud (OpenTelemetry traces + MCP server)
- **Database:** Supabase PostgreSQL (`@supabase/supabase-js`)
- **Frontend:** Vanilla TypeScript, Vite, Tailwind CSS
- **Testing:** Vitest, Supertest
- **Package manager:** pnpm workspaces

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

### 4. Run in development

```bash
# Terminal 1 — backend
cd packages/backend && pnpm dev

# Terminal 2 — frontend
cd packages/frontend && pnpm dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:8000

### 5. Run tests

```bash
pnpm test
```

## Demo Walkthrough

Follow these five steps to see Reflexa's self-improvement loop in action:

### 1. 📋 Explore the Baseline

Open **History** to see the weak baseline session with a score of **42%**. This is the starting point — an interview where the agent used its default, untuned strategy.

### 2. 🔍 Inspect the Rubric

Click **Review** on the baseline session. You'll see the full rubric breakdown and **3 distinct failure patterns** the evaluation agent identified (e.g., missed edge cases, shallow follow-ups, vague scoring criteria).

### 3. 🧠 Read the Introspection Report

Navigate to the **Introspection Agent Report**. This is where Reflexa analyzed _what_ failed, _why_ it failed, and _what concrete changes_ to make. The agent auto-generates new strategy rules to address each weakness.

### 4. 📊 Compare Improvements

Click **Compare Previous** on the improved session (score: **71%**). See the **+29-point overall improvement** side-by-side, with per-rubric deltas showing exactly which areas recovered.

### 5. 🚀 Start a New Session

Launch a new interview session. The agent now incorporates the learned strategy rules — notice sharper questions, more targeted follow-ups, and stricter evaluation criteria.

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
│   │       └── state/           # SQLite persistence layer
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
