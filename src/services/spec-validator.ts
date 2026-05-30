import { PipelineSpecSchema, StepSchema } from "../types/pipeline";
import { z } from "zod";

export function validateAndRepairPipeline(spec: any): z.infer<typeof PipelineSpecSchema> {
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

async function repairWithLLM(spec: any, errors: z.ZodIssue[]): Promise<any> {
  // In a real implementation, you'd call Mistral API here
  // to fix the validation errors
  console.warn("Validation errors:", errors);
  
  // Simple repair: remove invalid steps
  const validSteps = spec.steps.filter((step: any) => {
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
export function validatePipelineSync(spec: any): z.infer<typeof PipelineSpecSchema> {
  return PipelineSpecSchema.parse(spec);
}

// Validate individual step
export function validateStepSync(step: any) {
  return StepSchema.parse(step);
}
