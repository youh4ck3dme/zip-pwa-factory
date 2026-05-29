import { ArrowDown, Plus, Trash2 } from "lucide-react";
import { useBuilderStore } from "@/store/useBuilderStore";

export function WorkflowTab({ canEdit }: { canEdit: boolean }) {
  const pipeline = useBuilderStore((s) => s.pipeline);
  const updatePipeline = useBuilderStore((s) => s.updatePipeline);

  if (!pipeline) return null;

  const updateStep = (idx: number, patch: Partial<{ name: string; prompt: string }>) => {
    const next = pipeline.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    updatePipeline({ steps: next });
  };

  const addStep = () => {
    updatePipeline({
      steps: [
        ...pipeline.steps,
        { id: crypto.randomUUID(), name: `Step ${pipeline.steps.length + 1}`, prompt: "{{previous_output}}" },
      ],
    });
  };

  const removeStep = (idx: number) => {
    updatePipeline({ steps: pipeline.steps.filter((_, i) => i !== idx) });
  };

  return (
    <section className="space-y-3">
      {pipeline.steps.map((step, idx) => (
        <div key={step.id}>
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold mono">
                {idx + 1}
              </div>
              {canEdit ? (
                <input
                  value={step.name}
                  onChange={(e) => updateStep(idx, { name: e.target.value })}
                  className="bg-transparent font-semibold outline-none focus:bg-muted/50 rounded px-2 py-1 -mx-2 flex-1"
                />
              ) : (
                <span className="font-semibold flex-1">{step.name}</span>
              )}
              {canEdit && pipeline.steps.length > 1 && (
                <button
                  onClick={() => removeStep(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remove step"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            {canEdit ? (
              <textarea
                value={step.prompt}
                onChange={(e) => updateStep(idx, { prompt: e.target.value })}
                rows={5}
                className="w-full bg-background border border-border rounded-md p-3 text-sm mono outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            ) : (
              <pre className="text-sm mono text-muted-foreground whitespace-pre-wrap bg-background/50 border border-border rounded-md p-3">
                {step.prompt}
              </pre>
            )}
          </div>
          {idx < pipeline.steps.length - 1 && (
            <div className="flex justify-center py-1 text-muted-foreground">
              <ArrowDown className="h-4 w-4" />
            </div>
          )}
        </div>
      ))}

      {canEdit && (
        <button
          onClick={addStep}
          className="w-full border border-dashed border-border rounded-lg py-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-card transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add step
        </button>
      )}
    </section>
  );
}
