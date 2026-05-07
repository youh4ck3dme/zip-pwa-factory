import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface Props {
  total: number;
  active: number;
  onJump: (i: number) => void;
}

export const LiquidNavRail = ({ total, active, onJump }: Props) => {
  const progress = useSpring(active / Math.max(1, total - 1), {
    stiffness: 120, damping: 22, mass: 0.8,
  });
  useEffect(() => { progress.set(active / Math.max(1, total - 1)); }, [active, total, progress]);

  const top = useTransform(progress, (p) => `${p * 100}%`);
  const stretch = useSpring(1, { stiffness: 300, damping: 15 });
  useEffect(() => {
    stretch.set(1.7);
    const t = setTimeout(() => stretch.set(1), 220);
    return () => clearTimeout(t);
  }, [active, stretch]);

  return (
    <nav
      aria-label="Section navigation"
      className="fixed right-5 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center"
      style={{ height: "60vh" }}
    >
      <div className="relative h-full w-[2px] bg-white/10 rounded-full overflow-visible">
        <motion.div
          style={{ top, scaleY: stretch }}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-7 rounded-full bg-amber"
        >
          <div className="absolute inset-0 rounded-full blur-md bg-amber opacity-80" />
        </motion.div>
      </div>
      <div className="absolute inset-y-0 -left-3 flex flex-col justify-between py-1">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={() => onJump(i)}
            aria-label={`Go to section ${i + 1}`}
            className="h-5 w-5 grid place-items-center group"
          >
            <span className={`h-1.5 w-1.5 rounded-full transition-colors ${i === active ? "bg-amber" : "bg-white/20 group-hover:bg-white/50"}`} />
          </button>
        ))}
      </div>
    </nav>
  );
};
