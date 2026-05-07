import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useMemo, useRef } from "react";

interface Props {
  text: string;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20, mass: 1 };

interface LetterProps {
  ch: string;
  idx: number;
  scatter: MotionValue<number>;
  dx: number;
  dy: number;
  rot: number;
}

const Letter = ({ ch, idx, scatter, dx, dy, rot }: LetterProps) => {
  const x = useTransform(scatter, [0, 1], [0, dx]);
  const y = useTransform(scatter, [0, 1], [0, dy]);
  const r = useTransform(scatter, [0, 1], [0, rot]);
  return (
    <motion.span
      className="inline-block"
      initial={{ opacity: 0, y: 40, filter: "blur(20px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ ...SPRING, delay: 0.3 + idx * 0.04 }}
      style={{ x, y, rotate: r }}
    >
      {ch}
    </motion.span>
  );
};

export const ParticleHeadline = ({ text }: Props) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const blur = useTransform(scrollYProgress, [0, 1], [0, 24]);
  const scatter = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);

  // Stable random offsets per letter (computed once)
  const letters = useMemo(() => {
    const out: { ch: string; word: number; dx: number; dy: number; rot: number }[] = [];
    text.split(" ").forEach((word, wi) => {
      word.split("").forEach((ch) => {
        out.push({
          ch,
          word: wi,
          dx: (Math.random() - 0.5) * 400,
          dy: (Math.random() - 0.5) * 200,
          rot: (Math.random() - 0.5) * 90,
        });
      });
      out.push({ ch: " ", word: wi, dx: 0, dy: 0, rot: 0 });
    });
    return out;
  }, [text]);

  return (
    <motion.h1
      ref={ref}
      style={{ opacity, filter }}
      className="display text-foreground text-center text-[clamp(2.5rem,9vw,7.5rem)] leading-[0.9] will-change-transform"
    >
      {letters.map((l, idx) =>
        l.ch === " " ? (
          <span key={idx} className="inline-block w-[0.3em]" />
        ) : (
          <Letter
            key={idx}
            idx={idx}
            ch={l.ch}
            scatter={scatter}
            dx={l.dx}
            dy={l.dy}
            rot={l.rot}
          />
        )
      )}
    </motion.h1>
  );
};
