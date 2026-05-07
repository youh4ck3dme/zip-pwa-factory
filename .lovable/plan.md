
# Cinematic Prompt Pipeline Builder – Plán

Prerobím `/` (Home) na full-screen snap-scroll cinematic zážitok s 10 sekciami a pri stlačení **Generate** sa spustí particle/liquid loader, ktorý beží paralelne s AI volaním a po dokončení redirectne na `/pipeline/:id`.

## 1. Závislosti & téma

- `bun add framer-motion`
- `src/index.css`: rozšíriť tokens – `--obsidian: 0 0% 0%`, `--amber: 33 100% 50%` (#FF8C00), `--amber-glow`, glass utility (`bg-white/5 backdrop-blur-xl`), `will-change-transform` helper, custom keyframes (pulse-amber, dust, liquid-warp).
- `tailwind.config.ts`: pridať `amber`, `obsidian` farby + spring-friendly easing.
- Font: Inter cez `<link>` v `index.html` (display swap), `font-black tracking-tighter uppercase` pre headlines.

## 2. Štruktúra súborov (nové)

```
src/
  pages/Index.tsx              (prepísaný – orchestrátor sekcií)
  components/cinematic/
    SnapContainer.tsx          (snap-y snap-mandatory, h-[100dvh] sekcie)
    LiquidNavRail.tsx          (vertikálna lišta + amber „kvapka")
    ParticleHeadline.tsx       (písmená -> dust -> particles on scroll)
    GenerateBar.tsx            (search input + magnetický amber CTA)
    SectionShell.tsx           (video bg + parallax + overlay + AnimatePresence liquid clip-path)
    MagneticButton.tsx         (ghost button s magnet + volumetric glow)
    GenesisLoader.tsx          (full-screen particle/liquid overlay počas generovania)
    AscensionOrb.tsx           (sekcia 10 – pulsing orb + reveal CTA)
    GlassFooter.tsx
    sections.ts                (data 10 sekcií: titul, popis, video URL)
```

## 3. Sekcie (10 × 100dvh, snap)

1. **Genesis** – ParticleHeadline „PROMPT PIPELINE BUILDER" + GenerateBar.
2. **Neural Weaver** – „Spletáme vlákna logiky do autonómnych strojov."
3. **Architect Pulse** – „Presnosť v každom pixeli vášho workflowu."
4. **Liquid Flow** – „Plynulosť, ktorá nepozná hranice."
5. **Quantum Forge** – „Kovanie inteligencie pod tlakom dát."
6. **Echo Chamber** – „Každý prompt rezonuje vo viacerých vrstvách."
7. **Prism Logic** – „Jeden vstup, spektrum výstupov."
8. **Velvet Engine** – „Surová sila zabalená do hodvábu."
9. **Aurora Sync** – „Synchronizácia mysle a stroja."
10. **Ascension** – čierna prázdnota, AscensionOrb → „START YOUR GENESIS" → scroll-to-top / focus na GenerateBar + glass footer.

Každá sekcia 02–09: video bg (Pexels CDN URL placeholder), `motion.div` s parallax `useScroll`+`useTransform`, liquid clip-path prechod cez `AnimatePresence`.

## 4. Hero anim (Section 01)

- Písmená split → `motion.span` stagger 0.05s, init `opacity:0, y:20, filter:blur(20px)`, anim `opacity:1, y:0, blur:0` so spring `{stiffness:100, damping:20, mass:1}`.
- Cloud zlatého prachu: SVG/Canvas particle layer (~150 partíc) animovaný na mount.
- Scroll disintegration: `useScroll` na hero – progress 0→1 transformuje písmená na particle layer (opacity headline ↓, particles ↑ + scatter podľa scroll Y).

## 5. Liquid Nav Rail

- `fixed right-6 top-1/2`, vertikálna línia 2px × 60vh.
- Amber „drop" `motion.div` pozicionovaný cez `springY` z aktívneho indexu (IntersectionObserver per section).
- Pri zmene: scaleY 1.6 → 1 (elastic stretch) cez spring.

## 6. Generate flow

`GenerateBar` v Section 01:
- Pulsing aura: `animate-[pulse-amber_2s_ease-in-out_infinite]`.
- Submit → `setLoading(true)` → mount `<GenesisLoader />` (fixed inset-0 z-50).
- Loader: čierny void + tisíce particles (canvas, requestAnimationFrame) konvergujúce do amber orb v strede + liquid SVG clip-path warp; text ticker („Weaving neurons…", „Forging pipeline…", „Synchronizing…").
- Paralelne `supabase.functions.invoke("generate-pipeline", ...)`. Po response: orb „explode" anim 600ms → `navigate(/pipeline/:id)`.
- Min display 1.5s aby anim nepreblikla; error → loader zmizne, toast.

## 7. Magnetic ghost button

- `onMouseMove` počíta offset cursor↔button center, aplikuje `transform: translate(x*0.3, y*0.3)` cez spring.
- Hover: amber outline + `box-shadow: 0 0 60px hsl(var(--amber)/0.6)` volumetric glow.

## 8. Performance & a11y

- `will-change: transform` len na aktívne anim layery.
- `prefers-reduced-motion`: zredukovať stagger/particles count, vypnúť parallax.
- Particle canvas: pause keď tab hidden (`document.visibilitychange`).
- Zachovať header s ADMIN badge / signOut – presunutý do `GlassFooter` aj ako floating top-right glass chip.

## 9. Bez zmeny v BE / auth

- Žiadne zmeny v edge functions, RLS, Builderi, Auth.
- `RequireAuth` zostáva, len Index.tsx + nové komponenty.

## 10. Akceptačné kritériá

- Plynulý 60fps snap-scroll na desktope aj mobile (100dvh).
- Headline sa zostavuje z dust, pri scrolle sa rozpadá na particles.
- Liquid prechod medzi sekciami viditeľný (clip-path morph).
- Nav rail drop sa elasticky natiahne pri zmene sekcie.
- Generate spustí cinematic loader, po úspechu redirect na pipeline stránku.
- Sekcia 10 = čierny void + orb reveal CTA.
