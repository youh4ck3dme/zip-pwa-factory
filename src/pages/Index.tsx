import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Index = () => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, signOut, user } = useAuth();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (trimmed.length > 2000) {
      toast.error("Query too long (max 2000 chars)");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-pipeline", {
        body: { query: trimmed },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      navigate(`/pipeline/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate pipeline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="absolute top-0 right-0 p-4 z-20 flex items-center gap-3">
        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
            <Shield className="h-3.5 w-3.5" /> ADMIN
          </span>
        )}
        <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
        <button
          onClick={signOut}
          className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] glow rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-2xl text-center space-y-8 z-10">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
              Prompt Pipeline Builder
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl font-medium">
              Sequential AI workflows from a single sentence.
            </p>
          </div>

          <form onSubmit={onSubmit} className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              maxLength={2000}
              className="w-full bg-card/80 backdrop-blur-sm border border-border rounded-full py-4 pl-12 pr-32 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50 transition-all shadow-2xl"
              placeholder="e.g. Summarize an article and translate it to Spanish"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
            </button>
          </form>

          <p className="text-xs text-muted-foreground">
            Variables: <code className="mono text-foreground/80">{"{{input}}"}</code> ·{" "}
            <code className="mono text-foreground/80">{"{{previous_output}}"}</code>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
