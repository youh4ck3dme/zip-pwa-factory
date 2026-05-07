import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  strength?: number;
}

export const MagneticButton = ({
  children,
  onClick,
  type = "button",
  disabled,
  className,
  strength = 0.35,
}: Props) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 200, damping: 18, mass: 0.6 });

  const onMove = (e: MouseEvent<HTMLButtonElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={cn(
        "group relative inline-flex items-center justify-center px-8 py-3.5",
        "rounded-full border border-amber/40 bg-transparent text-amber",
        "text-sm font-bold uppercase tracking-[0.2em]",
        "transition-colors hover:bg-amber/10 hover:border-amber",
        "disabled:opacity-40 disabled:cursor-not-allowed will-change-transform",
        className
      )}
    >
      <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ boxShadow: "0 0 60px hsl(var(--amber)/0.6), inset 0 0 30px hsl(var(--amber)/0.15)" }} />
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};
