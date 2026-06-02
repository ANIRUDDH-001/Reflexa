# Supabase Setup

## Apply the Schema

**Option A — Supabase Dashboard (easiest):**

1. Go to your Supabase project → SQL Editor
2. Click "New query"
3. Paste the contents of `schema.sql`
4. Click "Run"

**Option B — psql CLI:**

```bash
psql "$SUPABASE_URL" \
  --username postgres \
  -f supabase/schema.sql
```

## Verify Tables Were Created

In the Supabase Dashboard → Table Editor, confirm you can see:

- `sessions` table with all columns
- `strategies` table

## Seed Data (optional)

To add sample sessions for development:

```bash
cd packages/backend
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node src/seed.ts
```
