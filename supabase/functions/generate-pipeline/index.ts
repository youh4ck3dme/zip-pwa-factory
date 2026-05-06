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
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub;

    const body = await req.json().catch(() => ({}));
    const query = body?.query;
    if (!query || typeof query !== "string") return json({ error: "query required" }, 400);
    if (query.length > 2000) return json({ error: "Query too long (max 2000 chars)" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return json({ error: "Server configuration error" }, 500);
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You design sequential AI prompt pipelines. Given a user goal, output 2-5 chained steps. Step 1 must use {{input}}. Subsequent steps must use {{previous_output}}. Each step has a short name and a complete prompt template.",
          },
          { role: "user", content: query },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_pipeline",
              description: "Create a sequential pipeline of prompt steps",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { name: { type: "string" }, prompt: { type: "string" } },
                      required: ["name", "prompt"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "steps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_pipeline" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) return json({ error: "Rate limit exceeded, try again shortly." }, 429);
      if (aiResp.status === 402)
        return json({ error: "AI credits exhausted. Add credits to your workspace." }, 402);
      return json({ error: "AI gateway error" }, 502);
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response");
      return json({ error: "AI response invalid" }, 502);
    }
    const args = JSON.parse(toolCall.function.arguments);

    const stepsWithIds = (args.steps || []).map((s: any) => ({
      id: crypto.randomUUID(),
      name: s.name,
      prompt: s.prompt,
    }));

    // Insert as the user (RLS enforces owner_id = auth.uid())
    const { data: inserted, error } = await userClient
      .from("pipelines")
      .insert({ title: args.title, query, steps: stepsWithIds, owner_id: userId })
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
