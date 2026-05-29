import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 chars").max(72),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate("/", { replace: true });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Authentication failed";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const passkeySignIn = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
      if (data) {
        toast.success("Signed in with Biometrics!");
        navigate("/", { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : "Biometric sign-in failed. Please ensure you have registered a passkey first.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Home
          </Link>
          <h1 className="text-2xl font-bold">{mode === "signup" ? "Create account" : "Sign in"}</h1>
          <p className="text-sm text-muted-foreground">to Silk Road Pipeline</p>
        </div>

        <button
          type="button"
          onClick={passkeySignIn}
          disabled={busy}
          className="w-full bg-card border border-border hover:bg-muted text-foreground py-2.5 rounded-md font-medium disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <span>Fingerprint / Face ID</span>
        </button>

        {/* Development bypass button */}
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("dev_bypass", "true");
            window.location.href = "/"; // Force reload to trigger getSession bypass
          }}
          className="w-full bg-secondary/50 border border-border hover:bg-secondary text-secondary-foreground py-2.5 rounded-md font-medium flex items-center justify-center gap-2"
        >
          <span>dev. ----&gt;</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 border-t border-border" />
          OR
          <div className="flex-1 border-t border-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            required
            autoComplete="email"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary pr-10"
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <span className="text-xs font-semibold">{showPassword ? "HIDE" : "SHOW"}</span>
            </button>
          </div>
          {mode === "signin" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => toast.info("Forgot password flow is not implemented locally yet.")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-md font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already have an account? " : "No account? "}
          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="text-primary hover:underline"
          >
            {mode === "signup" ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
