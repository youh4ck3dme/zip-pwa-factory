import { describe, it, expect } from "vitest";
import { ACTIVE_SECTIONS } from "@/components/cinematic/sections";

/** Mirrors LiquidNavRail button indices: 0 .. total-1 */
const navIndices = (total: number) => Array.from({ length: total }, (_, i) => i);

/** Mirrors SectionShell registerRef slot with explicit navIndex */
const sectionShellSlot = (navIndex: number) => navIndex;

describe("nav rail indexing", () => {
  it("maps nav jump indices to registered ref slots for visible sections", () => {
    const total = ACTIVE_SECTIONS.length;
    const refs: Array<string | null> = [];

    // Genesis hardcoded at slot 0
    refs[0] = "genesis";

    ACTIVE_SECTIONS.slice(1).forEach((s, navIdx) => {
      const slot = sectionShellSlot(navIdx + 1);
      refs[slot] = s.id;
    });

    navIndices(total).forEach((navIdx) => {
      expect(refs[navIdx], `jump(${navIdx}) should resolve a section`).toBeTruthy();
    });
  });

  it("documents sparse-array failure when using raw section.index as slot", () => {
    const total = ACTIVE_SECTIONS.length;
    const refs: Array<string | null> = [];

    refs[0] = "genesis";
    ACTIVE_SECTIONS.slice(1).forEach((s) => {
      refs[s.index] = s.id; // buggy: uses raw index
    });

    // Nav index 1 is the second dot; with raw index neural-weaver lands at slot 2
    expect(refs[1]).toBeUndefined();
    expect(refs[2]).toBe("neural-weaver");
    expect(total).toBe(2);
  });
});
