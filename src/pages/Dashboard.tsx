import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Trash2, Workflow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type PipelineSummary = {
  id: string;
  title: string;
  updated_at: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchPipelines();
  }, [user]);

  const fetchPipelines = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pipelines")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to load pipelines: " + error.message);
    } else {
      setPipelines(data || []);
    }
    setLoading(false);
  };

  const deletePipeline = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this pipeline?")) return;
    
    const { error } = await supabase.from("pipelines").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete: " + error.message);
    } else {
      toast.success("Pipeline deleted");
      setPipelines((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">My Pipelines</h1>
          
          <button
            onClick={async () => {
              try {
                const { data, error } = await supabase.auth.registerPasskey();
                if (error) throw error;
                if (data) toast.success("Biometrics registered successfully!");
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : "Failed to register biometrics";
                toast.error(msg);
              }
            }}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Enable Biometrics
          </button>

          <Link
            to="/"
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Pipeline
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {pipelines.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-lg bg-card/30">
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No pipelines yet</h3>
            <p className="text-muted-foreground mb-6">You haven't created any pipelines. Generate one to get started.</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-md text-sm font-medium transition-colors"
            >
              Generate Pipeline
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {pipelines.map((pipeline) => (
              <Link
                key={pipeline.id}
                to={`/pipeline/${pipeline.id}`}
                className="group flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-sm transition-all"
              >
                <div>
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">{pipeline.title}</h3>
                  <p className="text-xs text-muted-foreground mono">
                    Updated {formatDistanceToNow(new Date(pipeline.updated_at))} ago
                  </p>
                </div>
                <button
                  onClick={(e) => deletePipeline(pipeline.id, e)}
                  className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete pipeline"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
