import { getMistralApiKeys, getMistralModel } from "./ai-config.ts";
import type { PipelineDraft } from "./types.ts";
import { AiError } from "./types.ts";

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

const CREATE_PIPELINE_TOOL = {
  type: "function" as const,
  function: {
    name: "create_pipeline",
    description: "Create a sequential pipeline of prompt steps",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, prompt: { type: "string" } },
            required: ["name", "prompt"],
            additionalProperties: false,
          },
        },
      },
      required: ["title", "steps"],
      additionalProperties: false,
    },
  },
};

const GENERATE_SYSTEM_PROMPT =
  "You are Silk Road, an elite AI Pipeline Architect and Workflow Generator. Your sole purpose is to analyze a user's request and design a sequential, multi-step execution pipeline to achieve their goal. You MUST respond ONLY with a valid JSON object. The JSON schema must exactly match: { \"title\": \"A short title (max 40 chars)\", \"steps\": [ { \"id\": \"step-1\", \"name\": \"Short Name\", \"prompt\": \"Detailed instructions\" } ] }. Break down the goal into 3 to 6 logical steps.";

function mapMistralHttpError(status: number, body: string): AiError {
  console.error("Mistral error", status, body.slice(0, 500));
  if (status === 429) return new AiError("Rate limit exceeded, try again shortly.", 429);
  if (status === 402 || status === 403) {
    return new AiError("AI credits exhausted or API key invalid.", 402);
  }
  return new AiError("AI gateway error", 502);
}

function parseToolCallArguments(data: Record<string, unknown>): Record<string, unknown> {
  const message = (data.choices as Array<{ message?: Record<string, unknown> }>)?.[0]?.message;
  if (!message) throw new AiError("AI response invalid", 502);

  const toolCalls = message.tool_calls as Array<{ function?: { arguments?: string } }> | undefined;
  if (toolCalls?.[0]?.function?.arguments) {
    return JSON.parse(toolCalls[0].function.arguments);
  }

  // Legacy / alternate shape
  const fn = message.function as { arguments?: string } | undefined;
  if (fn?.arguments) {
    return JSON.parse(fn.arguments);
  }

  throw new AiError("AI response invalid", 502);
}

function validatePipelineDraft(args: Record<string, unknown>): PipelineDraft {
  const titleRaw = args.title;
  const steps = args.steps;
  if (typeof titleRaw !== "string" || !Array.isArray(steps) || steps.length < 2) {
    throw new AiError("AI response invalid", 502);
  }
  const title = titleRaw.trim();
  if (!title) throw new AiError("AI response invalid", 502);

  const parsed: PipelineDraft = {
    title,
    steps: steps.map((s: Record<string, unknown>, idx: number) => {
      if (typeof s.name !== "string" || typeof s.prompt !== "string") {
        throw new AiError("AI response invalid", 502);
      }
      return { 
        name: s.name, 
        prompt: s.prompt,
        type: "generate",
        outputKey: `step_${idx + 1}`
      };
    }),
  };
  return parsed;
}

async function fetchWithMistralRetry(
  url: string,
  optionsFn: (key: string) => RequestInit
): Promise<Response> {
  const keys = getMistralApiKeys();
  // Start from a random key index for simple load balancing
  const startIndex = Math.floor(Math.random() * keys.length);
  
  let lastResp: Response | null = null;
  let lastText = "";

  for (let i = 0; i < keys.length; i++) {
    const keyIndex = (startIndex + i) % keys.length;
    const key = keys[keyIndex];
    
    const resp = await fetch(url, optionsFn(key));
    if (resp.ok) return resp;

    lastResp = resp;
    lastText = await resp.text();

    // If it's a rate limit or auth issue, try the next key
    if (resp.status === 429 || resp.status === 401 || resp.status === 402 || resp.status === 403) {
      console.warn(`Mistral key at index ${keyIndex} failed with ${resp.status}, trying next key if available...`);
      continue;
    }

    // Other errors (like 400 Bad Request) fail immediately
    break;
  }

  if (lastResp) {
    throw mapMistralHttpError(lastResp.status, lastText);
  }
  throw new AiError("No valid API keys available", 500);
}

export async function mistralGeneratePipeline(query: string): Promise<PipelineDraft> {
  const resp = await fetchWithMistralRetry(MISTRAL_URL, (key) => ({
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getMistralModel(),
      messages: [
        { role: "system", content: GENERATE_SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
      tools: [CREATE_PIPELINE_TOOL],
      tool_choice: { type: "function", function: { name: "create_pipeline" } },
    }),
  }));

  const data = await resp.json();
  const args = parseToolCallArguments(data as Record<string, unknown>);
  return validatePipelineDraft(args);
}

export async function mistralCompletePrompt(prompt: string): Promise<string> {
  const resp = await fetchWithMistralRetry(MISTRAL_URL, (key) => ({
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getMistralModel(),
      messages: [{ role: "user", content: prompt }],
    }),
  }));

  const data = await resp.json();
  const message = (data as { choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }> })
    .choices?.[0]?.message;
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "object" && part && "text" in part ? String(part.text ?? "") : ""))
      .join("")
      .trim();
  }
  return "";
}
