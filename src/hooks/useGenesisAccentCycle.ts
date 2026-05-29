import { useEffect, useState } from "react";
import {
  GENESIS_PALETTE,
  GENESIS_CYCLE_MS,
  genesisAccentAtTime,
  hslToHex,
  hslToString,
} from "@/lib/genesis-palette";

export interface GenesisAccent {
  accentHsl: string;
  accentHex: string;
}

const DEFAULT: GenesisAccent = {
  accentHsl: hslToString(GENESIS_PALETTE[0]),
  accentHex: hslToHex(GENESIS_PALETTE[0]),
};

export const useGenesisAccentCycle = (): GenesisAccent => {
  const [accent, setAccent] = useState(DEFAULT);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setAccent(DEFAULT);
      return;
    }

    const start = performance.now();
    const interval = window.setInterval(() => {
      const elapsed = (performance.now() - start) % GENESIS_CYCLE_MS;
      const { hsl, hex } = genesisAccentAtTime(elapsed);
      setAccent({ accentHsl: hsl, accentHex: hex });
    }, 100);

    return () => window.clearInterval(interval);
  }, []);

  return accent;
};
