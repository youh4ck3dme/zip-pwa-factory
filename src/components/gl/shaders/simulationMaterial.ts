import * as THREE from "three";
import { periodicNoiseGLSL } from "./utils";

function getPlane(count: number, components: number, size = 512, scale = 1.0) {
  const data = new Float32Array(count * components);
  for (let i = 0; i < count; i++) {
    const i4 = i * components;
    const x = (i % size) / (size - 1);
    const z = Math.floor(i / size) / (size - 1);
    data[i4 + 0] = (x - 0.5) * 2 * scale;
    data[i4 + 1] = 0;
    data[i4 + 2] = (z - 0.5) * 2 * scale;
    data[i4 + 3] = 1.0;
  }
  return data;
}

export class SimulationMaterial extends THREE.ShaderMaterial {
  constructor(scale = 10.0, size = 512) {
    const positionsTexture = new THREE.DataTexture(
      getPlane(size * size, 4, size, scale),
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    positionsTexture.needsUpdate = true;

    super({
      vertexShader: /* glsl */ `varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
      fragmentShader: /* glsl */ `uniform sampler2D positions;
      uniform float uTime;
      uniform float uNoiseScale;
      uniform float uNoiseIntensity;
      uniform float uTimeScale;
      uniform float uLoopPeriod;
      varying vec2 vUv;

      ${periodicNoiseGLSL}

      void main() {
        vec3 originalPos = texture2D(positions, vUv).rgb;
        float continuousTime = uTime * uTimeScale * (6.28318530718 / uLoopPeriod);
        vec3 noiseInput = originalPos * uNoiseScale;

        float dX = periodicNoise(noiseInput + vec3(0.0, 0.0, 0.0), continuousTime);
        float dY = periodicNoise(noiseInput + vec3(50.0, 0.0, 0.0), continuousTime + 2.094);
        float dZ = periodicNoise(noiseInput + vec3(0.0, 50.0, 0.0), continuousTime + 4.188);

        vec3 distortion = vec3(dX, dY, dZ) * uNoiseIntensity;
        gl_FragColor = vec4(originalPos + distortion, 1.0);
      }`,
      uniforms: {
        positions: { value: positionsTexture },
        uTime: { value: 0 },
        uNoiseScale: { value: 1.0 },
        uNoiseIntensity: { value: 0.5 },
        uTimeScale: { value: 1 },
        uLoopPeriod: { value: 24.0 },
      },
    });
  }
}
