import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
    }
  }
}));

function TestComponent() {
  const { user, session, isAdmin, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not Logged In</div>;
  return (
    <div>
      <div>Logged In As {user.id}</div>
      <div>Admin: {isAdmin ? "Yes" : "No"}</div>
    </div>
  );
}

describe("useAuth", () => {
  let authChangeCallback: (event: string, session: any) => void;

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock onAuthStateChange to capture the callback
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
      authChangeCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        })
      })
    });
  });

  it("provides initial unauthenticated state", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state is loading
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Wait for effect to finish
    await screen.findByText("Not Logged In");
  });

  it("provides authenticated state if session exists", async () => {
    const mockSession = { user: { id: "user-123" } };
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await screen.findByText("Logged In As user-123");
    expect(screen.getByText("Admin: No")).toBeInTheDocument();
  });

  it("checks admin role if user exists", async () => {
    const mockSession = { user: { id: "admin-123" } };
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession } });
    
    // Mock user_roles query
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { role: "admin" } });
    const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    (supabase.from as any).mockReturnValue({ select: vi.fn().mockReturnValue({ eq: mockEq1 }) });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await screen.findByText("Logged In As admin-123");
    expect(screen.getByText("Admin: Yes")).toBeInTheDocument();
  });

  it("updates state when auth state changes", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null } });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await screen.findByText("Not Logged In");

    // Trigger auth state change
    await act(async () => {
      authChangeCallback("SIGNED_IN", { user: { id: "new-user" } });
    });

    await screen.findByText("Logged In As new-user");
  });
});
