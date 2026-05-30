import { useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type Execution, isTerminalStatus, parseExecutionRow } from "@/lib/execution";
import { getFunctionInvokeError, isStaleRunningExecution } from "@/lib/supabase-functions";
import { useBuilderStore, type Step, type Pipeline } from "@/store/useBuilderStore";

import { PipelineHeader } from "./components/PipelineHeader";
import { WorkflowTab } from "./components/WorkflowTab";
import { CodeTab } from "./components/CodeTab";
import { LogsView } from "./components/LogsTab";
import { ExecutionPanel } from "./components/ExecutionPanel";
import type { Json } from "@/integrations/supabase/types";

const POLL_MS = 2000;

async function fetchExecutionById(id: string): Promise<Execution | null> {
  const { data, error } = await supabase.from("executions").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return parseExecutionRow(data as Record<string, unknown>);
}

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const pipeline = useBuilderStore((s) => s.pipeline);
  const loading = useBuilderStore((s) => s.loading);
  const tab = useBuilderStore((s) => s.tab);
  const running = useBuilderStore((s) => s.running);
  const execution = useBuilderStore((s) => s.execution);
  const pastExecutions = useBuilderStore((s) => s.pastExecutions);
  const historyLimit = useBuilderStore((s) => s.historyLimit);
  const saving = useBuilderStore((s) => s.saving);
  const dirty = useBuilderStore((s) => s.dirty);
  const initialInput = useBuilderStore((s) => s.initialInput);

  const setPipeline = useBuilderStore((s) => s.setPipeline);
  const setLoading = useBuilderStore((s) => s.setLoading);
  const setTab = useBuilderStore((s) => s.setTab);
  const setRunning = useBuilderStore((s) => s.setRunning);
  const setExecution = useBuilderStore((s) => s.setExecution);
  const setPastExecutions = useBuilderStore((s) => s.setPastExecutions);
  const setInitialInput = useBuilderStore((s) => s.setInitialInput);
  const setSaving = useBuilderStore((s) => s.setSaving);
  const setDirty = useBuilderStore((s) => s.setDirty);

  const lastRealtimeUpdate = useRef<number>(Date.now());

  const canEdit = !!pipeline && !!user && (isAdmin || pipeline.owner_id === user.id);

  const applyExecution = useCallback((row: Execution) => {
    if (isStaleRunningExecution(row.status, row.updated_at ?? row.created_at)) {
      row = {
        ...row,
        status: "failed",
        logs: [
          ...row.logs,
          {
            stepId: "stale",
            stepName: "System Timeout",
            outputKey: "timeout",
            status: "failed",
            error: "Execution timed out or backend process died.",
            promptUsed: "",
            data: null,
            qualityScore: 0,
            warnings: [],
            durationMs: 0,
          },
        ],
      };
    }
    setExecution(row);
    if (isTerminalStatus(row.status)) setRunning(false);
  }, [setExecution, setRunning]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!id || authLoading) return;
    (async () => {
      setLoading(true);
      
      if (user?.id === "dev-bypass-user") {
        const { db } = await import("@/lib/db");
        const localPipe = await db.pipelines.get(id);
        if (!localPipe) {
          toast.error("Local pipeline not found");
        } else {
          setPipeline({
            id: localPipe.id,
            title: localPipe.title,
            query: localPipe.query,
            owner_id: localPipe.owner_id,
            steps: localPipe.steps,
          });
          setPastExecutions([]);
        }
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.from("pipelines").select("*").eq("id", id).single();
      if (error) {
        toast.error("Pipeline not found");
      } else {
        setPipeline({
          id: data.id,
          title: data.title,
          query: data.query,
          owner_id: data.owner_id,
          steps: (data.steps as unknown as Step[]) || [],
        });

        const { data: history } = await supabase
          .from("executions")
          .select("*")
          .eq("pipeline_id", id)
          .order("created_at", { ascending: false })
          .limit(historyLimit);

        const rows = (history ?? []).map((r) => parseExecutionRow(r as Record<string, unknown>));
        setPastExecutions(rows);

        if (historyLimit === 10) {
          const latest = rows[0];
          if (latest) {
            applyExecution(latest);
            if (latest.status === "running" && !isStaleRunningExecution(latest.status, latest.updated_at ?? latest.created_at)) {
              setRunning(true);
            }
            if (latest.initial_input) setInitialInput(latest.initial_input);
          }
        }
      }
      setLoading(false);
    })();
  }, [id, applyExecution, historyLimit, setLoading, setPipeline, setPastExecutions, setRunning, setInitialInput, user?.id, authLoading]);

  useEffect(() => {
    if (!execution?.id) return;

    const channel = supabase
      .channel(`exec-${execution.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "executions", filter: `id=eq.${execution.id}` },
        (payload) => {
          lastRealtimeUpdate.current = Date.now();
          applyExecution(parseExecutionRow(payload.new as Record<string, unknown>));
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("Realtime channel error — polling will continue");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [execution?.id, applyExecution]);

  useEffect(() => {
    if (!running || !execution?.id) return;

    const poll = async () => {
      if (Date.now() - lastRealtimeUpdate.current < 4000) return;
      
      const row = await fetchExecutionById(execution.id);
      if (row) applyExecution(row);
    };

    const timer = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(timer);
  }, [running, execution?.id, applyExecution]);

  const save = async () => {
    if (!pipeline) return;
    setSaving(true);
    
    if (user?.id === "dev-bypass-user") {
      const { db } = await import("@/lib/db");
      await db.pipelines.update(pipeline.id, {
        title: pipeline.title,
        steps: pipeline.steps as unknown as Step[],
        updated_at: new Date().toISOString(),
      });
      setSaving(false);
      toast.success("Saved locally");
      setDirty(false);
      return;
    }

    const { error } = await supabase
      .from("pipelines")
      .update({
        title: pipeline.title,
        steps: pipeline.steps as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pipeline.id);
    setSaving(false);
    if (error) toast.error("Save failed: " + error.message);
    else {
      toast.success("Saved");
      setDirty(false);
    }
  };

  const run = async () => {
    if (!pipeline || !canEdit) return;
    if (initialInput.length > 5000) {
      toast.error("Input too long (max 5000 chars)");
      return;
    }
    setRunning(true);
    setExecution(null);
    setTab("logs");
    
    if (user?.id === "dev-bypass-user") {
      toast.info("Execution is simulated in dev mode.");
      setTimeout(() => {
        setRunning(false);
      }, 1500);
      return;
    }

    try {
      lastRealtimeUpdate.current = Date.now();
      const { data, error } = await supabase.functions.invoke("execute-pipeline", {
        body: { pipeline_id: pipeline.id, initial_input: initialInput },
      });
      if (error) {
        toast.error(await getFunctionInvokeError(data, error));
        setRunning(false);
        return;
      }
      if (data?.error) {
        toast.error(String(data.error));
        setRunning(false);
        return;
      }
      const row = parseExecutionRow(data as Record<string, unknown>);
      applyExecution(row);
      setPastExecutions([row, ...pastExecutions.filter((e) => e.id !== row.id)]);
    } catch (err: unknown) {
      toast.error(await getFunctionInvokeError(null, err));
      setRunning(false);
    }
  };

  const loadPastExecution = async (execId: string) => {
    const row = await fetchExecutionById(execId);
    if (!row) {
      toast.error("Execution not found");
      return;
    }
    applyExecution(row);
    setRunning(row.status === "running");
    setTab("logs");
  };

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
      <PipelineHeader canEdit={canEdit} isAdmin={isAdmin} save={save} saving={saving} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {tab === "workflow" && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-4 sm:gap-6">
            <WorkflowTab canEdit={canEdit} />
            <ExecutionPanel canEdit={canEdit} run={run} loadPastExecution={loadPastExecution} />
          </div>
        )}

        {tab === "code" && <CodeTab canEdit={canEdit} />}

        {tab === "logs" && <LogsView execution={execution} running={running} />}
      </main>
    </div>
  );
}
