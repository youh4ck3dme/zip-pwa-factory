import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Shield, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SECTIONS } from "@/components/cinematic/sections";
import { ParticleHeadline } from "@/components/cinematic/ParticleHeadline";
import { GenerateBar } from "@/components/cinematic/GenerateBar";
import { SectionShell } from "@/components/cinematic/SectionShell";
import { LiquidNavRail } from "@/components/cinematic/LiquidNavRail";
import { GenesisLoader } from "@/components/cinematic/GenesisLoader";
import { AscensionOrb } from "@/components/cinematic/AscensionOrb";
import { GlassFooter } from "@/components/cinematic/GlassFooter";
import { MagneticButton } from "@/components/cinematic/MagneticButton";

const Index = () => {
  const navigate = useNavigate();
  const { isAdmin, signOut, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  const registerRef = (i: number, el: HTMLElement | null) => {
    sectionRefs.current[i] = el;
  };

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.5) {
            const idx = Number((e.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { root, threshold: [0.5, 0.75] }
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const jump = (i: number) => {
    sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const focusGenerate = () => {
    jump(0);
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>("input[placeholder^='Describe']");
      el?.focus();
    }, 700);
  };

  const handleGenerate = async (query: string) => {
    if (query.length > 2000) {
      toast.error("Query too long (max 2000 chars)");
      return;
    }
    setLoading(true);
    const startedAt = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke("generate-pipeline", {
        body: { query },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, 1500 - elapsed);
      setTimeout(() => navigate(`/pipeline/${data.id}`), wait);
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Failed to generate pipeline");
    }
  };

  return (
    <div className="bg-obsidian text-foreground">
      {/* Floating top-right user controls */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-3">
        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass text-amber text-[10px] font-bold tracking-widest">
            <Shield className="h-3 w-3" /> ADMIN
          </span>
        )}
        <span className="text-[11px] text-muted-foreground hidden sm:inline mono">{user?.email}</span>
        <button
          onClick={signOut}
          className="p-2 rounded-full glass text-muted-foreground hover:text-amber transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <LiquidNavRail total={SECTIONS.length} active={active} onJump={jump} />

      <main
        ref={containerRef}
        className="snap-container hide-scrollbar"
      >
        {/* SECTION 01 — Genesis */}
        <section
          id="genesis"
          ref={(el) => registerRef(0, el)}
          data-index={0}
          className="snap-section relative w-full overflow-hidden bg-obsidian"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--amber)/0.18)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--amber)/0.08)_0%,transparent_70%)]" />

          {/* dust particles */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-1 w-1 rounded-full bg-amber/60"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.2, 0.8, 0.2],
                }}
                transition={{
                  duration: 4 + Math.random() * 4,
                  repeat: Infinity,
                  delay: Math.random() * 4,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 gap-12">
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="mono text-amber/80 text-xs tracking-[0.5em]"
            >
              01 — GENESIS
            </motion.span>

            <ParticleHeadline text="PROMPT PIPELINE BUILDER" />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.8 }}
              className="text-muted-foreground text-base md:text-lg max-w-xl text-center font-medium"
            >
              Sequential AI workflows — born from a single sentence.
            </motion.p>

            <GenerateBar loading={loading} onGenerate={handleGenerate} />
          </div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-muted-foreground/60"
          >
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        </section>

        {/* SECTIONS 02–09 */}
        {SECTIONS.slice(1, 9).map((s) => (
          <SectionShell
            key={s.id}
            id={s.id}
            index={s.index}
            title={s.title}
            description={s.description}
            video={s.video}
            registerRef={registerRef}
          >
            <MagneticButton onClick={focusGenerate}>Generate</MagneticButton>
          </SectionShell>
        ))}

        {/* SECTION 10 — Ascension */}
        <section
          id="ascension"
          ref={(el) => registerRef(9, el)}
          data-index={9}
          className="snap-section relative w-full overflow-hidden bg-obsidian"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--amber)/0.08)_0%,transparent_70%)]" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center gap-16 px-6">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              className="mono text-amber/80 text-xs tracking-[0.5em]"
            >
              10 — ASCENSION
            </motion.span>
            <AscensionOrb onActivate={focusGenerate} />
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ type: "spring", stiffness: 100, damping: 20, mass: 1 }}
              className="text-muted-foreground text-center max-w-md"
            >
              Jeden prompt. Nekonečné možnosti. Sekvenčné AI workflows v jedinom dychu.
            </motion.p>
          </div>
          <GlassFooter />
        </section>
      </main>

      <GenesisLoader active={loading} />
    </div>
  );
};

export default Index;
