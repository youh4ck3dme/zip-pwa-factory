import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

/** Wireframe icosahedron pulsing with noise distortion. */
const Shape = () => {
  const mesh = useRef<THREE.Mesh>(null);
  const wire = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (mesh.current) {
      mesh.current.rotation.x = t * 0.15;
      mesh.current.rotation.y = t * 0.2;
      const s = 1 + Math.sin(t * 1.2) * 0.05;
      mesh.current.scale.setScalar(s);
    }
    if (wire.current) {
      wire.current.rotation.x = t * 0.15;
      wire.current.rotation.y = t * 0.2;
      wire.current.scale.setScalar(1.04 + Math.sin(t * 1.2) * 0.05);
    }
  });

  return (
    <group>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>
      <mesh ref={wire}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshBasicMaterial color="#FF8C00" wireframe transparent opacity={0.85} />
      </mesh>
    </group>
  );
};

export const IcosahedronScene = () => (
  <div className="absolute inset-0 pointer-events-none">
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4], fov: 50 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} color="#FF8C00" intensity={2} />
      <Shape />
    </Canvas>
  </div>
);
