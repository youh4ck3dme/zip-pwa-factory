// @ts-ignore - Deno imports are valid in Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { completePrompt } from "../_shared/ai.ts";
import { interpolate, evaluateQualityGate } from "../_shared/pipeline-utils.ts";

// @ts-ignore - Deno is available in Supabase Edge Functions
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const pipelineId = body?.pipelineId || body?.pipeline_id;
    const initialInput = typeof body?.input === "string" ? body.input : (typeof body?.initial_input === "string" ? body.initial_input : "");
    const mode = body?.mode || "default";

    if (!pipelineId || typeof pipelineId !== "string" || !UUID_RE.test(pipelineId))
      return json({ error: "Invalid pipelineId" }, 400);
    if (initialInput.length > 5000) return json({ error: "input too long (max 5000 chars)" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pipeline, error: pErr } = await admin
      .from("pipelines")
      .select("id, owner_id, steps")
      .eq("id", pipelineId)
      .maybeSingle();
    if (pErr || !pipeline) return json({ error: "Pipeline not found" }, 404);

    const steps = pipeline.steps as Array<{
      id: string;
      title?: string;
      name?: string;
      type?: string;
      prompt: string;
      expectedOutput?: string;
      inputKeys?: string[];
      outputKey?: string;
    }>;
    if (!Array.isArray(steps) || steps.length === 0) {
      return json({ error: "Pipeline has no steps" }, 400);
    }

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;
    if (pipeline.owner_id !== userId && !isAdmin) return json({ error: "Forbidden" }, 403);

    const { data: exec, error: eErr } = await admin
      .from("executions")
      .insert({
        pipeline_id: pipelineId,
        owner_id: userId,
        initial_input: initialInput,
        status: "queued",
        logs: [],
      })
      .select()
      .single();
    if (eErr) {
      console.error("Insert execution failed:", eErr);
      return json({ error: "Failed to start execution" }, 500);
    }

    // Start background execution
    (async () => {
      // Transition to running
      await admin.from("executions").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", exec.id);

      const logs: Array<any> = [];
      const context: Record<string, unknown> = { input: initialInput };
      let artifacts: Record<string, unknown> = {};
      let failed = false;

      try {
        for (const step of steps) {
          const startTime = Date.now();
          const logEntry = {
            stepId: step.id,
            stepName: step.title || step.name || "Unknown Step",
            outputKey: step.outputKey || "default_out",
            status: "running",
            promptUsed: step.prompt || "", // Fallback, will be updated if interpolation succeeds
            data: null as unknown,
            summary: undefined as string | undefined,
            qualityScore: 0,
            warnings: [] as string[],
            durationMs: 0,
            error: undefined as string | undefined,
          };
          logs.push(logEntry);
          await admin.from("executions").update({ logs, updated_at: new Date().toISOString() }).eq("id", exec.id);

          try {
            const promptUsed = interpolate(step.prompt || "", context);
            const stepType = step.type || "ai_generate";
            logEntry.promptUsed = promptUsed;
            let stepData: unknown = null;
            let summary = "";

            if (stepType === "ai_generate") {
              const instructions = step.expectedOutput === "json" 
                ? `${promptUsed}\n\nIMPORTANT: Return ONLY valid JSON.`
                : promptUsed;
              const out = await completePrompt(instructions, logEntry.stepName);
              if (step.expectedOutput === "json") {
                try {
                  // extract JSON block if wrapped in markdown
                  const jsonStr = out.replace(/^```json/m, "").replace(/```$/m, "").trim();
                  stepData = JSON.parse(jsonStr);
                  summary = "JSON generated successfully.";
                } catch(e) {
                  stepData = out;
                  summary = "Failed to parse JSON, returning raw text.";
                  logEntry.warnings.push("JSON parse error");
                }
              } else {
                stepData = out;
              }
            } else if (stepType === "transform") {
              const out = await completePrompt(`Transform the following data based on the instructions.\nData: ${JSON.stringify(context)}\nInstructions: ${promptUsed}`);
              stepData = out;
            } else if (stepType === "validate") {
              const out = await completePrompt(`Validate the context against these rules. Reply with "OK" if valid, or a list of errors if invalid.\nContext: ${JSON.stringify(context)}\nRules: ${promptUsed}`);
              stepData = out;
              if (!out.toLowerCase().startsWith("ok")) {
                logEntry.warnings.push("Validation issues found");
              }
            } else if (stepType === "export") {
              const safeContext = JSON.parse(JSON.stringify(context));
              stepData = {
                "index.html": `<!DOCTYPE html><html><head><title>${pipeline.title}</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div></body></html>`,
                "manifest.json": { name: pipeline.title, short_name: "App", display: "standalone", theme_color: "#000000" },
                "context.json": safeContext
              };
              artifacts = stepData as Record<string, unknown>;
              summary = "PWA package exported successfully.";
            } else if (stepType === "webhook") {
              stepData = "Webhook placeholder - disabled by default";
              logEntry.warnings.push("Webhook disabled");
            } else {
              stepData = `Unknown step type: ${stepType}`;
            }

            if (logEntry.outputKey) {
              context[logEntry.outputKey] = stepData;
            }

            logEntry.status = "completed";
            logEntry.data = stepData;
            logEntry.summary = summary || undefined;
            const qualityScore = logEntry.warnings.length > 0 ? 0.75 : 1.0;
            const gate = evaluateQualityGate(qualityScore, 0.8);
            if (!gate.passed) {
              logEntry.warnings.push(...gate.warnings);
            }
            logEntry.qualityScore = qualityScore;
            logEntry.durationMs = Date.now() - startTime;
          } catch (err: any) {
            console.error(`Step ${step.id} failed:`, err);
            logEntry.status = "failed";
            logEntry.error = err.message || "Step execution failed";
            logEntry.durationMs = Date.now() - startTime;
            failed = true;
            await admin
              .from("executions")
              .update({ logs, status: "failed", updated_at: new Date().toISOString() })
              .eq("id", exec.id);
            break;
          }
          await admin.from("executions").update({ logs, updated_at: new Date().toISOString() }).eq("id", exec.id);
        }
        
        if (!failed) {
          await admin
            .from("executions")
            .update({ 
              logs, 
              status: "completed", 
              pwa_assets: Object.keys(artifacts).length > 0 ? artifacts : null,
              updated_at: new Date().toISOString() 
            })
            .eq("id", exec.id);
        }
      } catch (err) {
        console.error("Execution loop failed:", err);
        await admin
          .from("executions")
          .update({
            logs,
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", exec.id);
      }
    })();

    return json(exec);
  } catch (e) {
    console.error("execute-pipeline error:", e);
    return json({ error: "An internal error occurred" }, 500);
  }
});
