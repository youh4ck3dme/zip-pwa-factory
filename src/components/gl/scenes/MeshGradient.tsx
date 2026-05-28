import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/** Animated WebGL mesh gradient — liquid amber/obsidian blob. */
const GradientPlane = () => {
  const ref = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color("#FF8C00") },
      uColorB: { value: new THREE.Color("#0a0a0a") },
      uColorC: { value: new THREE.Color("#ffb347") },
    }),
    []
  );

  useFrame((state) => {
    if (ref.current) ref.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh>
      <planeGeometry args={[4, 4, 64, 64]} />
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uColorC;
          varying vec2 vUv;

          // 2D simplex-ish noise
          vec2 hash(vec2 p) {
            p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
            return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
          }
          float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(
              mix(dot(hash(i), f), dot(hash(i + vec2(1,0)), f - vec2(1,0)), u.x),
              mix(dot(hash(i + vec2(0,1)), f - vec2(0,1)), dot(hash(i + vec2(1,1)), f - vec2(1,1)), u.x),
              u.y);
          }

          void main() {
            vec2 uv = vUv * 2.0 - 1.0;
            float t = uTime * 0.15;
            float n1 = noise(uv * 1.5 + vec2(t, -t));
            float n2 = noise(uv * 2.2 + vec2(-t * 0.7, t * 0.4));
            float blob = smoothstep(-0.3, 0.6, n1 + n2 * 0.6);

            vec3 col = mix(uColorB, uColorA, blob);
            col = mix(col, uColorC, pow(blob, 4.0) * 0.7);

            // vignette
            float vig = 1.0 - smoothstep(0.5, 1.4, length(uv));
            col *= vig;

            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  );
};

export const MeshGradientScene = () => (
  <div className="absolute inset-0 pointer-events-none">
    <Canvas
      dpr={[1, 1.5]}
      orthographic
      camera={{ zoom: 200, position: [0, 0, 5] }}
      gl={{ antialias: false, alpha: false }}
    >
      <GradientPlane />
    </Canvas>
  </div>
);
