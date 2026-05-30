import { PipelineSpecSchema, StepSchema } from "../types/pipeline";
import { templates } from "../templates/pwa-templates";

// Mock Mistral client for now - replace with actual @mistralai/mistral-js when available
class MockMistralClient {
  async embeddings(params: unknown) {
    // Mock response
    return {
      data: [
        {
          embedding: new Array(768).fill(0).map(() => Math.random()),
          index: 0,
        },
      ],
      model: "mistral-embed",
      usage: {
        prompt_tokens: 10,
        total_tokens: 10,
      },
    };
  }

  async chat(params: unknown) {
    // Mock chat response
    return {
      choices: [
        {
          message: {
            content: "This is a mock response from Mistral AI.",
            role: "assistant",
          },
          finish_reason: "stop",
          index: 0,
        },
      ],
      created: Date.now(),
      id: "mock-chat-id",
      model: "mistral-large",
      object: "chat.completion",
      usage: {
        completion_tokens: 20,
        prompt_tokens: 10,
        total_tokens: 30,
      },
    };
  }
}

const client = new MockMistralClient();

export async function generatePipelineSpec(intent: string, input: Record<string, unknown>): Promise<z.infer<typeof PipelineSpecSchema>> {
  const template = templates[intent];
  if (!template) {
    throw new Error(`Template not found for intent: ${intent}`);
  }

  // Generate each step using the template
  const steps = await Promise.all(
    template.steps!.map(async (stepTemplate) => {
      const prompt = fillTemplate(stepTemplate.prompt, input);
      
      // In a real implementation, you'd call Mistral API here
      // For now, we'll just fill in the template variables
      const filledStep = {
        ...stepTemplate,
        prompt: fillTemplate(stepTemplate.prompt, input),
      };
      
      return StepSchema.parse(filledStep);
    })
  );

  const pipelineSpec = {
    ...template,
    title: fillTemplate(template.title || intent, input),
    summary: fillTemplate(template.summary || "", input),
    steps,
    pwaMetadata: input.pwaMetadata,
  };

  return PipelineSpecSchema.parse(pipelineSpec);
}

function fillTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return variables[key] !== undefined ? String(variables[key]) : `{{${key}}}`;
  });
}

// Re-export types for convenience
export type { z } from "zod";
