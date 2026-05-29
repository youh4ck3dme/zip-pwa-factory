import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const Index = lazy(() => import("./pages/Index.tsx"));
const Builder = lazy(() => import("./pages/Builder/index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

import { useSupabaseSync } from "@/hooks/useSupabaseSync";

const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  useSupabaseSync();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <SyncProvider>
            <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route
                  path="/pipeline/:id"
                  element={<RequireAuth><Builder /></RequireAuth>}
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </SyncProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
