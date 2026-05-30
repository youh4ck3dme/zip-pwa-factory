import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Dashboard from "@/pages/Dashboard";
import { MemoryRouter } from "react-router-dom";
import * as authHook from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      registerPasskey: vi.fn()
    }
  }
}));

describe("Dashboard Page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default user
    vi.spyOn(authHook, "useAuth").mockReturnValue({ user: { id: "1" } } as unknown);
  });

  it("renders loading state initially", () => {
    const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockOrder = vi.fn().mockReturnValue({ select: mockSelect });
    (supabase.from as unknown).mockReturnValue({ select: vi.fn().mockReturnValue({ order: mockOrder }) });
    
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    
    // Use container query or assume loading spinner is rendered until effect completes
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders empty state when no pipelines exist", async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as unknown).mockReturnValue({ select: mockSelect });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No pipelines yet")).toBeInTheDocument();
    });
  });

  it("renders a list of pipelines", async () => {
    const mockPipelines = [
      { id: "pipe-1", title: "Test Pipeline 1", updated_at: new Date().toISOString() },
      { id: "pipe-2", title: "Test Pipeline 2", updated_at: new Date(Date.now() - 100000).toISOString() }
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data: mockPipelines, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    (supabase.from as unknown).mockReturnValue({ select: mockSelect });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Pipeline 1")).toBeInTheDocument();
      expect(screen.getByText("Test Pipeline 2")).toBeInTheDocument();
    });
  });

  it("calls delete pipeline when trash icon is clicked", async () => {
    // Setup initial fetch
    const mockPipelines = [
      { id: "pipe-1", title: "Pipeline to delete", updated_at: new Date().toISOString() }
    ];
    const mockOrder = vi.fn().mockResolvedValue({ data: mockPipelines, error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    
    // Setup delete chain
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
    
    (supabase.from as unknown).mockImplementation((table: string) => {
      if (table === "pipelines") {
        return { select: mockSelect, delete: mockDelete };
      }
    });

    // Mock confirm
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Pipeline to delete")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTitle("Delete pipeline");
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "pipe-1");
    });
  });
});
