# Codex Handoff — zip-pwa-factory

## Repo
https://github.com/youh4ck3dme/zip-pwa-factory

## Branch
`feat/agency-demo-polish`

## Production URL
https://b1.rubberduck.sk/

## Supabase Project
tzmfrgqyijabogngiaqw

---

## Current Verified Status

| Component | Status | Notes |
|-----------|--------|-------|
| Domain works | ✅ | b1.rubberduck.sk serves correct frontend |
| Auth works | ✅ | Login/signup functional |
| Generate works | ✅ | Creates correct agency pipeline steps |
| Agency routing works | ✅ | barber/salon/restaurant prompts → Agency Landing PWA |
| Run pipeline works | ✅ | Synchronous execution, no queued status |
| execute-pipeline runs synchronously | ✅ | Removed background IIFE, returns completed |
| ZIP export works | ⚠️ | Needs verification with latest fix |
| businessType ReferenceError fixed | ✅ | businessType now properly defined |

---

## Current Open Issue

Rich agency export renderer is still incomplete unless latest fix proves otherwise.

The latest known failed expectation:
- index.html did not contain:
  - Truffle Risotto
  - Duck Confit
  - Reserve Your Table

**Codex must verify the latest state with a fresh production run.**

---

## Important File

`supabase/functions/execute-pipeline/index.ts`

This file contains the export renderer that needs verification.

---

## Exact Test Prompt

```
Create a premium PWA landing page for a fine dining restaurant called Éclat Fine Dining with menu preview, reservation system, sophisticated dark gold theme, hero headline "A Symphony of Flavors", signature dishes Truffle Risotto and Duck Confit, opening hours, contact footer, and strong "Reserve Your Table" CTA.
```

---

## Required ZIP Assertions

After **Generate → Run pipeline → Download ZIP**:

### index.html must contain:
- ✅ Éclat Fine Dining
- ✅ A Symphony of Flavors
- ✅ Truffle Risotto
- ✅ Duck Confit
- ✅ Reserve Your Table

### index.html must NOT contain:
- ❌ undefined
- ❌ raw prompt as title
- ❌ businessType is not defined

### ZIP must contain:
- ✅ index.html
- ✅ manifest.json
- ✅ sw.js
- ✅ context.json
- ✅ README.md
- ✅ execution-summary.json

---

## Verification Commands

```bash
cd /Users/erikbabcan/zip-pwa-factory

pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

### Deploy Edge Function if changed:
```bash
supabase functions deploy execute-pipeline --project-ref tzmfrgqyijabogngiaqw
```

### Deploy frontend only if frontend files changed:
```bash
vercel --prod
```

---

## Branch Rules

- **Do NOT merge to main** until fresh ZIP verification passes
- **Do NOT tag v0.2.6** until rich export is verified
- **Keep working on** `feat/agency-demo-polish`
- Push all changes to this branch for Codex to continue

---

## Latest Changes Summary

Recent commits on `feat/agency-demo-polish`:

1. `158869e` - fix: define businessType in export renderer to prevent ReferenceError
2. `660dca5` - fix: improve agency export renderer to use rich context data
3. `9c52c20` - fix: make execute-pipeline run synchronously for MVP
4. `23b7a5c` - fix: render real agency landing page in export package
5. `ac70115` - fix: remove production dev-bypass pipeline generation

---

## Next Task for Codex

1. Pull latest `feat/agency-demo-polish`
2. Run verification commands (lint, typecheck, test, build)
3. Test production at https://b1.rubberduck.sk/ with the exact test prompt
4. Generate → Run pipeline → Download ZIP
5. Verify ZIP contains all required strings
6. If verification passes:
   - Commit any additional fixes
   - Push to `feat/agency-demo-polish`
   - Do NOT merge to main yet
7. If verification fails:
   - Identify missing strings in index.html
   - Fix export renderer in `supabase/functions/execute-pipeline/index.ts`
   - Deploy and retest

---

## Production Environment Notes

- Frontend: Deployed to Vercel, aliased to b1.rubberduck.sk
- Backend: Supabase project tzmfrgqyijabogngiaqw
- Edge Functions: Deployed to production
- No DNS/domain changes needed
- No auth changes needed
- No Mistral key changes needed

---

*Prepared for Codex handoff*
