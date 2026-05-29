## Current verify / smoke status

| Command | Status | Notes |
|---------|--------|-------|
| `npm run verify` | **PASS** | Lint passes (0 errors, 8 warnings), tests pass, build passes |
| `npm run test` | **PASS** | 14 tests / 7 files |
| `npm run build` | **PASS** | Builds successfully |
| `npm run smoke:pipeline` | **PASS** | Local Supabase on `:54321`; auth → generate → DB → execute → completed |
| `npm run verify:full` | **PASS** | Smoke test after verify passes |

Vercel uses `buildCommand: "npm run build"` in `/Users/erikbabcan/zip-pwa-factory/vercel.json`. There is no GitHub Actions CI.

---

## Prioritized concrete fixes

### P0 — Lint errors blocking `npm run verify` (7 errors)

✅ **COMPLETED**: Lint errors have been fixed. `npm run verify` now passes successfully (0 errors, 8 warnings).

---

### P1 — Missing production env / config

**Client (Vercel)** — documented in `/Users/erikbabcan/zip-pwa-factory/.env.example` and README, but empty:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Edge functions (Supabase secrets)** — `/Users/erikbabcan/zip-pwa-factory/supabase/.env.example`:

- `MISTRAL_API_KEY` (required when `AI_PROVIDER=mistral`)
- `MISTRAL_MODEL` (default `mistral-small-latest`)
- `AI_PROVIDER` (`mistral` or `mock`)

**Not yet wired for production:**

1. ~~**No runtime guard** in `/Users/erikbabcan/zip-pwa-factory/src/integrations/supabase/client.ts`~~ *(✅ DONE: runtime guards are implemented)*
2. ~~**No typed env** in `/Users/erikbabcan/zip-pwa-factory/src/vite-env.d.ts`~~ *(✅ DONE: typed env is present)*
3. **Cloud deploy steps** (README § Supabase/Vercel) must be done manually:
   - `supabase db push` (project `bovledrqzuwegliltojr`)
   - `supabase secrets set …` + `supabase functions deploy generate-pipeline execute-pipeline`
   - Supabase Auth → Site URL + redirect allowlist for production domain
4. **Vercel build skips verify** — no pre-deploy lint/test gate in `/Users/erikbabcan/zip-pwa-factory/vercel.json`.

---

### P2 — `Builder.tsx` execution / Realtime gaps

File: `/Users/erikbabcan/zip-pwa-factory/src/pages/Builder.tsx`

**What works:** `run()` invokes `execute-pipeline`, sets initial execution state, subscribes to `postgres_changes` on `executions` (Realtime is enabled in migration `/Users/erikbabcan/zip-pwa-factory/supabase/migrations/20260505174031_35045688-9f49-4843-a14c-098ccf43d2f4.sql`).

**Gaps:**

| Gap | Impact |
|-----|--------|
| **Realtime-only updates** (lines 86–109) | If Realtime WebSocket fails in prod, logs never update and `running` stays true forever |
| **No polling fallback** | Smoke script polls REST (`scripts/smoke-pipeline.mjs`); Builder does not |
| **No subscribe status handling** | Channel errors silently ignored |
| **No execution history** | Reload `/pipeline/:id` loses all past runs; no query of `executions` on mount |
| **Fire-and-forget backend** | `/Users/erikbabcan/zip-pwa-factory/supabase/functions/execute-pipeline/index.ts` lines 79–137 — unhandled IIFE rejection could leave `status=running` with empty logs |
| **Initial response has empty logs** | UI depends on subsequent Realtime UPDATEs for step-by-step progress |

**Suggested fixes:** Add interval poll while `running`, handle channel `SUBSCRIBED`/`CHANNEL_ERROR`, fetch latest execution on mount, optionally list past executions for the pipeline.

---

### P3 — Auth flow issues

