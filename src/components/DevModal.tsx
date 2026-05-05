import { useState } from "react";
import { Lock, Unlock, X } from "lucide-react";
import { useDeveloper } from "@/hooks/useDeveloper";

export function DevModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dev = useDeveloper();
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dev.login(pwd)) {
      setPwd("");
      setErr("");
    } else {
      setErr("Invalid password");
    }
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {dev.isDev ? <Unlock className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5" />}
            {dev.isDev ? "Developer Mode" : "Developer Access"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!dev.isDev ? (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the developer password to unlock pipeline editing.
            </p>
            <input
              type="password"
              autoFocus
              placeholder="Password..."
              className="w-full bg-background border border-border rounded-md p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
            />
            {err && <p className="text-destructive text-sm">{err}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md hover:bg-muted text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Unlock
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-md p-3 text-primary text-sm flex items-center gap-2">
              <Unlock className="h-4 w-4" /> Editing unlocked.
            </div>
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  dev.logout();
                  onClose();
                }}
                className="text-destructive hover:underline text-sm"
              >
                Lock & log out
              </button>
              <button
                onClick={onClose}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
