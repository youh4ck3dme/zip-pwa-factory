import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    console.error(`AI ${r.status}:`, t.slice(0, 500));
    throw new Error("AI request failed");
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
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
    const pipeline_id = body?.pipeline_id;
    const initial_input = typeof body?.initial_input === "string" ? body.initial_input : "";

    if (!pipeline_id || typeof pipeline_id !== "string" || !UUID_RE.test(pipeline_id))
      return json({ error: "Invalid pipeline_id" }, 400);
    if (initial_input.length > 5000) return json({ error: "initial_input too long (max 5000 chars)" }, 400);

    // Use service role only for pipeline lookup + execution writes (after authz check)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pipeline, error: pErr } = await admin
      .from("pipelines")
      .select("id, owner_id, steps")
      .eq("id", pipeline_id)
      .maybeSingle();
    if (pErr || !pipeline) return json({ error: "Pipeline not found" }, 404);

    // Authorize: owner OR admin role
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
        pipeline_id,
        owner_id: userId,
        initial_input,
        status: "running",
        logs: [],
      })
      .select()
      .single();
    if (eErr) {
      console.error("Insert execution failed:", eErr);
      return json({ error: "Failed to start execution" }, 500);
    }

    // Async execution
    (async () => {
      const logs: any[] = [];
      let prev = "";
      let failed = false;
      for (const step of pipeline.steps as any[]) {
        const promptUsed = (step.prompt || "")
          .replaceAll("{{input}}", initial_input)
          .replaceAll("{{previous_output}}", prev);

        logs.push({
          step_id: step.id,
          step_name: step.name,
          status: "running",
          prompt_used: promptUsed,
          output: null,
          error: null,
          started_at: new Date().toISOString(),
          completed_at: null,
        });
        await admin.from("executions").update({ logs, updated_at: new Date().toISOString() }).eq("id", exec.id);

        try {
          const out = await callAI(promptUsed);
          prev = out;
          const last = logs[logs.length - 1];
          last.status = "completed";
          last.output = out;
          last.completed_at = new Date().toISOString();
        } catch (err) {
          console.error("Step failed:", err);
          const last = logs[logs.length - 1];
          last.status = "failed";
          last.error = "Step execution failed";
          last.completed_at = new Date().toISOString();
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
          .update({ logs, status: "completed", updated_at: new Date().toISOString() })
          .eq("id", exec.id);
      }
    })();

    return json(exec);
  } catch (e) {
    console.error("execute-pipeline error:", e);
    return json({ error: "An internal error occurred" }, 500);
  }
});
