import type { AiProvider } from "./types.ts";
import { AiError } from "./types.ts";

// @ts-ignore - Deno is available in Supabase Edge Functions
declare const Deno: any;

/**
 * Resolve which AI provider to use.
 *
 * Priority:
 *   1. Explicit AI_PROVIDER env var ("mock" | "mistral")
 *   2. Auto-detect: if any Mistral key is present → "mistral", otherwise → "mock"
 *
 * This ensures a clean `supabase start` (no env vars) falls back to mock
 * instead of crashing with "Server configuration error".
 */
export function resolveAiProvider(): AiProvider {
  const explicit = Deno.env.get("AI_PROVIDER");
  if (explicit) {
    const raw = explicit.toLowerCase();
    if (raw === "mock") return "mock";
    if (raw === "mistral") return "mistral";
    throw new AiError(`Invalid AI_PROVIDER: ${raw}`, 500);
  }
  // Auto-detect: use mistral only when at least one key is available
  const hasKeys = !!(
    Deno.env.get("MISTRAL_API_KEYS") ||
    Deno.env.get("MISTRAL_API_KEY") ||
    Deno.env.get("MISTRAL_API_KEY_BACKUP")
  );
  return hasKeys ? "mistral" : "mock";
}

export function getMistralApiKeys(): string[] {
  const keys: string[] = [];

  // Primary multi-key env var (comma-separated)
  const multiEnv = Deno.env.get("MISTRAL_API_KEYS");
  if (multiEnv) {
    keys.push(...multiEnv.split(",").map((k: string) => k.trim()).filter(Boolean));
  }

  // Single primary key
  const primary = Deno.env.get("MISTRAL_API_KEY");
  if (primary && !keys.includes(primary)) {
    keys.push(primary);
  }

  // Backup key
  const backup = Deno.env.get("MISTRAL_API_KEY_BACKUP");
  if (backup && !keys.includes(backup)) {
    keys.push(backup);
  }

  if (keys.length === 0) {
    throw new AiError("Server configuration error: no Mistral API keys found", 500);
  }
  return keys;
}

export function getMistralModel(): string {
  return Deno.env.get("MISTRAL_MODEL") ?? "open-mistral-nemo";
}
