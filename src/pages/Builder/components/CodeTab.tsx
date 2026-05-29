import { useMemo } from "react";
import { useBuilderStore } from "@/store/useBuilderStore";

export function CodeTab({ canEdit }: { canEdit: boolean }) {
  const pipeline = useBuilderStore((s) => s.pipeline);
  const codeJson = useMemo(() => JSON.stringify(pipeline, null, 2), [pipeline]);

  if (!canEdit) return null;

  return (
    <pre className="bg-card border border-border rounded-lg p-4 text-sm mono overflow-auto scrollbar-thin">
      {codeJson}
    </pre>
  );
}
