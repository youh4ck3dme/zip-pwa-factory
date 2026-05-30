import { describe, expect, it } from "vitest";
import { interpolate, evaluateQualityGate } from "../../supabase/functions/_shared/pipeline-utils";

describe("Pipeline Execution Utils", () => {
  describe("interpolate", () => {
    it("replaces known keys with string values", () => {
      const result = interpolate("Hello {{name}}, you have {{count}} new messages.", {
        name: "Alice",
        count: "5"
      });
      expect(result).toBe("Hello Alice, you have 5 new messages.");
    });

    it("JSON-stringifies non-string values", () => {
      const result = interpolate("User config: {{config}}", {
        config: { theme: "dark" }
      });
      expect(result).toBe('User config: {"theme":"dark"}');
    });

    it("throws an error if a required key is missing", () => {
      expect(() => {
        interpolate("Missing {{undefinedKey}} here", { otherKey: "value" });
      }).toThrowError("Missing required context key: undefinedKey");
    });

    it("does nothing if there are no keys in the template", () => {
      const result = interpolate("No keys here", { some: "value" });
      expect(result).toBe("No keys here");
    });
  });

  describe("evaluateQualityGate", () => {
    it("passes when quality score is above or equal to threshold", () => {
      const result = evaluateQualityGate(0.85, 0.8);
      expect(result.passed).toBe(true);
      expect(result.warnings.length).toBe(0);
      
      const resultEqual = evaluateQualityGate(0.8, 0.8);
      expect(resultEqual.passed).toBe(true);
      expect(resultEqual.warnings.length).toBe(0);
    });

    it("fails and returns warnings when quality score is below threshold", () => {
      const result = evaluateQualityGate(0.75, 0.8);
      expect(result.passed).toBe(false);
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0]).toContain("below threshold 0.8");
    });
  });
});
