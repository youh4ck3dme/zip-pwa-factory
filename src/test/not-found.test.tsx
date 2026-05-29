import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "@/pages/NotFound";
import { MemoryRouter } from "react-router-dom";

describe("NotFound Page", () => {
  it("renders 404 text and message", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Oops! Page not found")).toBeInTheDocument();
  });

  it("renders a link to return to home", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    const homeLink = screen.getByRole("link", { name: /Return to Home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.getAttribute("href")).toBe("/");
  });
});
