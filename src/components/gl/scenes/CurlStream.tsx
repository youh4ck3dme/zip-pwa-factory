import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/use-mobile";

/** Curl-noise particle stream — flowing liquid amber dust. */
const Stream = ({ count }: { count: number }) => {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 6;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 4;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return arr;
  }, [count]);
  const velocities = useMemo(() => new Float32Array(count * 3), [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const geom = ref.current.geometry;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const t = state.clock.elapsedTime * 0.3;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = pos.array[i3] as number;
      const y = pos.array[i3 + 1] as number;
      const z = pos.array[i3 + 2] as number;
      // curl-ish noise field (cheap)
      const vx = Math.sin(y * 1.5 + t) + Math.cos(z * 1.3 + t * 0.7);
      const vy = Math.sin(z * 1.2 + t * 1.1) + Math.cos(x * 1.6 + t);
      const vz = Math.sin(x * 1.4 + t * 0.8) + Math.cos(y * 1.1 + t * 1.3);
      velocities[i3] = vx * 0.4;
      velocities[i3 + 1] = vy * 0.4;
      velocities[i3 + 2] = vz * 0.4;

      let nx = x + velocities[i3] * delta;
      let ny = y + velocities[i3 + 1] * delta;
      let nz = z + velocities[i3 + 2] * delta;

      // wrap bounds
      if (nx > 3) nx = -3;
      if (nx < -3) nx = 3;
      if (ny > 2) ny = -2;
      if (ny < -2) ny = 2;
      if (nz > 2) nz = -2;
      if (nz < -2) nz = 2;

      (pos.array as Float32Array)[i3] = nx;
      (pos.array as Float32Array)[i3 + 1] = ny;
      (pos.array as Float32Array)[i3 + 2] = nz;
    }
    pos.needsUpdate = true;
    ref.current.rotation.y = state.clock.elapsedTime * 0.05;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#FF8C00"
        size={0.018}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export const CurlStreamScene = () => {
  const isMobile = useIsMobile();
  const count = isMobile ? 1500 : 4500;
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 55 }}
        gl={{ antialias: false, alpha: true }}
      >
        <Stream count={count} />
      </Canvas>
    </div>
  );
};
