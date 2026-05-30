export type PipelineStepDraft = {
  name: string;
  type: string;
  prompt: string;
  outputKey: string;
  expectedOutput?: string;
};

export type PipelineDraft = {
  title: string;
  steps: PipelineStepDraft[];
};

export type AiProvider = "mistral" | "mock";

export class AiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}
