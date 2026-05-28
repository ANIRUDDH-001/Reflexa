# Reflexa — Self-Improving Technical Interview Intelligence

Tagline: Reflexa — Self-Improving Technical Interview Intelligence

## Overview

Reflexa is an intelligent platform designed to help engineers prepare for technical interviews by continuously learning from interactions and improving its feedback and question generation. Reflexa combines automated interview simulations, adaptive feedback loops, and analytics to help users grow stronger, faster.

## Project layout (Phase 0)

- `packages/shared` — Zod schemas and shared TypeScript types (single source-of-truth for contracts).
- `packages/backend` — Minimal Express + TypeScript backend with a `/health` endpoint.
- `packages/frontend` — Minimal Vite-fed landing page that pings the backend health endpoint.
- `docs/CONTRACTS.md` — Human-readable summary of API contracts.

## Getting started (local, Phase 0)

1. Install dependencies at the repo root (npm, yarn, or pnpm workspaces supported):

```powershell
npm install
```

2. Run dev (starts backend and frontend concurrently):

```powershell
npm run dev
```

## Env templates

- `packages/backend/.env.example`
- `packages/frontend/.env.example`

## Next steps

This Phase 0 scaffold provides a working foundation: shared typed schemas, API contracts, linting and formatting configs, and minimal frontend/backend wiring. From here we can:

- Expand the shared schemas and freeze the contract.
- Add CI for lint/typecheck.
- Add authentication and persistence for sessions.

## License

Specify your license here.
