import { Search, Loader2, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThinkingAnimation } from "./ThinkingAnimation";
import { DEMO_PROMPTS } from "../../lib/agencyPromptPresets";

interface Props {
  loading: boolean;
  onGenerate: (q: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Business Types": "🏢",
};

export const GenerateBar = ({ loading, onGenerate }: Props) => {
  const [q, setQ] = useState("");
  const [showPresets, setShowPresets] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    if (!t || loading) return;
    onGenerate(t);
  };

  const handlePresetSelect = (prompt: string) => {
    setQ(prompt);
    setShowPresets(false);
    // Auto-focus the input after selection
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>("input[placeholder^='Describe']");
      input?.focus();
    }, 50);
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
        <div className="flex items-center gap-2 sm:pr-2">
          <motion.button
            type="button"
            onClick={() => setShowPresets(!showPresets)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors"
            title="Demo prompts"
          >
            <Sparkles className="h-5 w-5" />
          </motion.button>
          <button
            type="submit"
            disabled={loading || !q.trim()}
            className="relative inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full genesis-accent-bg text-obsidian font-bold text-xs sm:text-sm uppercase tracking-[0.18em] disabled:opacity-50 transition-transform hover:scale-[1.03] active:scale-[0.98] shrink-0 genesis-accent-glow"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
          </button>
        </div>
      </div>

      {/* Demo Presets Dropdown */}
      <AnimatePresence>
        {showPresets && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <div className="max-w-2xl mx-auto glass rounded-2xl border border-border/30 p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Demo Prompts
                </h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Agency PWA Templates
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEMO_PROMPTS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.prompt)}
                    className="text-left p-3 rounded-lg hover:bg-card/50 transition-colors text-sm group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground/60 group-hover:text-accent transition-colors">
                        {CATEGORY_ICONS[preset.category] || "📝"}
                      </span>
                      <span className="font-medium text-foreground">{preset.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-1">
                      {preset.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {loading && <ThinkingAnimation />}
      </AnimatePresence>
    </motion.form>
  );
};
