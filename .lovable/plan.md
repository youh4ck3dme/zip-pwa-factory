## Nový cinematic systém — 5 hero-grade WebGL animácií

### Závislosti (pinned verzie pre R18)
```
bun add three@^0.160 @react-three/fiber@^8.18 @react-three/drei@^9.122 maath
bun add -d @types/three
```
Leva ani r3f-perf nepridávam (dev-only tooling, do produkcie netreba).

### Architektúra
Vytvorím adresár `src/components/gl/` s GPGPU particle systémom presne podľa tvojho kódu (utils.ts, simulationMaterial.ts, pointMaterial.ts, vignetteShader.ts, particles.tsx, index.tsx). `GL` komponent dostane fixné, vyladené uniformy (žiadna leva-panel závislosť) — hodnoty z tvojho preset configu (speed 1.0, focus 3.8, aperture 1.79, pointSize 10, opacity 0.8, planeScale 10, noiseScale 0.6, noiseIntensity 0.52).

Každá animácia bude samostatný komponent v `src/components/gl/scenes/` aby šli line-by-line nahradiť / vypnúť.

### 5 hlavných animácií (poradie sekcií)

```
01 GENESIS         → GPGPU Particle Field (tvoj kód, MAIN HERO)
02 NEURAL WEAVER   → Animated Mesh Gradient (WebGL shader, jemný liquid blob)
03 ARCHITECT PULSE → Wireframe Icosahedron + distortion noise
04 LIQUID FLOW     → Flowing Curl-Noise Particle Stream
05 QUANTUM FORGE   → Instanced Cubes Grid s wave displacement
06–09              → pôvodné video sekcie (posunuté o jednu nižšie)
10 ASCENSION       → ponechané (orb CTA)
```

Pôvodný 01 Genesis (ParticleHeadline + GenerateBar) sa **NEPRESUVA** — Genesis ostáva ako hero so search-barom, ale **na pozadí pobeží GPGPU particle field** namiesto statickej dust-vrstvy. To je tvoj "main" — najsilnejšia animácia tvorí pozadie celej hero sekcie kde človek pristane.

Sekcie 02–05 dostanú každú jednu z nových WebGL animácií namiesto video-bg. Sekcie 06–09 ostávajú s pôvodnými Pexels video pozadiami.

### Performance & fallbacks
- `<Canvas dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}>` — DPR cap 1.5 pre mobil
- `frameloop="demand"` na neaktívnych sekciách, `"always"` len keď je sekcia vo viewporte (IntersectionObserver toggle)
- `prefers-reduced-motion` → render statického fallback gradientu
- size pre GPGPU znížim na 256 na `useIsMobile()` → 4× menej particles, plynulo aj na iPhone 12
- Každý Canvas je `position:absolute inset-0 -z-10 pointer-events-none` aby neblokoval scroll / input

### Technické detaily (sumár implementácie)
1. `gl/shaders/*` — presne tvoj GLSL kód, žiadna úprava logiky.
2. `gl/particles.tsx` — tvoj kód, ale odstránim `leva` import.
3. `gl/index.tsx` (`<GL />`) — hardcoded uniformy z tvojho presetu, prop `intensity` a `size` pre zníženie na mobile.
4. `gl/scenes/MeshGradient.tsx`, `Icosahedron.tsx`, `CurlStream.tsx`, `QuantumGrid.tsx` — 4 nové scény, každá s vlastným Canvas + jedno-shader pipeline.
5. `Index.tsx` — Genesis dostane `<GL>` ako absolútny background layer pod existujúce `ParticleHeadline + GenerateBar`. Sekcie 02–05 v `SECTIONS` array dostanú nový prop `scene: "mesh" | "icosa" | "curl" | "quantum"` ktorý `SectionShell` vyrenderuje namiesto videa.

### Súbory
- **new**: `src/components/gl/{index.tsx, particles.tsx}`, `src/components/gl/shaders/{utils.ts, simulationMaterial.ts, pointMaterial.ts, vignetteShader.ts}`, `src/components/gl/scenes/{MeshGradient.tsx, Icosahedron.tsx, CurlStream.tsx, QuantumGrid.tsx}`
- **edit**: `src/components/cinematic/SectionShell.tsx` (podpora `scene` propu), `src/components/cinematic/sections.ts` (priradenie scén 02–05), `src/pages/Index.tsx` (GL background v Genesis)
- **install**: `three`, `@react-three/fiber@^8.18`, `@react-three/drei@^9.122`, `maath`

Schvál a začnem implementovať.