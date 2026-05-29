# Silk Road Pipeline

Cinematic prompt pipeline builder — Vite + React SPA backed by Supabase Auth, Postgres, and edge functions.

## Local development (Docker database)

The app uses **Supabase** (Postgres + Auth + Realtime). For local dev, run the full stack in Docker:

```bash
npm install
npm run db:start          # Postgres + Auth + Studio in Docker
npm run db:env:local      # writes .env.local (do NOT use `npm run db:env > .env.local`)
cp supabase/.env.example supabase/.env.local   # add MISTRAL_API_KEY
npm run dev
```

In a second terminal:

```bash
npm run db:functions      # edge functions (generate-pipeline, execute-pipeline)
```

| Service | URL |
|---------|-----|
| App | http://localhost:8080 |
| Supabase Studio | http://127.0.0.1:54323 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Mailpit (auth emails) | http://127.0.0.1:54324 |

Migrations in [`supabase/migrations/`](supabase/migrations/) apply automatically on `db:start`. Tables: `pipelines`, `executions`, `profiles`, `user_roles`.

Database scripts:

| Command | Purpose |
|---------|---------|
| `npm run db:start` | Start Docker Supabase stack |
| `npm run db:stop` | Stop containers |
| `npm run db:status` | Show URLs and keys |
| `npm run db:reset` | Reset DB and re-apply migrations |
| `npm run db:env` | Print Vite env lines to stdout |
| `npm run db:env:local` | Write `.env.local` safely (no npm redirect) |

### Cloud fallback (no Docker)

Use cloud Supabase — copy keys into `.env` from [`.env.example`](.env.example).

## Environment variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Client (`.env` / Vercel) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client (`.env` / Vercel) | Supabase anon/public key |
| `MISTRAL_API_KEY` | `supabase/.env.local` / Supabase secrets | Mistral API key (required for `AI_PROVIDER=mistral`) |
| `MISTRAL_MODEL` | Edge function env | Model id (default: `mistral-small-latest`) |
| `AI_PROVIDER` | Edge function env | `mistral` (default) or `mock` for CI/smoke |

Never commit `.env` or `supabase/.env.local`. Use [`.env.example`](.env.example) and [`supabase/.env.example`](supabase/.env.example) as templates.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build → `dist/` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run verify` | lint → test → build (pre-deploy gate) |
| `npm run verify:full` | verify + smoke:pipeline (mock AI, requires local Supabase) |
| `npm run smoke:pipeline` | Integration smoke: auth → generate → DB → execute |
| `npm run db:start` | Start local Supabase (Docker) |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:status` | Local Supabase URLs and keys |
| `npm run db:reset` | Reset local DB + migrations |
| `npm run db:env` | Print Vite env for `.env.local` |
| `npm run db:functions` | Serve edge functions locally |
| `npm run db:functions:mock` | Serve edge functions with `AI_PROVIDER=mock` (smoke/CI) |

## Supabase setup

Project ref: `bovledrqzuwegliltojr`

### Database migrations

```bash
supabase link --project-ref bovledrqzuwegliltojr
supabase db push
```

### Edge functions

```bash
supabase secrets set MISTRAL_API_KEY=your-key
supabase secrets set MISTRAL_MODEL=mistral-small-latest
supabase secrets set AI_PROVIDER=mistral
supabase functions deploy generate-pipeline
supabase functions deploy execute-pipeline
```

Functions:
- `generate-pipeline` — creates a pipeline from a user prompt (called from `/`)
- `execute-pipeline` — runs pipeline steps with AI (called from `/pipeline/:id`)

Shared AI layer: [`supabase/functions/_shared/`](supabase/functions/_shared/) — Mistral API or deterministic mock (`AI_PROVIDER=mock`).

### Auth URLs

In Supabase → Authentication → URL Configuration:

- **Site URL:** your production Vercel URL (e.g. `https://zip-pwa-factory.vercel.app`)
- **Redirect URLs:** same origin + `/auth` if needed

If using Google OAuth (Lovable cloud auth), ensure redirect URIs include the production domain.

## Vercel deployment

1. Import repo `EB-EU-s-r-o/zip-pwa-factory` into Vercel.
2. Framework preset: **Vite**
3. Build command: `npm run build` (also in [`vercel.json`](vercel.json))
4. Output directory: `dist`
5. Set environment variables for **Production** and **Preview**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. Deploy, then add the Vercel URL to Supabase Auth redirect allowlist.

[`vercel.json`](vercel.json) includes SPA rewrites so React Router routes (`/pipeline/:id`) work on refresh.

## Pre-deploy verification

```bash
npm run verify
```

Full integration (local Supabase + edge functions with mock AI):

```bash
npm run db:functions:mock   # terminal 1
npm run verify:full         # terminal 2 (lint + test + build + smoke)
```

## Manual E2E checklist

| # | Steps | Expected |
|---|-------|----------|
| 1 | `npm run db:start` → `db:env:local` → `db:functions` | Studio :54323, functions on :54321 |
| 2 | `MISTRAL_API_KEY` in `supabase/.env.local` | — |
| 3 | `/auth` email signup → Mailpit :54324 | signed-in user |
| 4 | `/` prompt → Generate | Network 200, redirect `/pipeline/{id}` |
| 5 | Studio → `pipelines` table | new row with your `owner_id` |
| 6 | Builder → initial input → Run | Logs tab, Realtime updates |
| 7 | Studio → `executions` table | `status=completed`, logs JSONB |

## Automated smoke test

```bash
# Terminal 1: Supabase + functions (mock AI — no Mistral key)
npm run db:start
npm run db:functions:mock

# Terminal 2
npm run smoke:pipeline
```

Committed mock env: [`supabase/env.smoke`](supabase/env.smoke) (`AI_PROVIDER=mock`).

Optional env for smoke script:

| Variable | Default |
|----------|---------|
| `SMOKE_EMAIL` | `smoke-test@example.com` |
| `SMOKE_PASSWORD` | `smoke-test-pass-123` |
| `SMOKE_QUERY` | `Summarize feedback into action items` |

## Production smoke test

1. Open `/auth` → sign in (email or Google).
2. On `/`, enter a short prompt → **Generate**.
3. Network: `generate-pipeline` returns 200 with `id`.
4. Redirect to `/pipeline/{id}` — Builder loads the pipeline.
5. Run execution — `execute-pipeline` streams logs via Supabase Realtime.
6. Console: no CSP/CORS errors, no localhost calls.

## Architecture

```
Browser (Vercel SPA)
  → Supabase Auth
  → generate-pipeline / execute-pipeline (edge functions)
  → Mistral API (or mock for CI)
  → Supabase Postgres (pipelines, executions)
```
