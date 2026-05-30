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
  const headers = { apikey: anonKey, "Content-Type": "application/json" };
  let signIn = await fetch(`${authBase}/token?grant_type=password`, {
    method: "POST", headers, body: JSON.stringify({ email: SMOKE_EMAIL, password: SMOKE_PASSWORD })
  });
  if (signIn.status === 400) {
    const signUp = await fetch(`${authBase}/signup`, {
      method: "POST", headers, body: JSON.stringify({ email: SMOKE_EMAIL, password: SMOKE_PASSWORD })
    });
    const signUpJson = await readJson(signUp, "auth/signup");
    if (signUp.status >= 400 && !signUpJson.access_token) {
      fail(`auth signup failed: ${signUp.status} ${JSON.stringify(signUpJson)}`);
    }
    if (signUpJson.access_token) return signUpJson.access_token;
    signIn = await fetch(`${authBase}/token?grant_type=password`, {
      method: "POST", headers, body: JSON.stringify({ email: SMOKE_EMAIL, password: SMOKE_PASSWORD })
    });
  }
  const signInJson = await readJson(signIn, "auth/token");
  if (signIn.status !== 200 || !signInJson.access_token) {
    fail(`auth sign-in failed: ${signIn.status} ${JSON.stringify(signInJson)}`);
  }
  return signInJson.access_token;
};

