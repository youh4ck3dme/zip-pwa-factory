import { motion, useScroll, useTransform } from "framer-motion";
import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  index: number;
  title: string;
  description: string;
  video?: string;
  children?: ReactNode;
  registerRef?: (i: number, el: HTMLElement | null) => void;
  className?: string;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20, mass: 1 };

export const SectionShell = ({
  id, index, title, description, video, children, registerRef, className,
}: Props) => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1, 1.1]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 0.6, 0.85]);

  return (
    <section
      id={id}
      ref={(el) => { (ref as any).current = el; registerRef?.(index - 1, el); }}
      data-index={index - 1}
      className={cn("snap-section relative w-full overflow-hidden bg-obsidian", className)}
    >
      {video && (
        <motion.div className="absolute inset-0 will-change-transform" style={{ y, scale }}>
          <video
            src={video}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        </motion.div>
      )}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-obsidian/70 via-obsidian/50 to-obsidian"
        style={{ opacity: overlayOpacity }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--obsidian))_85%)]" />

      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-4 sm:px-6">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.4 }}
          transition={SPRING}
          className="mono text-amber/80 text-[10px] sm:text-xs tracking-[0.3em] sm:tracking-[0.4em] mb-4 sm:mb-6"
        >
          0{index} — PHASE
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: false, amount: 0.4 }}
          transition={{ ...SPRING, delay: 0.05 }}
          className="display text-center text-[clamp(2rem,8vw,6rem)] text-foreground leading-[0.95] max-w-5xl break-words"
        >
          {title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.4 }}
          transition={{ ...SPRING, delay: 0.15 }}
          className="mt-5 sm:mt-8 text-center text-muted-foreground text-base sm:text-lg md:text-xl max-w-2xl font-medium px-2"
        >
          {description}
        </motion.p>
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.4 }}
            transition={{ ...SPRING, delay: 0.25 }}
            className="mt-8 sm:mt-12"
          >
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
};
