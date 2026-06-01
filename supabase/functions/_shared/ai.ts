import { resolveAiProvider } from "./ai-config.ts";
import { buildMockCompletion, buildMockPipeline, isAgencyQuery, buildAgencyPipeline } from "./ai-mock.ts";
import { mistralCompletePrompt, mistralGeneratePipeline } from "./ai-mistral.ts";
import type { PipelineDraft } from "./types.ts";
import { AiError } from "./types.ts";

export { AiError } from "./types.ts";
export type { PipelineDraft, PipelineStepDraft } from "./types.ts";
export { buildMockPipeline, hashQuery, truncateTitle } from "./ai-mock.ts";

export async function generatePipelineFromQuery(query: string): Promise<PipelineDraft> {
  // Agency routing guard: ALL agency prompts must use Agency Landing PWA pipeline
  // regardless of AI provider (mock or Mistral)
  if (isAgencyQuery(query)) {
    return buildAgencyPipeline(query);
  }

  const provider = resolveAiProvider();
  if (provider === "mock") {
    return buildMockPipeline(query);
  }
  return mistralGeneratePipeline(query);
}

export async function completePrompt(prompt: string, stepName?: string): Promise<string> {
  const provider = resolveAiProvider();
  if (provider === "mock") {
    return buildMockCompletion(prompt, stepName);
  }
  return mistralCompletePrompt(prompt);
}

export function aiErrorResponse(error: unknown): { message: string; status: number } {
  if (error instanceof AiError) {
    return { message: error.message, status: error.status };
  }
  console.error("Unexpected AI error:", error);
  return { message: "An internal error occurred", status: 500 };
}
