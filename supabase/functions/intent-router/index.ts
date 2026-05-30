import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PipelineSpecSchema } from "../../../src/types/pipeline.ts";
import { templates } from "../../../src/templates/pwa-templates.ts";

const INTENT_ENUM = [
  "generate_pwa_manifest",
  "create_service_worker",
  "optimize_assets",
  "generate_icons",
  "deploy_pwa",
  "validate_pwa",
] as const;

type Intent = typeof INTENT_ENUM[number];

serve(async (req) => {
  try {
    const { intent, input } = await req.json();
    
    // Validate intent
    if (!INTENT_ENUM.includes(intent as Intent)) {
      return new Response(JSON.stringify({ error: "Invalid intent" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    // Get template for intent
    const template = templates[intent as Intent];
    if (!template) {
      return new Response(JSON.stringify({ error: "Template not found" }), { 
        status: 404, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    // Generate pipeline spec (in a real implementation, this would call Mistral API)
    const pipelineSpec = generatePipelineSpec(template, input);
    
    // Validate
    const validatedSpec = PipelineSpecSchema.parse(pipelineSpec);
    
    return new Response(JSON.stringify(validatedSpec), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

function generatePipelineSpec(template: any, input: any) {
  // This is a placeholder - in production, you'd call Mistral API here
  // to fill in the template variables based on user input
  return {
    ...template,
    title: `PWA: ${input.name || 'Unnamed Project'}`,
    summary: `Generated PWA pipeline for ${input.name || 'project'}`,
  };
}
