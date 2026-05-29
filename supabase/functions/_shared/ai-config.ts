import type { AiProvider } from "./types.ts";
import { AiError } from "./types.ts";

export function resolveAiProvider(): AiProvider {
  const raw = (Deno.env.get("AI_PROVIDER") ?? "mistral").toLowerCase();
  if (raw === "mock") return "mock";
  if (raw === "mistral") return "mistral";
  throw new AiError(`Invalid AI_PROVIDER: ${raw}`, 500);
}

export function getMistralApiKey(): string {
  const key = Deno.env.get("MISTRAL_API_KEY");
  if (!key) {
    throw new AiError("Server configuration error", 500);
  }
  return key;
}

export function getMistralModel(): string {
  return Deno.env.get("MISTRAL_MODEL") ?? "mistral-small-latest";
}
