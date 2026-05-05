import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

async function callAI(prompt: string) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pipeline_id, initial_input } = await req.json();
    if (!pipeline_id) {
      return new Response(JSON.stringify({ error: "pipeline_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pipeline, error: pErr } = await supabase
      .from("pipelines")
      .select("*")
      .eq("id", pipeline_id)
      .single();
    if (pErr || !pipeline) throw new Error("Pipeline not found");

    const { data: exec, error: eErr } = await supabase
      .from("executions")
      .insert({
        pipeline_id,
        initial_input: initial_input ?? "",
        status: "running",
        logs: [],
      })
      .select()
      .single();
    if (eErr) throw eErr;

    // Run async — don't block the response
    (async () => {
      const logs: any[] = [];
      let prev = "";
      let failed = false;
      for (const step of pipeline.steps as any[]) {
        const promptUsed = (step.prompt || "")
          .replaceAll("{{input}}", initial_input ?? "")
          .replaceAll("{{previous_output}}", prev);

        const startedAt = new Date().toISOString();
        logs.push({
          step_id: step.id,
          step_name: step.name,
          status: "running",
          prompt_used: promptUsed,
          output: null,
          error: null,
          started_at: startedAt,
          completed_at: null,
        });
        await supabase.from("executions").update({ logs, updated_at: new Date().toISOString() }).eq("id", exec.id);

        try {
          const out = await callAI(promptUsed);
          prev = out;
          const last = logs[logs.length - 1];
          last.status = "completed";
          last.output = out;
          last.completed_at = new Date().toISOString();
        } catch (err) {
          const last = logs[logs.length - 1];
          last.status = "failed";
          last.error = err instanceof Error ? err.message : String(err);
          last.completed_at = new Date().toISOString();
          failed = true;
          await supabase
            .from("executions")
            .update({ logs, status: "failed", updated_at: new Date().toISOString() })
            .eq("id", exec.id);
          break;
        }
        await supabase.from("executions").update({ logs, updated_at: new Date().toISOString() }).eq("id", exec.id);
      }
      if (!failed) {
        await supabase
          .from("executions")
          .update({ logs, status: "completed", updated_at: new Date().toISOString() })
          .eq("id", exec.id);
      }
    })();

    return new Response(JSON.stringify(exec), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