const invokeFunction = async (apiUrl, anonKey, token, name, body) => {
  const url = `${apiUrl}/functions/v1/${name}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await readJson(response, name);
  return { response, json };
};

const fetchExecution = async (apiUrl, anonKey, token, executionId) => {
  const url = `${apiUrl}/rest/v1/executions?id=eq.${executionId}&select=*`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, apikey: anonKey } });
  const rows = await readJson(response, "executions/select");
  if (!Array.isArray(rows)) fail(`fetchExecution returned non-array: ${JSON.stringify(rows)}`);
  return rows[0]; // could be undefined
};

const run = async () => {
  const { apiUrl, anonKey } = parseSupabaseEnv();
  console.log(`Pipeline smoke: ${apiUrl}`);

  const token = await signInOrSignUp(apiUrl, anonKey);
  console.log(`auth ok (${SMOKE_EMAIL})`);

  // Edge case test
  const { response: badQueryResp, json: badQueryJson } = await invokeFunction(
    apiUrl, anonKey, token, "generate-pipeline", { query: "   " }
  );
  if (badQueryResp.status !== 400 || badQueryJson.error !== "query required") {
    fail(`expected 400 for whitespace query, got ${badQueryResp.status} JSON: ${JSON.stringify(badQueryJson)}`);
  }
  console.log("edge case ok: whitespace query rejected");

  // TEST 1: Full Mock Execution
  const { response: genResp, json: pipeline } = await invokeFunction(
    apiUrl, anonKey, token, "generate-pipeline", { query: SMOKE_QUERY }
  );
  if (genResp.status !== 200) fail(`generate-pipeline failed: ${genResp.status} JSON: ${JSON.stringify(pipeline)}`);
  if (!pipeline || typeof pipeline !== "object") fail(`generate-pipeline returned bad data shape: ${JSON.stringify(pipeline)}`);
  if (!pipeline.id) fail(`generate-pipeline returned no id: ${JSON.stringify(pipeline)}`);
  console.log(`generate-pipeline ok, pipeline.id=${pipeline.id}`);

  const { response: execResp, json: execution } = await invokeFunction(
    apiUrl, anonKey, token, "execute-pipeline", { pipeline_id: pipeline.id, initial_input: SMOKE_INITIAL_INPUT }
  );
  if (execResp.status !== 200) fail(`execute-pipeline failed: ${execResp.status} JSON: ${JSON.stringify(execution)}`);
  if (!execution || typeof execution !== "object") fail(`execute-pipeline returned bad data shape: ${JSON.stringify(execution)}`);
  
  // SUPPORT executionId OR id (because contract was updated to return full exec, but we check both to be safe)
  const execId = execution.id || execution.executionId;
  if (!execId) fail(`execute-pipeline returned no id/executionId: ${JSON.stringify(execution)}`);
  console.log(`execute-pipeline ok, execId=${execId}`);

  let finalExec = execution;
  const deadline = Date.now() + POLL_MAX_MS;
  while (Date.now() < deadline) {
    const fetched = await fetchExecution(apiUrl, anonKey, token, execId);
    if (!fetched) {
      console.log(`fetchExecution returned undefined for id=${execId}, retrying...`);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    finalExec = fetched;
    if (finalExec.status === "completed" || finalExec.status === "failed") break;
    await sleep(POLL_INTERVAL_MS);
  }

  if (!finalExec) fail("finalExec is undefined after polling.");
  if (finalExec.status !== "completed") fail(`execution did not complete (status=${finalExec?.status}) JSON: ${JSON.stringify(finalExec)}`);
  const allCompleted = finalExec.logs?.every((l) => l.status === "completed" && l.data);
  if (!allCompleted) fail(`not all execution steps completed with output. JSON: ${JSON.stringify(finalExec.logs)}`);
  
  if (!finalExec.pwa_assets || !finalExec.pwa_assets["index.html"] || !finalExec.pwa_assets["manifest.json"]) {
    fail(`export artifact shape is missing pwa_assets (index.html or manifest.json). JSON: ${JSON.stringify(finalExec.pwa_assets)}`);
  }
  console.log("PASS: auth → generate → DB → execute → completed (artifacts verified)");

  // TEST 2: Negative Test (Missing Interpolation Key)
  const { json: negPipeline } = await invokeFunction(apiUrl, anonKey, token, "generate-pipeline", { query: "TEST_MISSING_KEY" });
  if (!negPipeline?.id) fail(`negative generate-pipeline failed: ${JSON.stringify(negPipeline)}`);
  
  const { json: negExecution } = await invokeFunction(apiUrl, anonKey, token, "execute-pipeline", { pipeline_id: negPipeline.id, initial_input: "" });
  const negExecId = negExecution?.id || negExecution?.executionId;
  if (!negExecId) fail(`negative execute-pipeline failed: ${JSON.stringify(negExecution)}`);
  
  let negFinal = negExecution;
  const negDeadline = Date.now() + POLL_MAX_MS;
  while (Date.now() < negDeadline) {
    const fetched = await fetchExecution(apiUrl, anonKey, token, negExecId);
    if (fetched) negFinal = fetched;
    if (negFinal?.status === "completed" || negFinal?.status === "failed") break;
    await sleep(POLL_INTERVAL_MS);
  }
  if (negFinal?.status !== "failed") fail(`negative test should have failed. JSON: ${JSON.stringify(negFinal)}`);
  if (!negFinal.logs?.[0]?.error?.includes("Missing required context key: undefinedKey")) {
    fail(`negative test error mismatch. Logs: ${JSON.stringify(negFinal.logs)}`);
  }
  console.log("PASS: negative test (missing key interpolation) handled cleanly");

  // TEST 3: Webhook Safety
  const { json: webPipeline } = await invokeFunction(apiUrl, anonKey, token, "generate-pipeline", { query: "TEST_WEBHOOK" });
  if (!webPipeline?.id) fail(`webhook generate-pipeline failed: ${JSON.stringify(webPipeline)}`);
  
  const { json: webExecution } = await invokeFunction(apiUrl, anonKey, token, "execute-pipeline", { pipeline_id: webPipeline.id, initial_input: "" });
  const webExecId = webExecution?.id || webExecution?.executionId;
  if (!webExecId) fail(`webhook execute-pipeline failed: ${JSON.stringify(webExecution)}`);
  
  let webFinal = webExecution;
  const webDeadline = Date.now() + POLL_MAX_MS;
  while (Date.now() < webDeadline) {
    const fetched = await fetchExecution(apiUrl, anonKey, token, webExecId);
    if (fetched) webFinal = fetched;
    if (webFinal?.status === "completed" || webFinal?.status === "failed") break;
    await sleep(POLL_INTERVAL_MS);
  }
  
  if (webFinal?.logs?.[0]?.data !== "Webhook placeholder - disabled by default") {
    fail(`webhook safety test failed: ${JSON.stringify(webFinal?.logs?.[0])}`);
  }
  console.log("PASS: webhook safety test (disabled by default)");

  console.log("ALL VERIFICATION PASSED! 🚀");
};

run().catch((error) => fail(error instanceof Error ? error.message : String(error)));
