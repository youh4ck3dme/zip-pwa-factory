import Dexie, { type Table } from "dexie";
import type { Step } from "@/store/useBuilderStore";

export interface LocalPipeline {
  id: string;
  title: string;
  query: string | null;
  owner_id: string;
  steps: Step[];
  updated_at: string;
}

export class PipelineDB extends Dexie {
  pipelines!: Table<LocalPipeline, string>;

  constructor() {
    super("PipelineDB");
    this.version(1).stores({
      pipelines: "id, updated_at", // Primary key and indexed props
    });
  }
}

export const db = new PipelineDB();
