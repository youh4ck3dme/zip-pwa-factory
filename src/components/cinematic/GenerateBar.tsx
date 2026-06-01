import { Search, Loader2, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThinkingAnimation } from "./ThinkingAnimation";

interface Props {
  loading: boolean;
  onGenerate: (q: string) => void;
}

// Preset demo prompts for agency PWA generation
// Each prompt contains all 10 required extraction anchors:
// 1. business type  2. business name (called ...)  3. primary feature
// 4. visual style   5. hero headline in quotes      6. concrete services/items
// 7. opening hours  8. contact footer               9. strong "..." CTA
// 10. PWA/landing page wording
const DEMO_PROMPTS = [
  {
    id: "barber",
    label: "Barber Shop",
    prompt: `Create a premium PWA landing page for a barber shop called Sharp & Co. Barbershop with online booking, service showcase, and bold dark theme. Hero headline "Crafted for the Modern Gentleman". Signature services: Classic Haircut, Hot Towel Shave, Beard Sculpt, and Fade & Style. Opening hours Monday to Saturday 9 AM – 8 PM. Contact footer with address and phone. Strong "Book Your Cut" CTA.`,
    category: "Business Types"
  },
  {
    id: "salon",
    label: "Beauty Salon",
    prompt: `Create a premium PWA landing page for a beauty salon called Lumière Beauty Studio with appointment booking, treatments showcase, and elegant blush-gold theme. Hero headline "Where Beauty Meets Precision". Signature treatments: Hydra Facial, Keratin Treatment, Gel Manicure, and Lash Lift. Opening hours Tuesday to Sunday 10 AM – 7 PM. Contact footer with studio address and email. Strong "Reserve Your Session" CTA.`,
    category: "Business Types"
  },
  {
    id: "restaurant",
    label: "Fine Dining",
    prompt: `Create a premium PWA landing page for a fine dining restaurant called Éclat Fine Dining with menu preview, reservation system, sophisticated dark gold theme. Hero headline "A Symphony of Flavors". Signature dishes Truffle Risotto and Duck Confit. Opening hours Wednesday to Sunday 6 PM – 11 PM. Contact footer with address and reservation email. Strong "Reserve Your Table" CTA.`,
    category: "Business Types"
  },
  {
    id: "cafe",
    label: "Coffee Shop",
    prompt: `Create a premium PWA landing page for a specialty coffee shop called Driftwood Coffee Co. with online ordering, menu highlights, and warm earthy theme. Hero headline "Every Cup Tells a Story". Signature drinks: Single Origin Pour-Over, Oat Milk Flat White, Cold Brew Tonic, and Matcha Latte. Opening hours daily 7 AM – 6 PM. Contact footer with café address and Instagram. Strong "Order Your Brew" CTA.`,
    category: "Business Types"
  },
  {
    id: "agency",
    label: "Creative Agency",
    prompt: `Create a premium PWA landing page for a creative digital agency called Nova Studio with portfolio showcase, services grid, and deep navy neon theme. Hero headline "We Build Brands That Move People". Signature services: Brand Identity, Web Design, Motion Graphics, and Digital Strategy. Opening hours Monday to Friday 9 AM – 6 PM. Contact footer with studio email and LinkedIn. Strong "Start Your Project" CTA.`,
    category: "Business Types"
  },
  {
    id: "fitness",
    label: "Fitness Studio",
    prompt: `Create a premium PWA landing page for a fitness studio called Apex Performance Studio with class schedule, trainer profiles, membership signup, and high-energy dark theme. Hero headline "Train Hard. Live Strong.". Signature classes: HIIT Burn, Power Yoga, Strength & Conditioning, and Spin Cycle. Opening hours Monday to Sunday 6 AM – 10 PM. Contact footer with studio address and WhatsApp. Strong "Join the Movement" CTA.`,
    category: "Business Types"
  },
];

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
