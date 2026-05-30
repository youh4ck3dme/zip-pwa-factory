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
