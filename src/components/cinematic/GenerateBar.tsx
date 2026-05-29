import { Search, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThinkingAnimation } from "./ThinkingAnimation";
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
      className="relative w-full max-w-2xl mx-auto px-2 sm:px-0"
    >
      <div className="absolute inset-2 sm:inset-0 rounded-3xl sm:rounded-full genesis-pulse pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center glass rounded-3xl sm:rounded-full p-2 sm:pl-6 sm:pr-2 sm:py-2 gap-2 sm:gap-0">
        <div className="flex items-center flex-1 min-w-0 pl-3 sm:pl-0">
          <Search className="h-5 w-5 genesis-accent-text shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            maxLength={2000}
            disabled={loading}
            placeholder="Describe a pipeline…"
            className="flex-1 min-w-0 bg-transparent outline-none px-3 sm:px-4 py-2.5 text-foreground placeholder:text-muted-foreground/70 text-sm sm:text-base"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="relative inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full genesis-accent-bg text-obsidian font-bold text-xs sm:text-sm uppercase tracking-[0.18em] disabled:opacity-50 transition-transform hover:scale-[1.03] active:scale-[0.98] shrink-0 genesis-accent-glow"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
        </button>
      </div>

      <AnimatePresence>
        {loading && <ThinkingAnimation />}
      </AnimatePresence>
    </motion.form>
  );
};
