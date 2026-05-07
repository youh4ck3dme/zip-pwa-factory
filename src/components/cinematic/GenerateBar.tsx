import { Search, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";

interface Props {
  loading: boolean;
  onGenerate: (q: string) => void;
}

export const GenerateBar = ({ loading, onGenerate }: Props) => {
  const [q, setQ] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (!t || loading) return;
    onGenerate(t);
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, mass: 1, delay: 1.2 }}
      className="relative w-full max-w-2xl mx-auto"
    >
      <div className="absolute inset-0 rounded-full animate-pulse-amber pointer-events-none" />
      <div className="relative flex items-center glass rounded-full pl-6 pr-2 py-2">
        <Search className="h-5 w-5 text-amber/80 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={2000}
          disabled={loading}
          placeholder="Describe a pipeline…  e.g. summarize then translate to Spanish"
          className="flex-1 bg-transparent outline-none px-4 py-2.5 text-foreground placeholder:text-muted-foreground/70 text-base"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber text-obsidian font-bold text-sm uppercase tracking-[0.18em] disabled:opacity-50 transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{ boxShadow: "0 0 40px hsl(var(--amber)/0.5)" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
        </button>
      </div>
    </motion.form>
  );
};
