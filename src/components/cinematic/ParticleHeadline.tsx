import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useMemo, useRef } from "react";

interface Props {
  text: string;
}

const SPRING = { type: "spring" as const, stiffness: 120, damping: 18, mass: 0.9 };

/** Stable pseudo-random in [0, 1) — same offsets every render. */
const seeded = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

interface LetterMeta {
  ch: string;
  word: number;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
  originX: number;
  originY: number;
}

interface LetterProps {
  meta: LetterMeta;
  scatter: MotionValue<number>;
}

const Letter = ({ meta, scatter }: LetterProps) => {
  const { ch, dx, dy, rot, delay, originX, originY } = meta;

  const x = useTransform(scatter, [0, 0.15, 1], [0, dx * 0.08, dx]);
  const y = useTransform(scatter, [0, 0.15, 1], [0, dy * 0.08, dy]);
  const r = useTransform(scatter, [0, 0.2, 1], [0, rot * 0.25, rot]);
  const scale = useTransform(scatter, [0, 0.4, 1], [1, 0.92, 0.15]);
  const letterOpacity = useTransform(scatter, [0, 0.55, 1], [1, 0.85, 0]);
  const blurPx = useTransform(scatter, [0, 0.5, 1], [0, 4, 18]);
  const letterFilter = useTransform(blurPx, (b) => `blur(${b}px)`);

  return (
    <motion.span
      className="inline-block will-change-transform"
      style={{
        x,
        y,
        rotate: r,
        scale,
        opacity: letterOpacity,
        filter: letterFilter,
      }}
    >
      <motion.span
        className="inline-block"
        initial={{
          opacity: 0,
          x: originX,
          y: originY + 36,
          scale: 0.35,
          rotate: rot * 0.4,
          filter: "blur(22px)",
        }}
        animate={{
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotate: 0,
          filter: "blur(0px)",
        }}
        transition={{ ...SPRING, delay }}
      >
        {ch}
      </motion.span>
    </motion.span>
  );
};

export const ParticleHeadline = ({ text }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);
  const containerBlur = useTransform(scrollYProgress, [0, 0.8, 1], [0, 8, 20]);
  const scatter = useTransform(scrollYProgress, [0, 0.08, 1], [0, 0, 1]);
  const containerFilter = useTransform(containerBlur, (b) => (b > 0 ? `blur(${b}px)` : "none"));

  const letters = useMemo(() => {
    const out: LetterMeta[] = [];
    let globalIdx = 0;

    text.split(" ").forEach((word, wi) => {
      word.split("").forEach((ch, ci) => {
        const s1 = seeded(globalIdx);
        const s2 = seeded(globalIdx + 100);
        const s3 = seeded(globalIdx + 200);
        const angle = s1 * Math.PI * 2;
        const radius = 80 + s2 * 120;

        out.push({
          ch,
          word: wi,
          dx: Math.cos(angle) * (180 + s1 * 280),
          dy: Math.sin(angle) * (100 + s2 * 160) - 40,
          rot: (s3 - 0.5) * 120,
          delay: 0.2 + wi * 0.22 + ci * 0.038,
          originX: Math.cos(angle) * radius * 0.35,
          originY: Math.sin(angle) * radius * 0.35,
        });
        globalIdx += 1;
      });
      out.push({
        ch: " ",
        word: wi,
        dx: 0,
        dy: 0,
        rot: 0,
        delay: 0,
        originX: 0,
        originY: 0,
      });
    });

    return out;
  }, [text]);

  return (
    <motion.div
      ref={ref}
      style={{ opacity, filter: containerFilter }}
      className="px-2"
    >
      <h1 className="display text-foreground text-center text-[clamp(1.5rem,5.5vw,4.25rem)] leading-[0.9] will-change-transform">
        {letters.map((l, idx) =>
          l.ch === " " ? (
            <span key={idx} className="inline-block w-[0.35em]" />
          ) : (
            <Letter key={idx} meta={l} scatter={scatter} />
          )
        )}
      </h1>
    </motion.div>
  );
};
