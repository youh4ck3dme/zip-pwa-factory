const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extract a user-facing message from supabase.functions.invoke result. */
export async function getFunctionInvokeError(data: unknown, error: unknown): Promise<string> {
  if (data && typeof data === "object" && "error" in data) {
    const msg = (data as { error: unknown }).error;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }

  if (error && typeof error === "object" && "context" in error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        const body = await ctx.clone().json();
        if (body?.error) return String(body.error);
      } catch {
        /* ignore */
      }
    }
  }

  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "Request failed";
}

export function isValidPipelineId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

export const STALE_EXECUTION_MS = 10 * 60 * 1000;

export function isStaleRunningExecution(
  status: string,
  updatedAt: string | undefined,
  now = Date.now(),
): boolean {
  if (status !== "running" || !updatedAt) return false;
  const ts = Date.parse(updatedAt);
  if (Number.isNaN(ts)) return false;
  return now - ts > STALE_EXECUTION_MS;
}
