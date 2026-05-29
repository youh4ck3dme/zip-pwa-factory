import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NavLink } from "@/components/NavLink";
import { MemoryRouter } from "react-router-dom";

describe("NavLink Component", () => {
  it("renders correctly with provided children", () => {
    render(
      <MemoryRouter>
        <NavLink to="/dashboard">Dashboard</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("applies active styles when the route matches", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NavLink to="/dashboard" activeClassName="text-primary">Dashboard</NavLink>
      </MemoryRouter>
    );
    const link = screen.getByRole("link");
    expect(link.className).toContain("text-primary");
  });

  it("applies inactive styles when the route does not match", () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <NavLink to="/dashboard" activeClassName="text-primary">Dashboard</NavLink>
      </MemoryRouter>
    );
    const link = screen.getByRole("link");
    expect(link.className).not.toContain("text-primary");
  });
});
