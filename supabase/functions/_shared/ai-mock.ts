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

  return {
    title: truncateTitle(query),
    steps: [
      {
        name: `Analyze ${suffix}`,
        prompt: `Analyze the following user input and extract key themes:\n\n{{input}}`,
      },
      {
        name: `Transform ${suffix}`,
        prompt: `Transform the analysis into structured insights:\n\n{{previous_output}}`,
      },
      {
        name: `Finalize ${suffix}`,
        prompt: `Produce a concise final summary with actionable items:\n\n{{previous_output}}`,
      },
    ],
  };
}

export function buildMockCompletion(resolvedPrompt: string, stepName?: string): string {
  const label = stepName ?? "step";
  const preview = resolvedPrompt.slice(0, 120).replace(/\s+/g, " ");
  return `[MOCK step: ${label}] output for input: ${preview}`;
}
