import * as THREE from "three";
import { periodicNoiseGLSL } from "./utils";

export class DofPointsMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: /* glsl */ `
      uniform sampler2D positions;
      uniform sampler2D initialPositions;
      uniform float uTime;
      uniform float uFocus;
      uniform float uFov;
      uniform float uBlur;
      uniform float uPointSize;
      varying float vDistance;
      varying float vPosY;
      varying vec3 vWorldPosition;
      varying vec3 vInitialPosition;
      void main() {
        vec3 pos = texture2D(positions, position.xy).xyz;
        vec3 initialPos = texture2D(initialPositions, position.xy).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vDistance = abs(uFocus - -mvPosition.z);
        vPosY = pos.y;
        vWorldPosition = pos;
        vInitialPosition = initialPos;
        gl_PointSize = max(vDistance * uBlur * uPointSize, 3.0);
      }`,
      fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform float uRevealFactor;
      uniform float uRevealProgress;
      uniform float uTime;
      uniform float uTransition;
      uniform vec3 uColor;
      varying float vDistance;
      varying float vPosY;
      varying vec3 vWorldPosition;
      varying vec3 vInitialPosition;

      ${periodicNoiseGLSL}

      float sparkleNoise(vec3 seed, float time) {
        float hash = fract(sin(seed.x * 127.1 + seed.y * 311.7 + seed.z * 74.7) * 43758.5453);
        float slowTime = time * 1.0;
        float sparkle = 0.0;
        sparkle += sin(slowTime + hash * 6.28318) * 0.5;
        sparkle += sin(slowTime * 1.7 + hash * 12.56636) * 0.3;
        sparkle += sin(slowTime * 0.8 + hash * 18.84954) * 0.2;
        float hash2 = fract(sin(seed.x * 113.5 + seed.y * 271.9 + seed.z * 97.3) * 37849.3241);
        float sparkleMask = sin(hash2 * 6.28318) * 0.7 + sin(hash2 * 12.56636) * 0.3;
        if (sparkleMask < 0.3) sparkle *= 0.05;
        float n = (sparkle + 1.0) * 0.5;
        float smoothCurve = pow(n, 4.0);
        float blendFactor = n * n;
        return 0.7 + mix(n, smoothCurve, blendFactor) * 1.3;
      }

      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        if (length(cxy) - 0.5 > 0.0) discard;

        float distanceFromCenter = length(vWorldPosition.xz);
        float noiseValue = periodicNoise(vInitialPosition * 4.0, 0.0);
        float revealThreshold = uRevealFactor + noiseValue * 0.3;
        float revealMask = 1.0 - smoothstep(revealThreshold - 0.2, revealThreshold + 0.1, distanceFromCenter);

        float sparkleBrightness = sparkleNoise(vInitialPosition, uTime);
        float alpha = (1.04 - clamp(vDistance, 0.0, 1.0))
          * clamp(smoothstep(-0.5, 0.25, vPosY), 0.0, 1.0)
          * uOpacity * revealMask * uRevealProgress * sparkleBrightness;

        gl_FragColor = vec4(uColor, mix(alpha, sparkleBrightness - 1.1, uTransition));
      }`,
      uniforms: {
        positions: { value: null },
        initialPositions: { value: null },
        uTime: { value: 0 },
        uFocus: { value: 5.1 },
        uFov: { value: 50 },
        uBlur: { value: 30 },
        uTransition: { value: 0.0 },
        uPointSize: { value: 2.0 },
        uOpacity: { value: 1.0 },
        uRevealFactor: { value: 0.0 },
        uRevealProgress: { value: 0.0 },
        uColor: { value: new THREE.Color(1, 1, 1) },
      },
      transparent: true,
      depthWrite: false,
    });
  }
}
