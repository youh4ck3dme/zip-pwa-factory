import { ParticleHeadline } from "@/components/cinematic/ParticleHeadline";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("ParticleHeadline", () => {
  it("renders stable foreground text without color animation", () => {
    render(<ParticleHeadline text="SILK ROAD PIPELINE" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("text-foreground");
    expect(heading).not.toHaveClass("headline-ambient-glow");
    expect(heading.textContent).toContain("SILK");
    expect(heading.textContent).toContain("ROAD");
  });
});
