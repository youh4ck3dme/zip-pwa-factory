import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

interface Props {
  text: string;
  scrollProgress?: MotionValue<number>;
}

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20, mass: 1 };

export const ParticleHeadline = ({ text }: Props) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const blur = useTransform(scrollYProgress, [0, 1], [0, 24]);
  const scatter = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);

  const words = text.split(" ");
  let charIndex = 0;

  return (
    <motion.h1
      ref={ref}
      style={{ opacity, filter }}
      className="display text-foreground text-center text-[clamp(2.5rem,9vw,7.5rem)] leading-[0.9] will-change-transform"
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap mr-[0.25em]">
          {word.split("").map((ch) => {
            const idx = charIndex++;
            const dx = (Math.random() - 0.5) * 400;
            const dy = (Math.random() - 0.5) * 200;
            const rot = (Math.random() - 0.5) * 90;
            const tx = useTransform(scatter, [0, 1], [0, dx]);
            const ty = useTransform(scatter, [0, 1], [0, dy]);
            const r = useTransform(scatter, [0, 1], [0, rot]);
            return (
              <motion.span
                key={idx}
                className="inline-block"
                initial={{ opacity: 0, y: 40, filter: "blur(20px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ ...SPRING, delay: 0.3 + idx * 0.04 }}
                style={{ x: tx, y: ty, rotate: r }}
              >
                {ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </motion.h1>
  );
};
