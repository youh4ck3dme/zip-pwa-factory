import { describe, expect, it } from "vitest";
import { ACTIVE_SECTION_COUNT, ACTIVE_SECTIONS } from "@/components/cinematic/sections";

describe("cinematic section smoke checks", () => {
  it("keeps exactly 2 active sections", () => {
    expect(ACTIVE_SECTION_COUNT).toBe(2);
    expect(ACTIVE_SECTIONS).toHaveLength(2);
  });

  it("keeps only Genesis and Neural Weaver in active flow", () => {
    expect(ACTIVE_SECTIONS[0]?.id).toBe("genesis");
    expect(ACTIVE_SECTIONS[1]?.id).toBe("neural-weaver");
    expect(ACTIVE_SECTIONS.map((section) => section.index)).toEqual([1, 2]);
  });
});
