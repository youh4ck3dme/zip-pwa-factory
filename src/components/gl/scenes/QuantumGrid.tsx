import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/use-mobile";

/** Instanced cube grid with wave displacement. */
const Grid = ({ cols, rows }: { cols: number; rows: number }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const total = cols * rows;

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    let i = 0;
    for (let x = 0; x < cols; x++) {
      for (let z = 0; z < rows; z++) {
        const px = (x - cols / 2) * 0.25;
        const pz = (z - rows / 2) * 0.25;
        const wave =
          Math.sin(px * 1.8 + t * 1.2) * 0.4 +
          Math.cos(pz * 1.6 + t * 0.9) * 0.4;
        dummy.position.set(px, wave, pz);
        const s = 0.15 + Math.abs(wave) * 0.1;
        dummy.scale.set(0.15, s * 2, 0.15);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
        const heat = (wave + 0.8) / 1.6;
        color.setRGB(1, 0.55 * heat, 0.0);
        ref.current.setColorAt(i, color);
        i++;
      }
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.rotation.y = t * 0.08;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, total]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
};

export const QuantumGridScene = () => {
  const isMobile = useIsMobile();
  const dim = isMobile ? 18 : 28;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 3.5, 5.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Grid cols={dim} rows={dim} />
      </Canvas>
    </div>
  );
};
