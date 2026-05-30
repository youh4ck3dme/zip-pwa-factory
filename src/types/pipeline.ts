import { z } from "zod";

// --- Step Schema ---
export const StepSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(80),
  type: z.enum(["ai_generate", "transform", "validate", "export", "webhook"]),
  prompt: z.string().min(10),
  expectedOutput: z.enum(["json", "markdown", "html", "text"]),
  inputKeys: z.array(z.string()),
  outputKey: z.string(),
  // PWA-specific extensions
  pwaConfig: z.object({
    cacheStrategy: z.enum(["networkFirst", "cacheFirst", "staleWhileRevalidate"]).optional(),
    precacheAssets: z.array(z.string()).optional(),
  }).optional(),
});

// --- Pipeline Schema ---
export const PipelineSpecSchema = z.object({
  title: z.string().min(3).max(120),
  intent: z.string(),
  summary: z.string().max(280),
  steps: z.array(StepSchema).min(1).max(20),
  // PWA metadata
  pwaMetadata: z.object({
    name: z.string(),
    shortName: z.string(),
    themeColor: z.string().regex(/^#[0-9A-F]{6}$/i),
    backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i),
    display: z.enum(["standalone", "fullscreen", "minimal-ui", "browser"]),
  }).optional(),
});

// --- Output Schema ---
export const StepOutputSchema = z.object({
  key: z.string(),
  data: z.any(),
  qualityScore: z.number().min(0).max(1),
  // PWA-specific
  assetUrl: z.string().url().optional(),
  cacheKey: z.string().optional(),
});

export type Step = z.infer<typeof StepSchema>;
export type PipelineSpec = z.infer<typeof PipelineSpecSchema>;
export type StepOutput = z.infer<typeof StepOutputSchema>;
