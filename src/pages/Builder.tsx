import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDown,
  Loader2,
  Play,
  Plus,
  Save,
  Trash2,
  Workflow,
  Code as CodeIcon,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Unlock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDeveloper } from "@/hooks/useDeveloper";
import { DevModal } from "@/components/DevModal";
import { toast } from "sonner";

type Step = { id: string; name: string; prompt: string };
type Pipeline = { id: string; title: string; query: string | null; steps: Step[] };
type LogEntry = {
  step_id: string;
  step_name: string;
  status: "running" | "completed" | "failed";
  prompt_used: string | null;
  output: string | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
};
type Execution = {
  id: string;
  pipeline_id: string;
  initial_input: string | null;
  status: "running" | "completed" | "failed";
  logs: LogEntry[];
};

type TabId = "workflow" | "code" | "logs";

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const dev = useDeveloper();
  const [devModal, setDevModal] = useState(false);

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("workflow");
  const [initialInput, setInitialInput] = useState("");
  const [running, setRunning] = useState(false);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Load pipeline
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.from("pipelines").select("*").eq("id", id).single();
      if (error) {
        toast.error("Pipeline not found");
      } else {
        setPipeline({
          id: data.id,
          title: data.title,
          query: data.query,
          steps: (data.steps as unknown as Step[]) || [],
        });
      }
      setLoading(false);
    })();
  }, [id]);

  // Realtime: subscribe to execution updates
  useEffect(() => {
    if (!execution?.id) return;
    const channel = supabase
      .channel(`exec-${execution.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "executions", filter: `id=eq.${execution.id}` },
        (payload) => {
          const row = payload.new as any;
          setExecution({
            id: row.id,
            pipeline_id: row.pipeline_id,
            initial_input: row.initial_input,
            status: row.status,
            logs: (row.logs as LogEntry[]) || [],
          });
          if (row.status !== "running") setRunning(false);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [execution?.id]);

  const updateStep = (idx: number, patch: Partial<Step>) => {
    if (!pipeline) return;
    const next = pipeline.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    setPipeline({ ...pipeline, steps: next });
    setDirty(true);
  };
  const addStep = () => {
    if (!pipeline) return;
    setPipeline({
      ...pipeline,
      steps: [
        ...pipeline.steps,
        { id: crypto.randomUUID(), name: `Step ${pipeline.steps.length + 1}`, prompt: "{{previous_output}}" },
      ],
    });
    setDirty(true);
  };
  const removeStep = (idx: number) => {
    if (!pipeline) return;
    setPipeline({ ...pipeline, steps: pipeline.steps.filter((_, i) => i !== idx) });
    setDirty(true);
  };

  const save = async () => {
    if (!pipeline) return;
    setSaving(true);
    const { error } = await supabase
      .from("pipelines")
      .update({ title: pipeline.title, steps: pipeline.steps as any, updated_at: new Date().toISOString() })
      .eq("id", pipeline.id);
    setSaving(false);
    if (error) toast.error("Save failed");
    else {
      toast.success("Saved");
      setDirty(false);
    }
  };

  const run = async () => {
    if (!pipeline) return;
    setRunning(true);
    setExecution(null);
    setTab("logs");
    try {
      const { data, error } = await supabase.functions.invoke("execute-pipeline", {
        body: { pipeline_id: pipeline.id, initial_input: initialInput },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setExecution({
        id: data.id,
        pipeline_id: data.pipeline_id,
        initial_input: data.initial_input,
        status: data.status,
        logs: (data.logs as LogEntry[]) || [],
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to start execution");
      setRunning(false);
    }
  };

  const codeJson = useMemo(() => JSON.stringify(pipeline, null, 2), [pipeline]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  if (!pipeline)
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Pipeline not found.
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {dev.isDev ? (
            <input
              value={pipeline.title}
              onChange={(e) => {
                setPipeline({ ...pipeline, title: e.target.value });
                setDirty(true);
              }}
              className="bg-transparent text-lg font-semibold outline-none focus:bg-muted/50 rounded px-2 py-1 -mx-2 flex-1 min-w-0"
            />
          ) : (
            <h1 className="text-lg font-semibold truncate flex-1">{pipeline.title}</h1>
          )}
          <div className="flex items-center gap-2">
            {dev.isDev && (
              <button
                onClick={save}
                disabled={!dirty || saving}
                className="flex items-center gap-2 bg-muted hover:bg-accent text-foreground px-3 py-1.5 rounded-md text-sm disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            )}
            <button
              onClick={() => setDevModal(true)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Developer mode"
            >
              {dev.isDev ? <Unlock className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 border-b border-border -mb-px">
          {([
            { id: "workflow", label: "Workflow", icon: <Workflow className="h-4 w-4" /> },
            { id: "code", label: "Code", icon: <CodeIcon className="h-4 w-4" /> },
            { id: "logs", label: "Logs", icon: <Terminal className="h-4 w-4" /> },
          ] as const).map((t) => {
            const active = tab === t.id;
            const visible = t.id !== "code" || dev.isDev;
            if (!visible) return null;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 transition-colors ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {tab === "workflow" && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <section className="space-y-3">
              {pipeline.steps.map((step, idx) => (
                <div key={step.id}>
                  <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold mono">
                        {idx + 1}
                      </div>
                      {dev.isDev ? (
                        <input
                          value={step.name}
                          onChange={(e) => updateStep(idx, { name: e.target.value })}
                          className="bg-transparent font-semibold outline-none focus:bg-muted/50 rounded px-2 py-1 -mx-2 flex-1"
                        />
                      ) : (
                        <span className="font-semibold flex-1">{step.name}</span>
                      )}
                      {dev.isDev && pipeline.steps.length > 1 && (
                        <button
                          onClick={() => removeStep(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Remove step"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {dev.isDev ? (
                      <textarea
                        value={step.prompt}
                        onChange={(e) => updateStep(idx, { prompt: e.target.value })}
                        rows={5}
                        className="w-full bg-background border border-border rounded-md p-3 text-sm mono outline-none focus:ring-1 focus:ring-primary resize-y"
                      />
                    ) : (
                      <pre className="text-sm mono text-muted-foreground whitespace-pre-wrap bg-background/50 border border-border rounded-md p-3">
                        {step.prompt}
                      </pre>
                    )}
                  </div>
                  {idx < pipeline.steps.length - 1 && (
                    <div className="flex justify-center py-1 text-muted-foreground">
                      <ArrowDown className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {dev.isDev && (
                <button
                  onClick={addStep}
                  className="w-full border border-dashed border-border rounded-lg py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-card transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> Add step
                </button>
              )}
            </section>

            <aside className="space-y-3">
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <h2 className="font-semibold text-sm">Run pipeline</h2>
                <textarea
                  value={initialInput}
                  onChange={(e) => setInitialInput(e.target.value)}
                  rows={6}
                  placeholder="Initial input — replaces {{input}} in step 1"
                  className="w-full bg-background border border-border rounded-md p-3 text-sm outline-none focus:ring-1 focus:ring-primary resize-y"
                />
                <button
                  onClick={run}
                  disabled={running}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-md font-medium flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {running ? "Running..." : "Run pipeline"}
                </button>
              </div>

              {pipeline.query && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Original prompt</div>
                  <p className="text-sm">{pipeline.query}</p>
                </div>
              )}
            </aside>
          </div>
        )}

        {tab === "code" && dev.isDev && (
          <pre className="bg-card border border-border rounded-lg p-4 text-sm mono overflow-auto scrollbar-thin">
            {codeJson}
          </pre>
        )}

        {tab === "logs" && <LogsView execution={execution} running={running} />}
      </main>

      <DevModal open={devModal} onClose={() => setDevModal(false)} />
    </div>
  );
}

function LogsView({ execution, running }: { execution: Execution | null; running: boolean }) {
  if (!execution) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
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
    <div className="space-y-3">
      <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3 text-sm">
        <StatusBadge status={execution.status} />
        <span className="text-muted-foreground mono text-xs">{execution.id.slice(0, 8)}</span>
      </div>
      {execution.logs.map((log, i) => (
        <details
          key={i}
          open={log.status !== "completed" || i === execution.logs.length - 1}
          className="bg-card border border-border rounded-lg overflow-hidden group"
        >
          <summary className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 list-none">
            <StatusIcon status={log.status} />
            <span className="font-medium text-sm flex-1">
              <span className="text-muted-foreground mono mr-2">#{i + 1}</span>
              {log.step_name}
            </span>
            <span className="text-xs text-muted-foreground mono uppercase">{log.status}</span>
          </summary>
          <div className="px-4 pb-4 space-y-3 border-t border-border/50">
            {log.prompt_used && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-3 mb-1">Prompt</div>
                <pre className="bg-background/60 border border-border rounded p-3 text-xs mono whitespace-pre-wrap">
                  {log.prompt_used}
                </pre>
              </div>
            )}
            {log.output && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Output</div>
                <pre className="bg-background/60 border border-border rounded p-3 text-sm whitespace-pre-wrap">
                  {log.output}
                </pre>
              </div>
            )}
            {log.error && (
              <div>
                <div className="text-xs uppercase tracking-wider text-destructive mb-1">Error</div>
                <pre className="bg-destructive/10 border border-destructive/30 text-destructive rounded p-3 text-xs mono whitespace-pre-wrap">
                  {log.error}
                </pre>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

function StatusIcon({ status }: { status: LogEntry["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-success" style={{ color: "hsl(var(--success))" }} />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
}

function StatusBadge({ status }: { status: Execution["status"] }) {
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
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-semibold mono ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}