| File | Issue |
|------|-------|
| `/Users/erikbabcan/zip-pwa-factory/src/pages/Auth.tsx` | Email signup shows “Check your email” (line 43) — production needs Supabase SMTP; local uses Mailpit `:54324` |
| `/Users/erikbabcan/zip-pwa-factory/src/pages/Auth.tsx` + `/Users/erikbabcan/zip-pwa-factory/src/integrations/lovable/index.ts` | Google OAuth via `@lovable.dev/cloud-auth-js` — requires Lovable cloud auth + Supabase Google provider + redirect URIs for prod domain; no env var documented |
| `/Users/erikbabcan/zip-pwa-factory/src/App.tsx` | No OAuth callback route — relies on redirect to origin and Lovable `setSession` |
| `/Users/erikbabcan/zip-pwa-factory/src/hooks/useAuth.tsx` | `isAdmin` resolved async (`setTimeout` + separate query) — brief non-admin UI flash |
| — | No password-reset flow |
| `/Users/erikbabcan/zip-pwa-factory/supabase/migrations/20260506032428_7f82f5c8-7a68-4be5-9d45-8e74d6298b9d.sql` | Pipelines SELECT is `USING (true)` for all authenticated users — any signed-in user can read any pipeline (edit/run still gated server-side) |

Routes are protected correctly via `/Users/erikbabcan/zip-pwa-factory/src/components/RequireAuth.tsx`.

---

### P4 — TODO / FIXME / `LOVABLE_API_KEY`

**None found** in source (excluding `node_modules` / `dist`).

- No `TODO`, `FIXME`, or `LOVABLE_API_KEY` references anywhere.
- Lovable appears only as OAuth SDK (`@lovable.dev/cloud-auth-js`) and dev tagger (`lovable-tagger` in `/Users/erikbabcan/zip-pwa-factory/vite.config.ts`).
- AI layer uses **`MISTRAL_API_KEY`**, not Lovable — see `/Users/erikbabcan/zip-pwa-factory/supabase/functions/_shared/ai-config.ts`.

---

### P5 — What’s needed to logically complete end-to-end

**Backend (mostly done locally):**

```
Browser → Supabase Auth → generate-pipeline / execute-pipeline → Mistral (or mock) → Postgres
```

Smoke proves this path locally. For production:

1. ~~Fix P0 lint → `npm run verify` green~~ *(✅ DONE)*
2. Set Vercel client env + Supabase function secrets + deploy functions
3. Push migrations to cloud project `bovledrqzuwegliltojr`
4. Configure Supabase Auth URLs + email (and Google if using Lovable OAuth)
5. Harden Builder with polling fallback + execution history (P2)
6. Optional product gaps:
   - Pipeline list / “my pipelines” UI (Index only generates, no browse)
   - Tighten pipeline SELECT RLS to owner/admin
   - Add CI running `verify:full` with mock AI
   - Client startup check for missing `VITE_SUPABASE_*`

**Already complete:**

- Edge functions: `/Users/erikbabcan/zip-pwa-factory/supabase/functions/generate-pipeline/index.ts`, `execute-pipeline/index.ts`
- Shared AI layer with mock provider for CI
- DB schema + RLS + Realtime publication for `executions`
- Auth gate on `/` and `/pipeline/:id`
- Integration smoke script: `/Users/erikbabcan/zip-pwa-factory/scripts/smoke-pipeline.mjs`
- Unit tests for mock AI: `/Users/erikbabcan/zip-pwa-factory/src/test/pipeline-ai-mock.test.ts`

---

**Bottom line:** The pipeline backend is functionally complete and smoke-tested locally. Production readiness is blocked mainly by **manual cloud provisioning** (env/secrets/function deploy/auth URLs) and **Builder Realtime fragility**. `npm run verify` is blocked by **7 ESLint errors** in shadcn UI boilerplate + `Builder.tsx`/`Auth.tsx` + `tailwind.config.ts`. There are **no stale `LOVABLE_API_KEY` references** — that name does not appear in this repo.
