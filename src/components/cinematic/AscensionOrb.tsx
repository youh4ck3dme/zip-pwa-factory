import { motion } from "framer-motion";
import { useState } from "react";

interface Props {
  onActivate: () => void;
}

export const AscensionOrb = ({ onActivate }: Props) => {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onActivate}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative grid place-items-center w-[280px] h-[280px] focus:outline-none"
      aria-label="Start your genesis"
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-amber/20 blur-3xl"
        animate={{ scale: hover ? 1.4 : 1, opacity: hover ? 0.9 : 0.5 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />
      <motion.div
        className="relative w-32 h-32 rounded-full bg-gradient-to-br from-amber to-amber-glow animate-orb amber-glow"
        animate={{ scale: hover ? 1.15 : 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      />
      <motion.span
        animate={{ opacity: hover ? 1 : 0, y: hover ? 0 : 10 }}
        transition={{ duration: 0.4 }}
        className="absolute -bottom-12 display text-amber tracking-[0.3em] text-sm whitespace-nowrap"
      >
        START YOUR GENESIS
      </motion.span>
    </button>
  );
};
