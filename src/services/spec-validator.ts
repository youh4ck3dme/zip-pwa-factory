import { PipelineSpecSchema, StepSchema } from "../types/pipeline";
import { z } from "zod";

export function validateAndRepairPipeline(spec: unknown): z.infer<typeof PipelineSpecSchema> {
  try {
    return PipelineSpecSchema.parse(spec);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Attempt to repair using LLM (placeholder)
      const repairedSpec = repairWithLLM(spec, error.errors);
      return PipelineSpecSchema.parse(repairedSpec);
    }
    throw error;
  }
}

async function repairWithLLM(spec: unknown, errors: z.ZodIssue[]): Promise<unknown> {
  // In a real implementation, you'd call Mistral API here
  // to fix the validation errors
  console.warn("Validation errors:", errors);
  
  // Simple repair: remove invalid steps
  const validSteps = spec.steps.filter((step: Record<string, unknown>) => {
    try {
      StepSchema.parse(step);
      return true;
    } catch {
      return false;
    }
  });
  
  return {
    ...spec,
    steps: validSteps.length > 0 ? validSteps : spec.steps,
  };
}

// Sync version for immediate validation without LLM
export function validatePipelineSync(spec: unknown): z.infer<typeof PipelineSpecSchema> {
  return PipelineSpecSchema.parse(spec);
}

// Validate individual step
export function validateStepSync(step: Record<string, unknown>) {
  return StepSchema.parse(step);
}
