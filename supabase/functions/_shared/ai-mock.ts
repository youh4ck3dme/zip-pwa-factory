import type { PipelineDraft } from "./types.ts";

/** Simple deterministic hash for stable mock output across runs. */
export function hashQuery(query: string): number {
  let h = 0;
  for (let i = 0; i < query.length; i++) {
    h = (Math.imul(31, h) + query.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function truncateTitle(query: string, max = 80): string {
  const trimmed = query.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + "…";
}

/**
 * Check if query is for an agency landing page
 * Detects keywords like: barber, salon, restaurant, cafe, agency, business, shop, store, landing, pwa
 */
function isAgencyQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const agencyKeywords = [
    "barber", "salon", "spa", "restaurant", "cafe", "bistro", "diner",
    "agency", "business", "shop", "store", "boutique", "studio",
    "landing", "landing page", "pwa", "progressive web app",
    "premium", "professional", "online booking", "appointment", "service"
  ];
  return agencyKeywords.some(keyword => lowerQuery.includes(keyword));
}

/**
 * Build a polished agency landing page pipeline
 * Generates a premium PWA with booking CTA for local businesses
 */
function buildAgencyPipeline(query: string): PipelineDraft {
  const h = hashQuery(query);
  const suffix = (h % 900 + 100).toString();
  const title = truncateTitle(query);

  return {
    title: title,
    steps: [
      {
        name: `Generate Agency Spec ${suffix}`,
        type: "ai_generate",
        prompt: `Generate a premium PWA specification for a local business landing page. Input: {{input}}`,
        expectedOutput: "json",
        outputKey: "agencySpec"
      },
      {
        name: `Create Hero Section ${suffix}`,
        type: "ai_generate",
        prompt: `Create a compelling hero section with headline, subheadline, and CTA button for: {{input}}`,
        expectedOutput: "json",
        outputKey: "heroSection"
      },
      {
        name: `Create Services Section ${suffix}`,
        type: "ai_generate",
        prompt: `List 3-4 key services for this business: {{input}}`,
        expectedOutput: "json",
        outputKey: "services"
      },
      {
        name: `Create Booking CTA ${suffix}`,
        type: "ai_generate",
        prompt: `Create a prominent booking call-to-action with compelling copy for: {{input}}`,
        expectedOutput: "json",
        outputKey: "bookingCTA"
      },
      {
        name: `Export Agency PWA Package ${suffix}`,
        type: "export",
        prompt: `Export a premium agency landing page PWA package using all generated content`,
        outputKey: "agencyExport"
      },
    ],
  };
}

export function buildMockPipeline(query: string): PipelineDraft {
  const h = hashQuery(query);
  const suffix = (h % 900 + 100).toString();

  // If the query is specifically testing missing keys, add a step that uses {{undefinedKey}}
  if (query.includes("TEST_MISSING_KEY")) {
    return {
      title: "Negative Test Pipeline",
      steps: [
        {
          name: "Faulty Step",
          type: "ai_generate",
          prompt: "Analyze this: {{undefinedKey}}",
          outputKey: "errorResult"
        }
      ]
    };
  }

  // If testing webhooks, inject a webhook step
  if (query.includes("TEST_WEBHOOK")) {
    return {
      title: "Webhook Test Pipeline",
      steps: [
        {
          name: "Webhook Step",
          type: "webhook",
          prompt: "Send data",
          outputKey: "webhookResult"
        }
      ]
    };
  }

  // If this is an agency landing page request, use the agency pipeline
  if (isAgencyQuery(query)) {
    return buildAgencyPipeline(query);
  }

  return {
    title: truncateTitle(query),
    steps: [
      {
        name: `Generate App ${suffix}`,
        type: "ai_generate",
        prompt: `Generate the PWA spec for: {{input}}`,
        expectedOutput: "json",
        outputKey: "appSpec"
      },
      {
        name: `Transform Spec ${suffix}`,
        type: "transform",
        prompt: `Transform into rendering format: {{appSpec}}`,
        outputKey: "renderSpec"
      },
      {
        name: `Validate Specs ${suffix}`,
        type: "validate",
        prompt: `Check quality of {{renderSpec}}`,
        outputKey: "validationResult"
      },
      {
        name: `Export Package ${suffix}`,
        type: "export",
        prompt: `Export PWA using {{renderSpec}} and {{validationResult}}`,
        outputKey: "exportPackage"
      },
    ],
  };
}

export function buildMockCompletion(resolvedPrompt: string, stepName?: string): string {
  const label = stepName ?? "step";
  const preview = resolvedPrompt.slice(0, 120).replace(/\s+/g, " ");
  return `[MOCK step: ${label}] output for input: ${preview}`;
}
