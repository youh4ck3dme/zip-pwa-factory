import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RequireAuth } from "@/components/RequireAuth";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import * as authHook from "@/hooks/useAuth";

describe("RequireAuth", () => {
  it("shows loading spinner when auth is loading", () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({ user: null, loading: true } as unknown);
    
    render(
      <MemoryRouter>
        <RequireAuth>
          <div>Protected Content</div>
        </RequireAuth>
      </MemoryRouter>
    );
    
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /auth when user is not authenticated", () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({ user: null, loading: false } as unknown);
    
    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
          <Route path="/protected" element={<RequireAuth><div>Protected Content</div></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByTestId("auth-page")).toBeInTheDocument();
  });

  it("renders children when user is authenticated", () => {
    vi.spyOn(authHook, "useAuth").mockReturnValue({ user: { id: "1" }, loading: false } as unknown);
    
    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
          <Route path="/protected" element={<RequireAuth><div>Protected Content</div></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-page")).not.toBeInTheDocument();
  });
});
