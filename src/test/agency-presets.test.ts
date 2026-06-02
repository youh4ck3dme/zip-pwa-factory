import { describe, expect, it } from "vitest";
import { DEMO_PROMPTS } from "../lib/agencyPromptPresets";

describe("Agency Prompt Presets", () => {
  it("has exactly 6 presets", () => {
    expect(DEMO_PROMPTS).toHaveLength(6);
  });

  DEMO_PROMPTS.forEach((preset) => {
    describe(`Preset: ${preset.label} (${preset.id})`, () => {
      const { prompt } = preset;

      it("has a prompt of at least 180 characters", () => {
        expect(prompt.length).toBeGreaterThanOrEqual(180);
      });

      it("contains business name anchor ('called ...')", () => {
        expect(prompt).toMatch(/\bcalled\s+/i);
      });

      it("contains 'hero headline'", () => {
        expect(prompt.toLowerCase()).toContain("hero headline");
      });

      it("contains a strong quoted CTA anchor", () => {
        // e.g. Strong "Book Your Cut" CTA
        expect(prompt).toMatch(/strong\s+["\u201c\u2018]([^"\u201d\u2019']+?)["\u201d\u2019']\s+CTA/i);
      });

      it("contains 'opening hours'", () => {
        expect(prompt.toLowerCase()).toContain("opening hours");
      });

      it("contains 'contact footer'", () => {
        expect(prompt.toLowerCase()).toContain("contact footer");
      });
    });
  });
});
