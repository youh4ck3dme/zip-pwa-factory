import { render } from "@testing-library/react";
import GL from "../components/gl";
import { useIsMobile } from "../hooks/use-mobile";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { vi } from "vitest";

// Mock hooks
vi.mock("../hooks/use-mobile");
vi.mock("../hooks/use-reduced-motion");

describe("GL Component Optimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render static fallback on mobile with gl-canvas-container class", () => {
    (useIsMobile as vi.Mock).mockReturnValue(true);
    (useReducedMotion as vi.Mock).mockReturnValue(false);

    const { container } = render(<GL />);

    // Should render static fallback instead of canvas
    const glContainer = container.querySelector(".gl-canvas-container");
    expect(glContainer).toBeInTheDocument();
    expect(glContainer).toHaveStyle("will-change: transform");
    expect(glContainer).toHaveStyle("background: radial-gradient(ellipse at 50% 50%, var(--genesis-accent) / 0.1 0%, transparent 70%)");
  });

  it("should render static fallback when reduced motion is preferred", () => {
    (useIsMobile as vi.Mock).mockReturnValue(false);
    (useReducedMotion as vi.Mock).mockReturnValue(true);

    const { container } = render(<GL />);

    // Should render static fallback instead of canvas
    const glContainer = container.querySelector(".gl-canvas-container");
    expect(glContainer).toBeInTheDocument();
    expect(glContainer).toHaveStyle("will-change: transform");
  });

  it("should pass through custom className", () => {
    (useIsMobile as vi.Mock).mockReturnValue(true);
    (useReducedMotion as vi.Mock).mockReturnValue(false);

    const { container } = render(<GL className="custom-class" />);

    const glContainer = container.querySelector(".gl-canvas-container.custom-class");
    expect(glContainer).toBeInTheDocument();
  });
});
