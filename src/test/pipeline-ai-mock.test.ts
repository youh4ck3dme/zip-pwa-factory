import { describe, expect, it } from "vitest";
import { buildMockCompletion, buildMockPipeline, hashQuery, truncateTitle } from "../../supabase/functions/_shared/ai-mock";

describe("pipeline AI mock", () => {
  const query = "Summarize customer feedback into action items";

  it("returns 3 steps with correct template placeholders", () => {
    const draft = buildMockPipeline(query);
    expect(draft.steps).toHaveLength(4);
    expect(draft.steps[0]?.prompt).toContain("{{input}}");
    expect(draft.steps[1]?.prompt).toContain("{{appSpec}}");
    expect(draft.steps[2]?.prompt).toContain("{{renderSpec}}");
    expect(draft.steps[3]?.prompt).toContain("{{validationResult}}");
  });

  it("uses truncated query as title", () => {
    const draft = buildMockPipeline(query);
    expect(draft.title).toBe(truncateTitle(query));
  });

  it("is deterministic for the same query", () => {
    const a = buildMockPipeline(query);
    const b = buildMockPipeline(query);
    expect(a).toEqual(b);
    expect(hashQuery(query)).toBe(hashQuery(query));
  });

  it("produces mock completion with step label and prompt preview", () => {
    const draft = buildMockPipeline(query);
    const resolved = draft.steps[0]!.prompt.replace("{{input}}", "Sample feedback text");
    const out = buildMockCompletion(resolved, draft.steps[0]!.name);
    expect(out).toContain("[MOCK step:");
    expect(out).toContain(draft.steps[0]!.name);
    expect(out).toContain("Sample feedback");
  });
});
