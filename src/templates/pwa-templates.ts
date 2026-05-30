import { PipelineSpec } from "../types/pipeline";

export const templates: Record<string, Partial<PipelineSpec>> = {
  generate_pwa_manifest: {
    intent: "generate_pwa_manifest",
    summary: "Generates a Web App Manifest for PWA",
    steps: [
      {
        id: "c001",
        title: "Generate Manifest JSON",
        type: "ai_generate",
        prompt: `Generate a valid Web App Manifest JSON for a PWA with the following requirements:
- Name: {{name}}
- Short name: {{shortName}}
- Theme color: {{themeColor}}
- Background color: {{backgroundColor}}
- Display: {{display}}
- Start URL: {{startUrl}}
- Scope: {{scope}}
- Description: {{description}}
- Icons: {{icons}}

Ensure the output is valid JSON and follows the W3C specification.`,
        expectedOutput: "json",
        inputKeys: ["name", "shortName", "themeColor", "backgroundColor", "display", "startUrl", "scope", "description", "icons"],
        outputKey: "manifest",
        pwaConfig: {
          cacheStrategy: "networkFirst",
          precacheAssets: ["/", "/index.html", "/manifest.json"],
        },
      },
      {
        id: "c002",
        title: "Validate Manifest",
        type: "validate",
        prompt: "Validate the following Web App Manifest JSON against the W3C specification. Return errors if any, or 'valid' if correct.",
        expectedOutput: "json",
        inputKeys: ["manifest"],
        outputKey: "validationResult",
      },
    ],
  },
  
  create_service_worker: {
    intent: "create_service_worker",
    summary: "Generates a Service Worker for PWA caching",
    steps: [
      {
        id: "d001",
        title: "Generate Service Worker",
        type: "ai_generate",
        prompt: `Generate a Service Worker JavaScript file for a PWA with the following caching requirements:
- Cache name: {{cacheName}}
- Assets to precache: {{precacheAssets}}
- Cache strategy: {{cacheStrategy}}
- Offline page: {{offlinePage}}

The Service Worker should:
1. Precache all specified assets
2. Implement the selected cache strategy
3. Serve the offline page when offline
4. Include proper event listeners (install, fetch, activate)
5. Use Workbox or vanilla JS as specified`,
        expectedOutput: "text",
        inputKeys: ["cacheName", "precacheAssets", "cacheStrategy", "offlinePage"],
        outputKey: "serviceWorkerCode",
      },
      {
        id: "d002",
        title: "Validate Service Worker",
        type: "validate",
        prompt: "Review the following Service Worker code for:
1. Syntax errors
2. Missing event listeners
3. Proper caching logic
4. Offline support
Return a list of issues or 'valid' if correct.",
        expectedOutput: "json",
        inputKeys: ["serviceWorkerCode"],
        outputKey: "swValidationResult",
      },
    ],
  },
  
  optimize_assets: {
    intent: "optimize_assets",
    summary: "Optimizes assets for PWA (images, icons, etc.)",
    steps: [
      {
        id: "e001",
        title: "Generate Icon Sizes",
        type: "ai_generate",
        prompt: `Generate a set of PWA icons in different sizes from the provided base image. The icons should include:
- 192x192 (for manifest)
- 512x512 (for manifest)
- 180x180 (for Apple Touch Icon)
- 32x32 (for favicon)
- 16x16 (for favicon)

Provide the icons as base64 encoded strings or URLs to generated images.`,
        expectedOutput: "json",
        inputKeys: ["baseImage", "appName"],
        outputKey: "icons",
      },
      {
        id: "e002",
        title: "Optimize Images",
        type: "transform",
        prompt: "Optimize the provided images for web use, compressing them while maintaining quality.",
        expectedOutput: "json",
        inputKeys: ["icons"],
        outputKey: "optimizedIcons",
      },
    ],
  },
  
  generate_icons: {
    intent: "generate_icons",
    summary: "Generates PWA icons from text or logo",
    steps: [
      {
        id: "f001",
        title: "Generate Icon Design",
        type: "ai_generate",
        prompt: `Generate a PWA icon design based on the following requirements:
- App name: {{name}}
- Primary color: {{primaryColor}}
- Secondary color: {{secondaryColor}}
- Style: {{style}}
- Initials: {{initials}}

Generate a clean, modern icon that works well at small sizes. Provide the design as an SVG or base64 encoded PNG.`,
        expectedOutput: "text",
        inputKeys: ["name", "primaryColor", "secondaryColor", "style", "initials"],
        outputKey: "iconDesign",
      },
      {
        id: "f002",
        title: "Generate Icon Variants",
        type: "transform",
        prompt: "Generate multiple sizes of the icon for different PWA requirements.",
        expectedOutput: "json",
        inputKeys: ["iconDesign"],
        outputKey: "iconVariants",
      },
    ],
  },
  
  deploy_pwa: {
    intent: "deploy_pwa",
    summary: "Deploys a PWA to a hosting service",
    steps: [
      {
        id: "g001",
        title: "Generate Deployment Config",
        type: "ai_generate",
        prompt: `Generate a deployment configuration for a PWA with the following details:
- Hosting provider: {{provider}}
- Build command: {{buildCommand}}
- Output directory: {{outputDir}}
- Environment variables: {{envVars}}

The configuration should be in the format required by the hosting provider (e.g., Vercel JSON, Netlify TOML, etc.)`,
        expectedOutput: "json",
        inputKeys: ["provider", "buildCommand", "outputDir", "envVars"],
        outputKey: "deploymentConfig",
      },
      {
        id: "g002",
        title: "Deploy via Webhook",
        type: "webhook",
        prompt: "Trigger deployment webhook",
        expectedOutput: "json",
        inputKeys: ["deploymentConfig", "webhookUrl"],
        outputKey: "deploymentResult",
      },
    ],
  },
};
