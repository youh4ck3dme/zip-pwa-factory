import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Particles } from "./particles";
import { useIsMobile } from "@/hooks/use-mobile";

interface GLProps {
  className?: string;
  color?: string;
  intensity?: number;
}

/**
 * GPGPU particle field (hero animation).
 * Renders absolutely positioned full-bleed Canvas behind content.
 */
export const GL = ({ className = "", color = "#ffd49a", intensity = 1 }: GLProps) => {
  const isMobile = useIsMobile();
  const size = isMobile ? 256 : 512;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
        camera={{ position: [0, 1.2, 3.2], fov: 50 }}
      >
        <Suspense fallback={null}>
          <Particles
            size={size}
            color={color}
            opacity={0.8 * intensity}
            pointSize={isMobile ? 7 : 10}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
