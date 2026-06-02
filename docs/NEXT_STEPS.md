# Next Steps — zip-pwa-factory

## Immediate Next Recommended Step

Open PR:

`feat/agency-demo-polish` → `main`

Do not merge until reviewed.

## Suggested PR Title

`release: agency demo production flow`

## Suggested PR Summary

* Adds verified Agency Demo production flow.
* Adds synchronous execute-pipeline runner.
* Adds rich agency export renderer.
* Adds centralized prompt presets.
* Adds prompt preset quality tests.
* Verifies production Generate → Run → Export ZIP flow.

## Future Improvements

1. Sandbox-safe preview mode:

   * prevent service worker registration inside iframe preview
   * prevent `tel:` / external protocol errors inside sandbox
2. More vertical renderers:

   * restaurant menu/reservation sections
   * barber booking/services sections
   * salon packages
   * fitness classes
3. Prompt enhancer:

   * convert weak user prompts into strong extraction-anchored prompts
4. Multi-language export:

   * SK / EN templates
5. Better manifest/icon generation:

   * real icons
   * screenshots
   * maskable icons

## Current Golden Test Prompt

Create a premium PWA landing page for a fine dining restaurant called Éclat Fine Dining with menu preview, reservation system, sophisticated dark gold theme, hero headline "A Symphony of Flavors", signature dishes Truffle Risotto and Duck Confit, opening hours, contact footer, and strong "Reserve Your Table" CTA.

## Required ZIP Assertions

`index.html` must contain:

* Éclat Fine Dining
* A Symphony of Flavors
* Truffle Risotto
* Duck Confit
* Reserve Your Table

ZIP must contain:

* index.html
* manifest.json
* sw.js
* context.json
* README.md
* execution-summary.json
