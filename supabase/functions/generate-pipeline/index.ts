import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { aiErrorResponse, generatePipelineFromQuery } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    if (!query) return json({ error: "query required" }, 400);
    if (query.length > 2000) return json({ error: "Query too long (max 2000 chars)" }, 400);

    let draft;
    try {
      draft = await generatePipelineFromQuery(query);
    } catch (aiErr) {
      const { message, status } = aiErrorResponse(aiErr);
      return json({ error: message }, status);
    }

    const stepsWithIds = draft.steps.map((s) => ({
      id: crypto.randomUUID(),
      name: s.name,
      prompt: s.prompt,
    }));

    const { data: inserted, error } = await userClient
      .from("pipelines")
      .insert({ title: draft.title, query, steps: stepsWithIds, owner_id: userId })
      .select()
      .single();

    if (error) {
      console.error("Insert pipeline failed:", error);
      return json({ error: "Failed to save pipeline" }, 500);
    }

    return json(inserted);
  } catch (e) {
    console.error("generate-pipeline error:", e);
    return json({ error: "An internal error occurred" }, 500);
  }
});
