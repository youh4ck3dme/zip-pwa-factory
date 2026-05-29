export const GENESIS_CYCLE_MS = 10_000;

export interface HslStop {
  h: number;
  s: number;
  l: number;
}

/** 10-stop warm palette: deep orange → warm white */
export const GENESIS_PALETTE: HslStop[] = [
  { h: 24, s: 100, l: 50 },
  { h: 28, s: 100, l: 54 },
  { h: 33, s: 100, l: 58 },
  { h: 38, s: 100, l: 56 },
  { h: 45, s: 100, l: 55 },
  { h: 43, s: 92, l: 52 },
  { h: 40, s: 85, l: 58 },
  { h: 42, s: 55, l: 72 },
  { h: 45, s: 35, l: 88 },
  { h: 45, s: 20, l: 96 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpHue = (a: number, b: number, t: number) => {
  const diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
};

export const hslToString = ({ h, s, l }: HslStop) =>
  `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;

export const hslToHex = ({ h, s, l }: HslStop) => {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/** progress in [0, 1) — linear interpolation between palette stops */
export const interpolateGenesisAccent = (progress: number) => {
  const count = GENESIS_PALETTE.length;
  const wrapped = ((progress % 1) + 1) % 1;
  const scaled = wrapped * count;
  const index = Math.floor(scaled) % count;
  const next = (index + 1) % count;
  const t = scaled - Math.floor(scaled);
  const a = GENESIS_PALETTE[index];
  const b = GENESIS_PALETTE[next];
  const hsl: HslStop = {
    h: lerpHue(a.h, b.h, t),
    s: lerp(a.s, b.s, t),
    l: lerp(a.l, b.l, t),
  };
  return { hsl: hslToString(hsl), hex: hslToHex(hsl) };
};

export const genesisAccentAtTime = (elapsedMs: number) =>
  interpolateGenesisAccent(elapsedMs / GENESIS_CYCLE_MS);
