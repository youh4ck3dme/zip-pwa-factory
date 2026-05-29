import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useGenesisAccentCycle } from "@/hooks/useGenesisAccentCycle";

describe("useGenesisAccentCycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial HSL string when mounted", () => {
    const { result } = renderHook(() => useGenesisAccentCycle());
    expect(result.current.accentHsl).toMatch(/^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/);
    expect(result.current.accentHex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("updates the color over time", () => {
    const { result } = renderHook(() => useGenesisAccentCycle());
    const initialColor = result.current.accentHsl;

    act(() => {
      // Advance time by 1000ms
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.accentHsl).not.toBe(initialColor);
    expect(result.current.accentHsl).toMatch(/^\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/);
  });

  it("clears interval on unmount", () => {
    const { unmount } = renderHook(() => useGenesisAccentCycle());
    
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
