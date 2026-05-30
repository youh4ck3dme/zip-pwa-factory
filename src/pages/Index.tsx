import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Shield, ChevronDown, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGenesisAccentCycle } from "@/hooks/useGenesisAccentCycle";
import { getFunctionInvokeError, isValidPipelineId } from "@/lib/supabase-functions";
import { toast } from "sonner";
import { ACTIVE_SECTIONS } from "@/components/cinematic/sections";
import { ParticleHeadline } from "@/components/cinematic/ParticleHeadline";
import { GenerateBar } from "@/components/cinematic/GenerateBar";
import { SectionShell } from "@/components/cinematic/SectionShell";
import { LiquidNavRail } from "@/components/cinematic/LiquidNavRail";
import { GenesisLoader } from "@/components/cinematic/GenesisLoader";
import { MagneticButton } from "@/components/cinematic/MagneticButton";
import { GL } from "@/components/gl";

const Index = () => {
  const navigate = useNavigate();
  const { isAdmin, signOut, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedSectionsRef = useRef<Set<HTMLElement>>(new Set());
  const visibleSections = ACTIVE_SECTIONS;
  const { accentHsl, accentHex } = useGenesisAccentCycle();

  const registerRef = useCallback((i: number, el: HTMLElement | null) => {
    const prev = sectionRefs.current[i];
    if (prev === el) return;

    sectionRefs.current[i] = el;
    const observer = observerRef.current;
    if (!observer) return;

    if (prev) {
      observer.unobserve(prev);
      observedSectionsRef.current.delete(prev);
    }
    if (el && !observedSectionsRef.current.has(el)) {
      observer.observe(el);
      observedSectionsRef.current.add(el);
    }
  }, []);

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

    observerRef.current = observer;
    sectionRefs.current.forEach((el) => {
      if (el && !observedSectionsRef.current.has(el)) {
        observer.observe(el);
        observedSectionsRef.current.add(el);
      }
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
      observedSectionsRef.current = new Set();
    };
  }, []);

  const genesisRef = useCallback(
    (el: HTMLElement | null) => registerRef(0, el),
    [registerRef]
  );

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
    const trimmed = query.trim();
    if (!trimmed) {
      toast.error("Enter a prompt first");
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("Query too long (max 2000 chars)");
      return;
    }
    setLoading(true);
    const startedAt = Date.now();
    try {
      if (user?.id === "dev-bypass-user") {
        const { db } = await import("@/lib/db");
        const fakeId = crypto.randomUUID();
        await db.pipelines.put({
          id: fakeId,
          title: "Analyze and Clarify Project Request (Dev)",
          query: trimmed,
          steps: [
            {
              id: "step-1",
              name: "Context Analysis",
              prompt: "Inspect the repository 'zip-pwa-factory' at /workspace/youh4ck3dme__zip-pwa-factory. Read the README.md, package.json, and any other root-level documentation to understand the project's purpose, structure, and goals. Identify key files, dependencies, and entry points."
            },
            {
              id: "step-2",
              name: "User Intent Clarification",
              prompt: "Determine the user's intent based on their request 'naci taj projekt'. Analyze possible interpretations (e.g., 'start a new project', 'explain the project', 'fix the project', or 'translate project'). Cross-reference with the repository context to infer the most likely intent."
            },
            {
              id: "step-3",
              name: "Design Action Plan",
              prompt: "Based on the repository context and clarified intent, design a specific action plan. For example: if the intent is to 'explain the project', outline how to generate a clear explanation; if the intent is to 'fix the project', identify potential issues and propose fixes. Output a structured plan with clear objectives."
            },
            {
              id: "step-4",
              name: "Execute or Respond",
              prompt: "Execute the action plan or respond to the user with a clear, concise output. If the intent is unclear, ask a single clarifying question (e.g., 'Do you want to start a new project, explain this project, or fix an issue?')."
            }
          ],
          owner_id: "dev-bypass-user",
          updated_at: new Date().toISOString(),
        });
        const elapsed = Date.now() - startedAt;
        const wait = Math.max(0, 1500 - elapsed);
        window.setTimeout(() => navigate(`/pipeline/${fakeId}`), wait);
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-pipeline", {
        body: { query: trimmed },
      });
      if (error) {
        toast.error(await getFunctionInvokeError(data, error));
        setLoading(false);
        return;
      }
      if (data?.error) {
        toast.error(String(data.error));
        setLoading(false);
        return;
      }
      if (!isValidPipelineId(data?.id)) {
        toast.error("Invalid pipeline response");
        setLoading(false);
        return;
      }
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, 1500 - elapsed);
      window.setTimeout(() => navigate(`/pipeline/${data.id}`), wait);
    } catch (err: unknown) {
      setLoading(false);
      toast.error(await getFunctionInvokeError(null, err));
    }
  };

  return (
    <div className="bg-obsidian text-foreground">
      {/* Floating top-right user controls */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-50 flex items-center gap-2 sm:gap-3">
        {isAdmin && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full glass text-amber text-[9px] sm:text-[10px] font-bold tracking-widest">
            <Shield className="h-3 w-3" /> ADMIN
          </span>
        )}
        <span className="text-[11px] text-muted-foreground hidden md:inline mono max-w-[180px] truncate">{user?.email}</span>
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-muted-foreground hover:text-foreground hover:bg-card transition-colors text-xs font-semibold"
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">My Pipelines</span>
        </Link>
        <button
          onClick={signOut}
          className="p-2 rounded-full glass text-muted-foreground hover:text-amber transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <LiquidNavRail total={visibleSections.length} active={active} onJump={jump} />

      <main
        ref={containerRef}
        className="snap-container hide-scrollbar"
      >
        {/* SECTION 01 — Genesis */}
        <section
          id="genesis"
          ref={genesisRef}
          data-index={0}
          className="snap-section genesis-ambient relative w-full overflow-hidden bg-obsidian"
          style={{ "--genesis-accent": accentHsl } as CSSProperties}
        >
          {/* MAIN HERO — GPGPU particle field */}
          <GL color={accentHex} />
          <div
            className="absolute inset-0 pointer-events-none transition-colors duration-1000"
            style={{
              background: `
                radial-gradient(ellipse at 50% 40%, hsl(var(--genesis-accent) / 0.45) 0%, transparent 60%),
                radial-gradient(circle at 100% 0%, hsl(var(--genesis-accent) / 0.25) 0%, transparent 50%),
                radial-gradient(circle at 0% 100%, hsl(var(--genesis-accent) / 0.15) 0%, transparent 40%)
              `
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-obsidian/40 to-obsidian pointer-events-none" />

          <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 sm:px-6 gap-6 sm:gap-10 md:gap-12">
            <ParticleHeadline text="SILK ROAD PIPELINE" />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.8 }}
              className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-xl text-center font-medium px-2"
            >
              Sequential AI workflows — born from a single sentence.
            </motion.p>

            <GenerateBar loading={loading} onGenerate={handleGenerate} />
          </div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 text-muted-foreground/60"
          >
            <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.div>
        </section>

        {/* SECTION 02 — keep only first two 100vh sections */}
        {visibleSections.slice(1).map((s, navIdx) => (
          <SectionShell
            key={s.id}
            id={s.id}
            navIndex={navIdx + 1}
            index={s.index}
            title={s.title}
            description={s.description}
            video={s.video}
            scene={s.scene}
            registerRef={registerRef}
          >
            <MagneticButton onClick={focusGenerate}>Generate</MagneticButton>
          </SectionShell>
        ))}
      </main>

      <GenesisLoader active={loading} />
    </div>
  );
};

export default Index;
