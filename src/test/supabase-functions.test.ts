import { describe, expect, it } from "vitest";
import { isStaleRunningExecution, isValidPipelineId } from "@/lib/supabase-functions";

describe("supabase-functions helpers", () => {
  it("validates pipeline UUID", () => {
    expect(isValidPipelineId("95ff74cc-ca28-4c6c-a84c-1e10dff560c2")).toBe(true);
    expect(isValidPipelineId("not-a-uuid")).toBe(false);
    expect(isValidPipelineId(undefined)).toBe(false);
  });

  it("detects stale running executions", () => {
    const old = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const recent = new Date().toISOString();
    expect(isStaleRunningExecution("running", old)).toBe(true);
    expect(isStaleRunningExecution("running", recent)).toBe(false);
    expect(isStaleRunningExecution("completed", old)).toBe(false);
  });
});
