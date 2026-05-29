import { describe, expect, it } from "vitest";
import { isTerminalStatus, parseExecutionRow } from "@/lib/execution";

describe("execution helpers", () => {
  it("parses execution row from Supabase payload", () => {
    const row = parseExecutionRow({
      id: "abc-123",
      pipeline_id: "pipe-1",
      initial_input: "hello",
      status: "completed",
      logs: [{ step_id: "s1", step_name: "Analyze", status: "completed" }],
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(row.id).toBe("abc-123");
    expect(row.logs).toHaveLength(1);
    expect(isTerminalStatus(row.status)).toBe(true);
  });

  it("treats running as non-terminal", () => {
    expect(isTerminalStatus("running")).toBe(false);
  });
});
