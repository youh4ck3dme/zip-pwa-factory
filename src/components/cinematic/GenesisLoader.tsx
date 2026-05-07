import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Props {
  active: boolean;
}

const PHRASES = [
  "Weaving neurons…",
  "Forging logic strands…",
  "Aligning prompts…",
  "Synchronizing intelligence…",
  "Compiling genesis…",
];

export const GenesisLoader = ({ active }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phrase, setPhrase] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), 1100);
    return () => clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      c.style.width = `${window.innerWidth}px`;
      c.style.height = `${window.innerHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 600;
    const cx = () => c.width / 2;
    const cy = () => c.height / 2;

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const particles: P[] = Array.from({ length: COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 200 * dpr + Math.random() * Math.max(c.width, c.height) * 0.6;
      return {
        x: cx() + Math.cos(angle) * dist,
        y: cy() + Math.sin(angle) * dist,
        vx: 0, vy: 0,
        r: (0.6 + Math.random() * 1.8) * dpr,
        a: 0.4 + Math.random() * 0.6,
      };
    });

    let raf = 0;
    const tick = () => {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, c.width, c.height);

      // central orb
      const grad = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), 180 * dpr);
      grad.addColorStop(0, "rgba(255,140,0,0.9)");
      grad.addColorStop(0.4, "rgba(255,140,0,0.3)");
      grad.addColorStop(1, "rgba(255,140,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, c.width, c.height);

      for (const p of particles) {
        const dx = cx() - p.x;
        const dy = cy() - p.y;
        const d = Math.hypot(dx, dy) + 0.001;
        const f = Math.min(0.0009 * d, 1.2);
        p.vx += (dx / d) * f;
        p.vy += (dy / d) * f;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;

        if (d < 30 * dpr) {
          // respawn far away
          const angle = Math.random() * Math.PI * 2;
          const dist = 300 * dpr + Math.random() * Math.max(c.width, c.height) * 0.4;
          p.x = cx() + Math.cos(angle) * dist;
          p.y = cy() + Math.sin(angle) * dist;
          p.vx = 0; p.vy = 0;
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,180,80,${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="genesis-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] bg-obsidian"
        >
          <canvas ref={canvasRef} className="absolute inset-0" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 pointer-events-none">
            <motion.div
              className="w-32 h-32 rounded-full bg-amber animate-orb amber-glow"
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
            <div className="display text-foreground text-3xl md:text-4xl tracking-[0.3em] text-amber">
              GENESIS
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={phrase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mono text-sm text-muted-foreground tracking-widest"
              >
                {PHRASES[phrase]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
