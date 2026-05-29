export type LogEntry = {
  step_id: string;
  step_name: string;
  status: "running" | "completed" | "failed";
  prompt_used: string | null;
  output: string | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type Execution = {
  id: string;
  pipeline_id: string;
  initial_input: string | null;
  status: "running" | "completed" | "failed";
  logs: LogEntry[];
  created_at?: string;
  updated_at?: string;
};

export function parseExecutionRow(row: Record<string, unknown>): Execution {
  const status = row.status;
  return {
    id: String(row.id),
    pipeline_id: String(row.pipeline_id),
    initial_input: typeof row.initial_input === "string" ? row.initial_input : null,
    status:
      status === "running" || status === "completed" || status === "failed" ? status : "failed",
    logs: Array.isArray(row.logs) ? (row.logs as LogEntry[]) : [],
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

export function isTerminalStatus(status: Execution["status"]): boolean {
  return status === "completed" || status === "failed";
}
