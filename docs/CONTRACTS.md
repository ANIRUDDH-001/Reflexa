# Reflexa API Contracts (Phase 0)

This document is a human-friendly summary of the contract definitions in `packages/shared/src/contracts.ts`.

- GET /health -> { status: 'ok', ts: string }
- POST /sessions -> Create session (payload: CreateSessionRequest) -> CreateSessionResponse
- GET /sessions/:id -> GetSessionResponse
- POST /sessions/:id/answers -> SubmitAnswerRequest -> SubmitAnswerResponse

Schemas are defined as Zod objects in `@reflexa/shared` and act as the source of truth for both frontend and backend.
