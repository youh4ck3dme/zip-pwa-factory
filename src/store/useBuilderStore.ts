import { create } from "zustand";
import { type Execution } from "@/lib/execution";

export type Step = { id: string; name: string; prompt: string };
export type Pipeline = {
  id: string;
  title: string;
  query: string | null;
  steps: Step[];
  owner_id: string | null;
};
export type TabId = "workflow" | "code" | "logs";

interface BuilderState {
  pipeline: Pipeline | null;
  loading: boolean;
  tab: TabId;
  initialInput: string;
  running: boolean;
  execution: Execution | null;
  pastExecutions: Execution[];
  historyLimit: number;
  saving: boolean;
  dirty: boolean;
  
  setPipeline: (pipeline: Pipeline | null) => void;
  setLoading: (loading: boolean) => void;
  setTab: (tab: TabId) => void;
  setInitialInput: (input: string) => void;
  setRunning: (running: boolean) => void;
  setExecution: (execution: Execution | null) => void;
  setPastExecutions: (executions: Execution[]) => void;
  setHistoryLimit: (limit: number) => void;
  setSaving: (saving: boolean) => void;
  setDirty: (dirty: boolean) => void;
  
  updatePipeline: (updates: Partial<Pipeline>) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  pipeline: null,
  loading: true,
  tab: "workflow",
  initialInput: "",
  running: false,
  execution: null,
  pastExecutions: [],
  historyLimit: 10,
  saving: false,
  dirty: false,
  
  setPipeline: (pipeline) => set({ pipeline }),
  setLoading: (loading) => set({ loading }),
  setTab: (tab) => set({ tab }),
  setInitialInput: (initialInput) => set({ initialInput }),
  setRunning: (running) => set({ running }),
  setExecution: (execution) => set({ execution }),
  setPastExecutions: (pastExecutions) => set({ pastExecutions }),
  setHistoryLimit: (historyLimit) => set({ historyLimit }),
  setSaving: (saving) => set({ saving }),
  setDirty: (dirty) => set({ dirty }),
  
  updatePipeline: (updates) => set((state) => ({
    pipeline: state.pipeline ? { ...state.pipeline, ...updates } : null,
    dirty: true
  })),
}));
