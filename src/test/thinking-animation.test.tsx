import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThinkingAnimation } from "@/components/cinematic/ThinkingAnimation";

describe("ThinkingAnimation", () => {
  it("renders without crashing", () => {
    const { container } = render(<ThinkingAnimation />);
    expect(container).toBeInTheDocument();
  });

  it("contains processing text", () => {
    render(<ThinkingAnimation />);
    expect(screen.getByText(/Processing_/i)).toBeInTheDocument();
    expect(screen.getByText(/Constructing Pipeline/i)).toBeInTheDocument();
  });

  it("applies framer-motion classes correctly", () => {
    const { container } = render(<ThinkingAnimation />);
    const motionDiv = container.firstChild as HTMLElement;
    expect(motionDiv.className).toContain("overflow-hidden");
  });
});
