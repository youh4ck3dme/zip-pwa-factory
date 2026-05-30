import { CheckCircle2, Clock, Loader2, XCircle, ChevronRight, Terminal } from "lucide-react";
import { type Execution, type LogEntry } from "@/lib/execution";
import { useEffect, useRef } from "react";

export function LogsView({ execution, running }: { execution: Execution | null; running: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when logs update to keep latest steps in view
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [execution?.logs.length, execution?.status, running]);

  if (!execution) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground" data-testid="empty-logs">
        {running ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Starting execution...
          </div>
        ) : (
          "Run the pipeline to see logs here."
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4" data-testid="logs-view">
      <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3 text-sm mb-6 mx-2">
        <StatusBadge status={execution.status} />
        <span className="text-muted-foreground mono text-xs" data-testid="execution-id">{execution.id.slice(0, 8)}</span>
      </div>

      {execution.logs.map((log, i) => (
        <LogItem key={i} log={log} index={i} isLast={i === execution.logs.length - 1} />
      ))}
      
      {running && execution.status === "running" && (
        <div className="flex items-start text-sm" data-testid="thinking-indicator">
          <div className="mr-4 text-muted-foreground flex items-center justify-center w-5 h-5 mt-0.5">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="flex-grow">
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-3">
                <span>Thinking</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invisible element to serve as scroll target */}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}

function LogItem({ log, index, isLast }: { log: LogEntry; index: number; isLast: boolean }) {
  const isOpen = log.status !== "completed" || isLast;
  
  return (
    <div className="flex items-start text-sm mb-5">
      <div className="mr-4 text-muted-foreground flex items-center justify-center w-5 h-5 mt-0.5">
        {log.status === "running" ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : log.status === "failed" ? (
          <XCircle className="h-4 w-4 text-destructive" />
        ) : (
          <Terminal className="h-4 w-4" />
        )}
      </div>
      
      <details
        open={isOpen}
        className="group flex-grow [&_summary::-webkit-details-marker]:hidden"
      >
        <summary className="flex items-center justify-between cursor-pointer mb-3 text-muted-foreground group-open:text-foreground list-none focus:outline-none">
          <div className="flex items-center gap-3">
            <span>{log.stepName || `Step ${index + 1}`}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-open:rotate-90 transition-transform" />
          </div>
          
          {log.status === "completed" && (
            <div className="text-muted-foreground text-xs font-mono">COMPLETED ({log.durationMs}ms)</div>
          )}
        </summary>
        
        <div className="bg-transparent border border-border rounded-lg overflow-hidden mb-2 ml-0.5">
          <div className="px-4 py-2.5 border-b border-border font-mono text-[13px] text-muted-foreground bg-white/5 flex justify-between items-center">
            <span>Terminal (agent)</span>
            <span className="uppercase text-[10px] tracking-wider font-semibold">{log.status}</span>
          </div>
          <div className="p-4 font-mono text-[13px] text-muted-foreground leading-relaxed whitespace-pre-wrap break-all">
            {log.promptUsed && (
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Prompt</div>
                <div className="text-zinc-300">{log.promptUsed}</div>
              </div>
            )}
            
            {(log.data || log.summary) && (
              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Output {log.qualityScore !== undefined && `(Score: ${log.qualityScore})`}</div>
                <div className="text-zinc-400">{log.summary ? log.summary : JSON.stringify(log.data, null, 2)}</div>
              </div>
            )}

            {log.error && (
              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wider text-red-500/70 mb-1">Error</div>
                <div className="text-red-400">{log.error}</div>
              </div>
            )}
            
            {log.status === "running" && (
              <span className="inline-block w-[7px] h-[14px] bg-zinc-600 align-text-bottom ml-1 animate-pulse"></span>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}

export function StatusBadge({ status, compact }: { status: Execution["status"]; compact?: boolean }) {
  const map = {
    running: { label: "RUNNING", icon: <Clock className="h-3.5 w-3.5" />, cls: "bg-primary/15 text-primary border-primary/30" },
    completed: {
      label: "COMPLETED",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      cls: "border-border text-foreground bg-muted",
    },
    failed: { label: "FAILED", icon: <XCircle className="h-3.5 w-3.5" />, cls: "bg-destructive/15 text-destructive border-destructive/30" },
  } as const;
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-semibold mono ${compact ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs"} ${s.cls}`}
    >
      {!compact && s.icon}
      {s.label}
    </span>
  );
}
