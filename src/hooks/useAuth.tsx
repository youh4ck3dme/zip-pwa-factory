/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async (userId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      if (!mounted) return;
      if (localStorage.getItem("dev_bypass") === "true") {
        setSession({ user: { id: "dev-bypass-user" } } as unknown as Session);
        setUser({ id: "dev-bypass-user", email: "dev@local" } as unknown as User);
        setIsAdmin(true);
        return;
      }
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const isAdminUser = await checkAdmin(s.user.id);
        if (mounted) setIsAdmin(isAdminUser);
      } else {
        if (mounted) setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      
      // Dev Bypass Logic
      if (localStorage.getItem("dev_bypass") === "true") {
        setSession({ user: { id: "dev-bypass-user" } } as unknown as Session);
        setUser({ id: "dev-bypass-user", email: "dev@local" } as unknown as User);
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // Standard Auth Flow
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const isAdminUser = await checkAdmin(s.user.id);
        if (mounted) {
          setIsAdmin(isAdminUser);
          setLoading(false);
        }
      } else {
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user, session, isAdmin, loading, signOut }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
