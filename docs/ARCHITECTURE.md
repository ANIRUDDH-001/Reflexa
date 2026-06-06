# Reflexa Architecture

## Self-Improvement Loop

```
Session End
  ↓
generateEvaluation()        [Gemini 2.5 Pro — EVALUATOR span]
  ↓
runIntrospection()          [Gemini 2.5 Flash — AGENT span]
  ├── query_project_traces  [Phoenix MCP tool — TOOL span]
  ├── get_trace             [Phoenix MCP tool — TOOL span]
  └── Returns: {whatFailed, newRules[]}
  ↓
saveStrategy()              [Supabase PostgreSQL]
  ↓
Next Session                → new rules injected into system prompt
```

## Observability Pipeline

All AI calls are instrumented with OpenInference semantic conventions and exported to
Arize Phoenix Cloud via OTLP. The Phoenix MCP server gives the agent runtime access to
its own trace history for self-introspection.
