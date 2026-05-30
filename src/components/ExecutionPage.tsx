import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createClient } from "../integrations/supabase/client";
import { renderPWAArtifacts } from "../services/render-adapter";

const supabase = createClient();

export function ExecutionPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renderedAssets, setRenderedAssets] = useState<{
    manifest: string;
    serviceWorker: string;
    html: string;
    assets: Record<string, string>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExecution = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error("Please sign in to view executions");
        }
        
        // Get execution with pipeline
        const { data, error } = await supabase
          .from("executions")
          .select(`*, pipelines(*)`)
          .eq("id", params.executionId)
          .eq("pipelines.user_id", user.id)
          .single();
        
        if (error) {
          throw error;
        }
        
        setExecution(data);
        
        // Render artifacts if execution is completed
        if (data.status === "completed" && data.artifacts) {
          setRenderedAssets(renderPWAArtifacts(data.artifacts));
        }
      } catch (error: unknown) {
        console.error("Error fetching execution:", error);
        setError(error.message || "Failed to load execution");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExecution();
    
    // Poll for updates
    const interval = setInterval(fetchExecution, 5000);
    return () => clearInterval(interval);
  }, [params.executionId]);

  const handleDownloadAll = () => {
    if (!renderedAssets) return;
    
    // Create a ZIP file content
    const zipContent = Object.entries(renderedAssets.assets).map(([name, content]) => {
      return `---
${name}
${content}
`;
    }).join("");
    
    const blob = new Blob([zipContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pwa-artifacts-${params.executionId}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="text-center py-8">Loading execution details...</div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="text-center py-8 text-red-500">{error || "Execution not found"}</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Execution #{params.executionId}</h1>
          <button
            onClick={() => navigate(`/pipeline/${execution.pipeline_id}`)}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Back to Pipeline
          </button>
        </div>
        <div className="mt-2">
          <span className={`px-2 py-1 rounded text-sm ${
            execution.status === "completed" ? "bg-green-100 text-green-800" :
            execution.status === "running" ? "bg-blue-100 text-blue-800" :
            "bg-red-100 text-red-800"
          }`}>
            {execution.status.toUpperCase()}
          </span>
        </div>
        {execution.pipelines && (
          <div className="mt-4">
            <span className="text-gray-600">
              Pipeline: {execution.pipelines.title || execution.pipeline_id}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="space-y-2">
            {execution.logs?.map((log: Record<string, unknown>, index: number) => (
              <div key={index} className="p-2 border rounded bg-white text-black">
                <div className="flex justify-between">
                  <strong>{log.stepTitle || log.step_id}</strong>
                  <span className="text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <span className={`text-sm ${
                  log.status === "completed" ? "text-green-600" :
                  log.status === "failed" ? "text-red-600" : "text-gray-600"
                }`}>
                  {log.status}
                </span>
                {log.error && <div className="text-red-500 text-sm mt-1">{log.error}</div>}
              </div>
            )) || <div className="text-gray-500">No logs available</div>}
          </div>
        </div>

        {renderedAssets && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Generated PWA Artifacts</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Manifest (manifest.json)</h3>
                  <button
                    onClick={() => handleDownloadFile("manifest.json", renderedAssets.manifest)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Download
                  </button>
                </div>
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">{renderedAssets.manifest}</pre>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Service Worker (sw.js)</h3>
                  <button
                    onClick={() => handleDownloadFile("sw.js", renderedAssets.serviceWorker)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Download
                  </button>
                </div>
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">{renderedAssets.serviceWorker}</pre>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">HTML (index.html)</h3>
                  <button
                    onClick={() => handleDownloadFile("index.html", renderedAssets.html)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Download
                  </button>
                </div>
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">{renderedAssets.html.substring(0, 500)}{renderedAssets.html.length > 500 ? "..." : ""}</pre>
              </div>

              <div className="bg-blue-50 p-4 rounded">
                <h3 className="font-medium mb-2">Download All Artifacts</h3>
                <button
                  onClick={handleDownloadAll}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Download ZIP
                </button>
              </div>
            </div>
          </div>
        )}

        {execution.status === "running" && !renderedAssets && (
          <div className="lg:col-span-2 text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Pipeline is running, please wait...</p>
          </div>
        )}

        {execution.status === "failed" && (
          <div className="lg:col-span-2 bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-red-600 mb-2">Execution Failed</h3>
            <p className="text-red-700">{execution.error || "Unknown error occurred"}</p>
            <button
              onClick={() => navigate(`/pipeline/${execution.pipeline_id}`)}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Retry Pipeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
