import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("utils/cn", () => {
  it("merges tailwind classes correctly", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("handles conditional classes", () => {
    expect(cn("bg-red-500", true && "text-white", false && "font-bold")).toBe("bg-red-500 text-white");
  });

  it("handles arrays of classes", () => {
    expect(cn(["bg-red-500", "text-white"])).toBe("bg-red-500 text-white");
  });

  it("resolves tailwind conflicts correctly using tailwind-merge", () => {
    // If we have px-2 and p-4, p-4 should override px-2 if it comes later
    expect(cn("px-2 py-1", "p-4")).toBe("p-4");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn("flex", undefined, null, "", "justify-center")).toBe("flex justify-center");
  });
});
