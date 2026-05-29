import { Loader2, Play } from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";
import { StatusBadge } from "./LogsTab";

export function ExecutionPanel({
  canEdit,
  run,
  loadPastExecution,
}: {
  canEdit: boolean;
  run: () => void;
  loadPastExecution: (id: string) => void;
}) {
  const pipeline = useBuilderStore((s) => s.pipeline);
  const initialInput = useBuilderStore((s) => s.initialInput);
  const setInitialInput = useBuilderStore((s) => s.setInitialInput);
  const running = useBuilderStore((s) => s.running);
  const pastExecutions = useBuilderStore((s) => s.pastExecutions);
  const historyLimit = useBuilderStore((s) => s.historyLimit);
  const setHistoryLimit = useBuilderStore((s) => s.setHistoryLimit);
  const currentExecution = useBuilderStore((s) => s.execution);

  if (!pipeline) return null;

  return (
    <aside className="space-y-3">
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h2 className="font-semibold text-sm">Run pipeline</h2>
        <textarea
          value={initialInput}
          onChange={(e) => setInitialInput(e.target.value)}
          rows={6}
          maxLength={5000}
          placeholder="Initial input — replaces {{input}} in step 1"
          className="w-full bg-background border border-border rounded-md p-3 text-sm outline-none focus:ring-1 focus:ring-primary resize-y"
        />
        <button
          onClick={run}
          disabled={running || !canEdit}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-md font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Running..." : canEdit ? "Run pipeline" : "View only"}
        </button>
        {!canEdit && (
          <p className="text-xs text-muted-foreground">Only the pipeline owner can run executions.</p>
        )}
      </div>

      {pastExecutions.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <h2 className="font-semibold text-sm">Recent runs</h2>
          <ul className="space-y-1">
            {pastExecutions.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => loadPastExecution(ex.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs mono flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors ${
                    currentExecution?.id === ex.id ? "bg-muted/60" : ""
                  }`}
                >
                  <span className="truncate">{ex.id.slice(0, 8)}</span>
                  <StatusBadge status={ex.status} compact />
                </button>
              </li>
            ))}
          </ul>
          {pastExecutions.length >= historyLimit && (
            <button
              onClick={() => setHistoryLimit(historyLimit + 10)}
              className="w-full text-xs text-muted-foreground hover:text-foreground py-1 border border-border/50 rounded hover:bg-muted/30 transition-colors mt-2"
            >
              Load more
            </button>
          )}
        </div>
      )}

      {pipeline.query && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Original prompt</div>
          <p className="text-sm">{pipeline.query}</p>
        </div>
      )}
    </aside>
  );
}
