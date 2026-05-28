# zip-pwa-factory

Cinematic prompt pipeline builder — Vite + React SPA backed by Supabase Auth, Postgres, and edge functions.

## Local development

```bash
npm install
cp .env.example .env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env
npm run dev
```

Dev server runs on [http://localhost:8080](http://localhost:8080).

## Environment variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Client (`.env` / Vercel) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Client (`.env` / Vercel) | Supabase anon/public key |
| `LOVABLE_API_KEY` | Supabase edge function secret | Lovable AI gateway key |

Never commit `.env`. Use [`.env.example`](.env.example) as a template.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build → `dist/` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest smoke tests |
| `npm run verify` | lint → test → build (pre-deploy gate) |

## Supabase setup

Project ref: `bovledrqzuwegliltojr`

### Database migrations

```bash
supabase link --project-ref bovledrqzuwegliltojr
supabase db push
```

### Edge functions

```bash
supabase secrets set LOVABLE_API_KEY=your-key
supabase functions deploy generate-pipeline
supabase functions deploy execute-pipeline
```

Functions:
- `generate-pipeline` — creates a pipeline from a user prompt (called from `/`)
- `execute-pipeline` — runs pipeline steps with AI (called from `/pipeline/:id`)

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
  → Lovable AI Gateway
  → Supabase Postgres (pipelines, executions)
```
