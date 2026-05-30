import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { StepSchema, StepOutputSchema } from "../../../src/types/pipeline.ts";

// Mock Mistral client for Deno environment
class MockMistralClient {
  async chat(params: any) {
    // Mock response for AI generation
    return {
      choices: [
        {
          message: {
            content: this.generateMockResponse(params.messages[0].content),
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

  private generateMockResponse(prompt: string): string {
    // Generate mock responses based on prompt content
    if (prompt.includes("Web App Manifest")) {
      return JSON.stringify({
        "name": "My PWA",
        "short_name": "PWA",
        "start_url": "/",
        "display": "standalone",
        "theme_color": "#ffffff",
        "background_color": "#000000",
        "icons": [
          {
            "src": "/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
          }
        ]
      }, null, 2);
    } else if (prompt.includes("Service Worker")) {
      return `self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('pwa-cache').then((cache) => {
      return cache.addAll(['/', '/index.html', '/manifest.json']);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});`;
    } else if (prompt.includes("deployment")) {
      return JSON.stringify({
        "provider": "vercel",
        "buildCommand": "npm run build",
        "outputDir": "dist",
        "envVars": {}
      }, null, 2);
    }
    return "Mock response for: " + prompt.substring(0, 100);
  }
}

const client = new MockMistralClient();

serve(async (req) => {
  try {
    const { step, input, executionId } = await req.json();
    const validatedStep = StepSchema.parse(step);
    
    let output: any;
    
    switch (validatedStep.type) {
      case "ai_generate":
        output = await runAIGeneration(validatedStep, input);
        break;
      case "transform":
        output = await runTransformation(validatedStep, input);
        break;
      case "validate":
        output = await runValidation(validatedStep, input);
        break;
      case "export":
        output = await runExport(validatedStep, input);
        break;
      case "webhook":
        output = await runWebhook(validatedStep, input);
        break;
      default:
        throw new Error(`Unknown step type: ${validatedStep.type}`);
    }
    
    const stepOutput = StepOutputSchema.parse({
      key: validatedStep.outputKey,
      data: output,
      qualityScore: await calculateQualityScore(output, validatedStep),
    });
    
    return new Response(JSON.stringify(stepOutput), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stepId: err?.step?.id }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function runAIGeneration(step: z.infer<typeof StepSchema>, input: any) {
  const prompt = fillPrompt(step.prompt, input);
  
  // Call Mistral API (mock for now)
  const response = await client.chat({
    model: "mistral-large",
    messages: [{ role: "user", content: prompt }],
  });
  
  const content = response.choices[0]?.message?.content || "";
  
  // Parse based on expected output
  switch (step.expectedOutput) {
    case "json":
      try {
        return JSON.parse(content);
      } catch {
        return { raw: content, error: "Failed to parse JSON" };
      }
    default:
      return content;
  }
}

async function runTransformation(step: z.infer<typeof StepSchema>, input: any) {
  // Implement transformation logic
  // For PWA, this could be optimizing images, transforming data, etc.
  return input;
}

async function runValidation(step: z.infer<typeof StepSchema>, input: any) {
  // Implement validation logic
  // For PWA, this could be validating manifest, service worker, etc.
  
  if (step.outputKey === "validationResult" && input.manifest) {
    // Validate Web App Manifest
    const manifest = input.manifest;
    const requiredFields = ["name", "short_name", "start_url", "display"];
    const missingFields = requiredFields.filter(field => !(field in manifest));
    
    if (missingFields.length === 0) {
      return { valid: true, issues: [] };
    } else {
      return { 
        valid: false, 
        issues: missingFields.map(field => `Missing required field: ${field}`) 
      };
    }
  }
  
  if (step.outputKey === "swValidationResult" && input.serviceWorkerCode) {
    // Validate Service Worker
    const code = input.serviceWorkerCode;
    const requiredMethods = ["self.addEventListener", "fetch", "caches"];
    const missingMethods = requiredMethods.filter(method => !code.includes(method));
    
    if (missingMethods.length === 0) {
      return { valid: true, issues: [] };
    } else {
      return { 
        valid: false, 
        issues: missingMethods.map(method => `Missing required method: ${method}`) 
      };
    }
  }
  
  return { valid: true, issues: [] };
}

async function runExport(step: z.infer<typeof StepSchema>, input: any) {
  // Implement export logic
  return input;
}

async function runWebhook(step: z.infer<typeof StepSchema>, input: any) {
  // Implement webhook logic
  // In a real implementation, this would call external APIs
  console.log("Webhook called with input:", input);
  return { status: "success", data: input };
}

async function calculateQualityScore(output: any, step: z.infer<typeof StepSchema>): Promise<number> {
  // Implement quality scoring based on step type and output
  // For PWA, you might check:
  // - Manifest validity
  // - Service worker completeness
  // - Asset optimization
  
  switch (step.type) {
    case "ai_generate":
      if (step.expectedOutput === "json") {
        // Check if output is valid JSON and has expected structure
        try {
          const parsed = typeof output === "string" ? JSON.parse(output) : output;
          if (parsed && typeof parsed === "object") {
            return 0.95; // High quality for valid JSON
          }
        } catch {
          return 0.5; // Medium quality for invalid JSON
        }
      }
      return 0.8; // Default for text output
    
    case "validate":
      // Validation steps should have high quality if they pass
      if (output.valid === true) {
        return 1.0;
      } else if (output.valid === false && output.issues) {
        return 0.7; // Partial credit for finding issues
      }
      return 0.5;
    
    case "transform":
    case "export":
    case "webhook":
      return 0.9; // Assume high quality for successful operations
    
    default:
      return 0.8;
  }
}

function fillPrompt(template: string, input: any): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const keys = key.split('.');
    let value = input;
    for (const k of keys) {
      value = value?.[k];
    }
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

// Re-export types for Deno
export type { z } from "zod";
