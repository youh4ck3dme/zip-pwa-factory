import { ArrowLeft, Code as CodeIcon, Loader2, Save, Shield, Terminal, Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { useBuilderStore, type TabId } from "@/store/useBuilderStore";

import { AvatarGroup } from "@/components/AvatarGroup";

export function PipelineHeader({ 
  canEdit, 
  isAdmin, 
  save, 
  saving 
}: { 
  canEdit: boolean; 
  isAdmin: boolean;
  save: () => void;
  saving: boolean;
}) {
  const pipeline = useBuilderStore((s) => s.pipeline);
  const tab = useBuilderStore((s) => s.tab);
  const dirty = useBuilderStore((s) => s.dirty);
  const setPipeline = useBuilderStore((s) => s.setPipeline);
  const setDirty = useBuilderStore((s) => s.setDirty);
  const setTab = useBuilderStore((s) => s.setTab);

  if (!pipeline) return null;

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {canEdit ? (
          <input
            value={pipeline.title}
            onChange={(e) => {
              setPipeline({ ...pipeline, title: e.target.value });
              setDirty(true);
            }}
            className="bg-transparent text-base sm:text-lg font-semibold outline-none focus:bg-muted/50 rounded px-2 py-1 -mx-2 flex-1 min-w-0"
          />
        ) : (
          <h1 className="text-base sm:text-lg font-semibold truncate flex-1">{pipeline.title}</h1>
        )}
        
        {/* Presence Avatars */}
        <AvatarGroup documentId={pipeline.id} />
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
              <Shield className="h-3 w-3" /> ADMIN
            </span>
          )}
          {canEdit && (
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="flex items-center gap-1.5 sm:gap-2 bg-muted hover:bg-accent text-foreground px-2.5 sm:px-3 py-1.5 rounded-md text-sm disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden sm:inline">Save</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex gap-1 border-b border-border -mb-px overflow-x-auto hide-scrollbar">
        {([
          { id: "workflow", label: "Workflow", icon: <Workflow className="h-4 w-4" /> },
          { id: "code", label: "Code", icon: <CodeIcon className="h-4 w-4" /> },
          { id: "logs", label: "Logs", icon: <Terminal className="h-4 w-4" /> },
        ] as const).map((t) => {
          const active = tab === t.id;
          const visible = t.id !== "code" || canEdit;
          if (!visible) return null;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as TabId)}
              className={`flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
