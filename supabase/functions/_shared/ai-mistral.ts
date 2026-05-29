import { getMistralApiKey, getMistralModel } from "./ai-config.ts";
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
  "You design sequential AI prompt pipelines. Given a user goal, output 2-5 chained steps. Step 1 must use {{input}}. Subsequent steps must use {{previous_output}}. Each step has a short name and a complete prompt template.";

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
    steps: steps.map((s: Record<string, unknown>) => {
      if (typeof s.name !== "string" || typeof s.prompt !== "string") {
        throw new AiError("AI response invalid", 502);
      }
      return { name: s.name, prompt: s.prompt };
    }),
  };
  return parsed;
}

export async function mistralGeneratePipeline(query: string): Promise<PipelineDraft> {
  const resp = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMistralApiKey()}`,
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
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw mapMistralHttpError(resp.status, text);
  }

  const data = await resp.json();
  const args = parseToolCallArguments(data as Record<string, unknown>);
  return validatePipelineDraft(args);
}

export async function mistralCompletePrompt(prompt: string): Promise<string> {
  const resp = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getMistralApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getMistralModel(),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw mapMistralHttpError(resp.status, text);
  }

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
