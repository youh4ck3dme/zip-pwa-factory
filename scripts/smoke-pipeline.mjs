/**
 * Integration smoke: auth → generate-pipeline → DB row → execute-pipeline → poll completion.
 *
 * Prerequisites:
 *   npm run db:start
 *   npm run db:functions   (with AI_PROVIDER=mock in supabase/.env.local for CI)
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SMOKE_EMAIL = process.env.SMOKE_EMAIL ?? "smoke-test@example.com";
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD ?? "smoke-test-pass-123";
const SMOKE_QUERY = process.env.SMOKE_QUERY ?? "Summarize feedback into action items";
const SMOKE_INITIAL_INPUT = process.env.SMOKE_INITIAL_INPUT ?? "Customer loves the product but wants faster shipping.";
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_MS = 60000;

const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseSupabaseEnv = () => {
  let raw = "";
  try {
    raw = execSync("supabase status -o env 2>/dev/null || true", {
      encoding: "utf8",
      cwd: repoRoot,
    });
  } catch {
    fail("Could not run supabase status — is local Supabase running? (npm run db:start)");
  }

  const pick = (key) => {
    const m = raw.match(new RegExp(`^${key}="(.*)"$`, "m"));
    return m?.[1] ?? "";
  };

  const apiUrl = pick("API_URL");
  const anonKey = pick("ANON_KEY");
  const serviceKey = pick("SERVICE_ROLE_KEY");

  if (!apiUrl || !anonKey) {
    fail("Local Supabase is not running. Start with: npm run db:start");
  }

  return { apiUrl, anonKey, serviceKey };
};

const readJson = async (response, label) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    fail(`${label} returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
  }
};

const signInOrSignUp = async (apiUrl, anonKey) => {
  const authBase = `${apiUrl}/auth/v1`;
  const headers = {
    apikey: anonKey,
    "Content-Type": "application/json",
  };

  let signIn = await fetch(`${authBase}/token?grant_type=password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: SMOKE_EMAIL, password: SMOKE_PASSWORD }),
  });

  if (signIn.status === 400) {
    const signUp = await fetch(`${authBase}/signup`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: SMOKE_EMAIL, password: SMOKE_PASSWORD }),
    });
    const signUpJson = await readJson(signUp, "auth/signup");
    if (signUp.status >= 400 && !signUpJson.access_token) {
      console.log("signup response:", signUp.status, signUpJson);
      fail(`auth signup failed: ${signUp.status}`);
    }
    if (signUpJson.access_token) {
      return signUpJson.access_token;
    }

    signIn = await fetch(`${authBase}/token?grant_type=password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: SMOKE_EMAIL, password: SMOKE_PASSWORD }),
    });
  }

  const signInJson = await readJson(signIn, "auth/token");
  if (signIn.status !== 200 || !signInJson.access_token) {
    fail(`auth sign-in failed: ${signIn.status} ${signInJson.error_description ?? signInJson.msg ?? ""}`);
  }
  return signInJson.access_token;
};

const invokeFunction = async (apiUrl, anonKey, token, name, body) => {
  const url = `${apiUrl}/functions/v1/${name}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await readJson(response, name);
  return { response, json };
};

const fetchPipeline = async (apiUrl, anonKey, token, pipelineId) => {
  const url = `${apiUrl}/rest/v1/pipelines?id=eq.${pipelineId}&select=*`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  });
  const rows = await readJson(response, "pipelines/select");
  return rows[0];
};

const fetchExecution = async (apiUrl, anonKey, token, executionId) => {
  const url = `${apiUrl}/rest/v1/executions?id=eq.${executionId}&select=*`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  });
  const rows = await readJson(response, "executions/select");
  return rows[0];
};

const run = async () => {
  const { apiUrl, anonKey } = parseSupabaseEnv();
  console.log(`Pipeline smoke: ${apiUrl}`);

  const token = await signInOrSignUp(apiUrl, anonKey);
  console.log(`auth ok (${SMOKE_EMAIL})`);

  const { response: badQueryResp, json: badQueryJson } = await invokeFunction(
    apiUrl,
    anonKey,
    token,
    "generate-pipeline",
    { query: "   " },
  );
  if (badQueryResp.status !== 400 || badQueryJson.error !== "query required") {
    fail(`expected 400 for whitespace query, got ${badQueryResp.status}`);
  }
  console.log("edge case ok: whitespace query rejected");

  const { response: genResp, json: pipeline } = await invokeFunction(
    apiUrl,
    anonKey,
    token,
    "generate-pipeline",
    { query: SMOKE_QUERY },
  );
  console.log(`generate-pipeline status=${genResp.status} id=${pipeline.id ?? "n/a"}`);

  if (genResp.status !== 200) fail(`generate-pipeline failed: ${genResp.status} ${pipeline.error ?? ""}`);
  if (!pipeline.id) fail("generate-pipeline missing id");
  if (!Array.isArray(pipeline.steps) || pipeline.steps.length < 2) {
    fail(`generate-pipeline expected >= 2 steps, got ${pipeline.steps?.length ?? 0}`);
  }

  const dbRow = await fetchPipeline(apiUrl, anonKey, token, pipeline.id);
  if (!dbRow) fail("pipelines row not found in DB");
  if (dbRow.query !== SMOKE_QUERY) fail("pipelines.query mismatch");
  console.log(`DB pipelines row ok (steps=${dbRow.steps?.length ?? 0})`);

  const { response: execResp, json: execution } = await invokeFunction(
    apiUrl,
    anonKey,
    token,
    "execute-pipeline",
    { pipeline_id: pipeline.id, initial_input: SMOKE_INITIAL_INPUT },
  );
  console.log(`execute-pipeline status=${execResp.status} execId=${execution.id ?? "n/a"}`);

  if (execResp.status !== 200) fail(`execute-pipeline failed: ${execResp.status} ${execution.error ?? ""}`);
  if (!execution.id) fail("execute-pipeline missing id");

  const stepCount = pipeline.steps.length;
  const deadline = Date.now() + POLL_MAX_MS;
  let finalExec = execution;

  while (Date.now() < deadline) {
    finalExec = await fetchExecution(apiUrl, anonKey, token, execution.id);
    if (!finalExec) fail("executions row not found");
    if (finalExec.status === "completed" || finalExec.status === "failed") break;
    await sleep(POLL_INTERVAL_MS);
  }

  console.log(`execution status=${finalExec.status} logs=${finalExec.logs?.length ?? 0}`);

  if (finalExec.status !== "completed") {
    fail(`execution did not complete (status=${finalExec.status})`);
  }
  if (!Array.isArray(finalExec.logs) || finalExec.logs.length !== stepCount) {
    fail(`expected ${stepCount} log entries, got ${finalExec.logs?.length ?? 0}`);
  }

  const allCompleted = finalExec.logs.every((l) => l.status === "completed" && l.output);
  if (!allCompleted) fail("not all execution steps completed with output");

  console.log("PASS: auth → generate → DB → execute → completed");
};

run().catch((error) => fail(error instanceof Error ? error.message : String(error)));
