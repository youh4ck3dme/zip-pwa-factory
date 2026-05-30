import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generatePipelineSpec } from "../services/pipeline-generator";
import { createClient } from "../integrations/supabase/client";

const INTENTS = [
  { value: "generate_pwa_manifest", label: "Generate PWA Manifest" },
  { value: "create_service_worker", label: "Create Service Worker" },
  { value: "optimize_assets", label: "Optimize Assets" },
  { value: "generate_icons", label: "Generate Icons" },
  { value: "deploy_pwa", label: "Deploy PWA" },
];

const supabase = createClient();

export function GenerateBar() {
  const [intent, setIntent] = useState("");
  const [input, setInput] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Please sign in to create a pipeline");
      }
      
      // Generate pipeline spec
      const pipelineSpec = await generatePipelineSpec(intent, {
        ...input,
        pwaMetadata: {
          name: input.name || "My PWA",
          shortName: input.shortName || "PWA",
          themeColor: input.themeColor || "#000000",
          backgroundColor: input.backgroundColor || "#ffffff",
          display: input.display || "standalone",
        }
      });
      
      // Save to Supabase
      const { data, error } = await supabase
        .from("pipelines")
        .insert({
          user_id: user.id,
          spec: pipelineSpec,
          pwa_config: input,
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Navigate to pipeline builder
      navigate(`/pipeline/${data.id}`);
    } catch (error: unknown) {
      console.error("Error:", error);
      setError(error.message || "Failed to create pipeline");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-50">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full p-2 border rounded bg-white text-black"
              required
            >
              <option value="">Select an intent...</option>
              {INTENTS.map((option) => (
                <option key={option.value} value={option.value} className="text-black">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {intent === "generate_pwa_manifest" && (
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="App Name"
                className="p-2 border rounded text-black"
                onChange={(e) => setInput({ ...input, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Short Name"
                className="p-2 border rounded text-black"
                onChange={(e) => setInput({ ...input, shortName: e.target.value })}
              />
              <input
                type="color"
                placeholder="Theme Color"
                className="p-2 border rounded h-10"
                onChange={(e) => setInput({ ...input, themeColor: e.target.value })}
              />
              <input
                type="color"
                placeholder="Background Color"
                className="p-2 border rounded h-10"
                onChange={(e) => setInput({ ...input, backgroundColor: e.target.value })}
              />
            </div>
          )}
          
          {intent === "create_service_worker" && (
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Cache Name"
                className="p-2 border rounded text-black"
                onChange={(e) => setInput({ ...input, cacheName: e.target.value })}
              />
              <select
                className="p-2 border rounded bg-white text-black"
                onChange={(e) => setInput({ ...input, cacheStrategy: e.target.value })}
              >
                <option value="">Cache Strategy</option>
                <option value="networkFirst">Network First</option>
                <option value="cacheFirst">Cache First</option>
                <option value="staleWhileRevalidate">Stale While Revalidate</option>
              </select>
            </div>
          )}
          
          {intent === "deploy_pwa" && (
            <div className="flex-1 grid grid-cols-2 gap-2">
              <select
                className="p-2 border rounded bg-white text-black"
                onChange={(e) => setInput({ ...input, provider: e.target.value })}
              >
                <option value="">Hosting Provider</option>
                <option value="vercel">Vercel</option>
                <option value="netlify">Netlify</option>
                <option value="github-pages">GitHub Pages</option>
              </select>
              <input
                type="text"
                placeholder="Build Command"
                className="p-2 border rounded text-black"
                onChange={(e) => setInput({ ...input, buildCommand: e.target.value })}
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !intent}
            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {isLoading ? "Generating..." : "Generate Pipeline"}
          </button>
        </div>
        
        {error && (
          <div className="mt-2 text-red-500 text-sm">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
