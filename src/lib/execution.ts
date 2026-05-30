export type StepExecutionResult = {
  stepId: string;
  stepName: string;
  outputKey: string;
  status: "running" | "completed" | "failed";
  data: unknown;
  summary?: string;
  qualityScore: number;
  warnings: string[];
  durationMs: number;
  promptUsed?: string;
  error?: string;
};

export type LogEntry = StepExecutionResult;

export type Execution = {
  id: string;
  pipeline_id: string;
  initial_input: string | null;
  status: "running" | "completed" | "failed";
  logs: StepExecutionResult[];
  pwa_assets?: Record<string, string> | null;
  created_at?: string;
  updated_at?: string;
};

export function parseExecutionRow(row: Record<string, unknown>): Execution {
  const status = row.status;
  return {
    id: String(row.id),
    pipeline_id: String(row.pipeline_id),
    initial_input: typeof row.initial_input === "string" ? row.initial_input : null,
    status: status === "running" || status === "completed" || status === "failed" ? status : "failed",
    logs: Array.isArray(row.logs) ? (row.logs as StepExecutionResult[]) : [],
    pwa_assets: row.pwa_assets && typeof row.pwa_assets === "object" ? (row.pwa_assets as Record<string, string>) : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

export function isTerminalStatus(status: Execution["status"]): boolean {
  return status === "completed" || status === "failed";
}
