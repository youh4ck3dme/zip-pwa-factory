import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, FileText, Cpu } from "lucide-react";

const steps = [
  "Analyzing context and parameters...",
  "Exploring integration feasibility and goals...",
  "Drafting initial workflow sequence...",
  "Allocating computational resources...",
  "Optimizing pipeline efficiency...",
  "Finalizing generation matrix...",
];

export const ThinkingAnimation = () => {
  const [seconds, setSeconds] = useState(1);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1 < steps.length ? i + 1 : i));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(10px)" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} // smooth apple-like ease
      className="absolute top-full left-0 right-0 mt-6 mx-auto max-w-lg w-full bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 group"
    >
      {/* Cinematic scanning line */}
      <motion.div
        animate={{ top: ["-10%", "110%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent z-0 opacity-30"
      />

      <div className="relative z-10 flex flex-col pl-4">
        {/* Animated Vertical line connecting icons */}
        <div className="absolute left-[11px] top-[24px] bottom-[24px] w-[2px] bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            animate={{ y: ["-100%", "300%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-full h-1/3 bg-gradient-to-b from-transparent via-amber-500/80 to-transparent"
          />
        </div>

        {/* Thinking counter */}
        <div className="flex items-center gap-4 mb-6">
          <motion.div 
            animate={{ boxShadow: ["0 0 0px rgba(245,158,11,0)", "0 0 15px rgba(245,158,11,0.4)", "0 0 0px rgba(245,158,11,0)"] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-[#111] border border-amber-500/30 text-amber-500 shrink-0"
          >
            <Cpu className="w-3.5 h-3.5" />
          </motion.div>
          <div className="text-[13px] text-amber-500/80 font-mono tracking-widest uppercase">
            Processing_ {seconds}s
          </div>
        </div>

        {/* Current Step */}
        <div className="flex items-start gap-4">
          <div className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-[#111] border border-white/20 text-foreground shrink-0 mt-1">
            <FileText className="w-3.5 h-3.5 text-white/80" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="text-[16px] font-bold text-white mb-1 tracking-tight flex items-center gap-2">
              Constructing Pipeline
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"
              />
            </div>
            <div className="relative h-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={stepIndex}
                  initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 10, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 text-[13px] text-white/50 font-mono truncate"
                >
                  &gt; {steps[stepIndex]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Cinematic subtle glow in background */}
      <motion.div
        animate={{ opacity: [0, 0.2, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none"
      />
    </motion.div>
  );
};
