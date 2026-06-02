# PR Ready Report — v0.2.7 Agency Demo Production Flow

## Branch
`feat/agency-demo-polish`

## Target
`main`

## Production URL
https://b1.rubberduck.sk/

## Verified Tags
- `v0.2.6-rich-agency-export-verified`
- `v0.2.7-agency-prompt-presets`

## Summary
This branch contains the verified Agency Demo production flow:
- Generate pipeline
- Agency routing
- Synchronous execute-pipeline runner
- Rich agency export renderer
- ZIP export
- Centralized prompt presets
- Prompt quality tests
- Release notes and next steps

## Verification Results
- **lint**: Passed
- **typecheck**: Passed
- **tests**: Passed (119 test cases passing successfully)
- **build**: Passed (production asset bundle created successfully)
- **npm run verify**: Passed (all checks complete with 0 errors)

## Changed Areas
The changes in this branch since `origin/main` consist of:
- **Supabase Functions**: Enforce static PWA routing inside `execute-pipeline`, implement custom HTML extraction (name, CTA, colors, dishes, hours) and synchronous execution.
- **Frontend Components**: Centralize presets out of the UI, dynamic loading from `src/lib/agencyPromptPresets.ts` into `GenerateBar.tsx`. Optimize Three.js animation bundles and prevent render locks.
- **Prompt Preset Module**: New module `src/lib/agencyPromptPresets.ts` containing the 6 extraction-anchored preset prompts.
- **Tests**: New unit tests in `src/test/agency-presets.test.ts` to assert that all presets conform to quality guidelines (anchor tags, minimum length, CTAs).
- **Docs**: RELEASE_NOTES, NEXT_STEPS, and PR readiness documentation.

## Important Files
- `supabase/functions/execute-pipeline/index.ts`
- `supabase/functions/_shared/ai.ts`
- `supabase/functions/_shared/ai-mock.ts`
- `src/lib/agencyPromptPresets.ts`
- `src/components/cinematic/GenerateBar.tsx`
- `src/test/agency-presets.test.ts`
- `docs/RELEASE_NOTES_v0.2.7.md`
- `docs/NEXT_STEPS.md`

## Production Proof
Known verified flow:
Prompt → Generate → Run → Export ZIP

Golden prompt:
`Create a premium PWA landing page for a fine dining restaurant called Éclat Fine Dining with menu preview, reservation system, sophisticated dark gold theme, hero headline "A Symphony of Flavors", signature dishes Truffle Risotto and Duck Confit, opening hours, contact footer, and strong "Reserve Your Table" CTA.`

Required ZIP assertions verified:
- `Éclat Fine Dining`
- `A Symphony of Flavors`
- `Truffle Risotto`
- `Duck Confit`
- `Reserve Your Table`
- No `undefined` strings in output
- No raw prompt used as the page title
- No `businessType is not defined` errors

## Known Remaining Risks
- Preview iframe sandbox may still show harmless service worker / external protocol warnings depending on browser vendor policies.
- More vertical-specific renderers could improve output quality later.
- Main merge still requires human approval.

## Recommendation
Open PR:
`feat/agency-demo-polish` → `main`

Suggested PR title:
`release: agency demo production flow`

Suggested PR body:
(See Phase 7 template in docs/NEXT_STEPS.md)
