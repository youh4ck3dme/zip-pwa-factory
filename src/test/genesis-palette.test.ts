import { describe, expect, it } from "vitest";
import { genesisAccentAtTime, GENESIS_CYCLE_MS } from "@/lib/genesis-palette";

describe("genesis-palette", () => {
  it("returns correct HSL format string", () => {
    const result = genesisAccentAtTime(0);
    expect(result.hsl).toMatch(/^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/);
    expect(result.hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("loops correctly after one full GENESIS_CYCLE_MS", () => {
    const colorAtStart = genesisAccentAtTime(0);
    const colorAtCycle = genesisAccentAtTime(GENESIS_CYCLE_MS);
    expect(colorAtStart.hsl).toBe(colorAtCycle.hsl);
  });

  it("interpolates colors correctly at mid-point between stops", () => {
    const color = genesisAccentAtTime(GENESIS_CYCLE_MS / 4);
    expect(color.hsl).toMatch(/^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/);
    expect(color.hsl).not.toBe(genesisAccentAtTime(0).hsl);
  });

  it("handles negative timestamps gracefully (usually shouldn't happen, but just in case)", () => {
    const color = genesisAccentAtTime(-1000);
    expect(color.hsl).toMatch(/^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/);
  });

  it("is deterministic (same timestamp yields same color)", () => {
    const t = 5000;
    expect(genesisAccentAtTime(t).hsl).toBe(genesisAccentAtTime(t).hsl);
  });
});
