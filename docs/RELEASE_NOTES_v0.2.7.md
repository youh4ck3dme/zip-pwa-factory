# v0.2.7 — Agency Prompt Presets

## Summary

This release strengthens the agency demo prompt system after the production Generate → Run → Export flow was verified.

## Production URL

[https://b1.rubberduck.sk/](https://b1.rubberduck.sk/)

## Branch

feat/agency-demo-polish

## Verified Tags

* v0.2.6-rich-agency-export-verified
* v0.2.7-agency-prompt-presets

## What Works

* Authenticated production usage
* Generate pipeline
* Agency routing
* Synchronous execute-pipeline runner
* Export ZIP generation
* Rich agency export renderer
* Restaurant and Barber preset verification
* Centralized agency prompt presets
* Unit tests for prompt quality anchors

## Key Files

* `src/lib/agencyPromptPresets.ts`
* `src/components/cinematic/GenerateBar.tsx`
* `src/test/agency-presets.test.ts`
* `supabase/functions/execute-pipeline/index.ts`

## Verified Preset Requirements

Every agency preset should contain:

* business type
* `called ...` business name anchor
* `hero headline "..."`
* concrete services/items
* opening hours
* contact footer
* strong quoted CTA
* PWA / landing page wording

## Production Verification

Restaurant preset verified expected content:

* Éclat Fine Dining
* A Symphony of Flavors
* Truffle Risotto
* Duck Confit
* Reserve Your Table

Barber preset verified expected content:

* Sharp & Co. Barbershop
* Crafted for the Modern Gentleman
* Book Your Cut

## Remaining Risks

* Export preview iframe may still need sandbox polish for service worker / external protocol behavior.
* More vertical-specific renderers can improve output quality further.
* Main branch merge still pending explicit approval.

## Do Not Forget

Do not merge into `main` until explicitly approved.
