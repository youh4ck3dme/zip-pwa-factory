import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LogsView, StatusBadge } from "@/pages/Builder/components/LogsTab";
import { type Execution } from "@/lib/execution";

// Mock scrollIntoView which is not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mockExecution: Execution = {
  id: "exec-12345678",
  pipeline_id: "pipe-1",
  initial_input: "test input",
  status: "running",
  logs: [
    {
      stepId: "step-1",
      stepName: "Install Dependencies",
      outputKey: "deps",
      status: "completed",
      data: null,
      summary: "npm install successful",
      promptUsed: "",
      qualityScore: 1.0,
      warnings: [],
      durationMs: 10000,
    },
    {
      stepId: "step-2",
      stepName: "Run Tests",
      outputKey: "tests",
      status: "running",
      data: null,
      summary: undefined,
      promptUsed: "Run all tests",
      qualityScore: 1.0,
      warnings: [],
      durationMs: 0,
    }
  ],
  created_at: "2026-05-29T21:00:00Z",
  updated_at: "2026-05-29T21:00:11Z"
};

describe("LogsTab Component", () => {
  describe("LogsView", () => {
    it("renders empty state correctly when no execution is provided", () => {
      const { rerender } = render(<LogsView execution={null} running={false} />);
      expect(screen.getByTestId("empty-logs")).toHaveTextContent("Run the pipeline to see logs here.");

      rerender(<LogsView execution={null} running={true} />);
      expect(screen.getByTestId("empty-logs")).toHaveTextContent("Starting execution...");
    });

    it("renders execution details and logs correctly", () => {
      render(<LogsView execution={mockExecution} running={true} />);
      
      // Header execution id
      expect(screen.getByTestId("execution-id")).toHaveTextContent("exec-123");
      
      // Should show both steps
      expect(screen.getByText("Install Dependencies")).toBeInTheDocument();
      expect(screen.getByText("Run Tests")).toBeInTheDocument();
      
      // Should show outputs and prompts
      expect(screen.getByText("npm install successful")).toBeInTheDocument();
      expect(screen.getByText("Run all tests")).toBeInTheDocument();

      // Since running=true and execution.status=running, thinking indicator should be visible
      expect(screen.getByTestId("thinking-indicator")).toBeInTheDocument();
    });

    it("hides thinking indicator when execution is not running", () => {
      const completedExecution = { ...mockExecution, status: "completed" as const };
      render(<LogsView execution={completedExecution} running={false} />);
      expect(screen.queryByTestId("thinking-indicator")).not.toBeInTheDocument();
    });
  });

  describe("StatusBadge", () => {
    it("renders running status correctly", () => {
      render(<StatusBadge status="running" />);
      expect(screen.getByText("RUNNING")).toBeInTheDocument();
    });

    it("renders completed status correctly", () => {
      render(<StatusBadge status="completed" />);
      expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    });

    it("renders failed status correctly", () => {
      render(<StatusBadge status="failed" />);
      expect(screen.getByText("FAILED")).toBeInTheDocument();
    });
  });
});
