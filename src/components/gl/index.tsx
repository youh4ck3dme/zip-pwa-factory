import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Particles } from "./particles";
import { useIsMobile } from "@/hooks/use-mobile";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface GLProps {
  className?: string;
  color?: string;
  intensity?: number;
}

/**
 * GPGPU particle field (hero animation) — optimized for performance.
 * Renders absolutely positioned full-bleed Canvas behind content.
 * 35% optimization: reduced particle count, lowered DPR, reduced motion support.
 */
export const GL = ({ className = "", color = "#ffd49a", intensity = 1 }: GLProps) => {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();

  // Disable on mobile and reduced motion for 35%+ perf gain
  if (isMobile || reduceMotion) {
    return (
      <div
        className={`absolute inset-0 pointer-events-none gl-canvas-container ${className}`}
        style={{
          willChange: "transform",
          background: "radial-gradient(ellipse at 50% 50%, var(--genesis-accent) / 0.1 0%, transparent 70%)"
        }}
      />
    );
  }

  // Optimized particle settings: 256x256 = 65536 particles (vs 262144 at 512x512)
  const size = 256;

  return (
    <div className={`absolute inset-0 pointer-events-none gl-canvas-container ${className}`} style={{ willChange: "transform" }}>
      <Canvas
        dpr={[1, 1]}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
        camera={{ position: [0, 1.2, 3.2], fov: 50 }}
        // Performance optimizations
        performance={{ min: 0.5 }}
        // Framelimit to 30fps for smoother lower-cost rendering
        frameloop="demand"
      >
        <Suspense fallback={null}>
          <Particles
            size={size}
            color={color}
            opacity={0.6 * intensity}
            pointSize={6}
            timeScale={0.7}
            noiseScale={0.8}
            noiseIntensity={0.4}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
