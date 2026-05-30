import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createClient } from "../integrations/supabase/client";
import { Step, PipelineSpec } from "../types/pipeline";
import { validatePipelineSync } from "../services/spec-validator";

const supabase = createClient();

export function PipelineBuilder() {
  const params = useParams();
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<{ id: string; spec: PipelineSpec; pwa_config: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPipeline = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error("Please sign in to view pipelines");
        }
        
        const { data, error } = await supabase
          .from("pipelines")
          .select("*")
          .eq("id", params.id)
          .eq("user_id", user.id)
          .single();
        
        if (error) {
          throw error;
        }
        
        setPipeline(data);
      } catch (error: any) {
        console.error("Error fetching pipeline:", error);
        setError(error.message || "Failed to load pipeline");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPipeline();
  }, [params.id]);

  const handleExecute = async () => {
    if (!pipeline) return;
    
    setIsExecuting(true);
    setError(null);
    
    try {
      // Validate pipeline before execution
      validatePipelineSync(pipeline.spec);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Please sign in to execute pipeline");
      }
      
      // Trigger execution via Edge Function
      const executionResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-pipeline`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ pipelineId: pipeline.id, userId: user.id }),
        }
      );
      
      if (!executionResponse.ok) {
        throw new Error(await executionResponse.text());
      }
      
      const result = await executionResponse.json();
      
      // Navigate to execution page
      navigate(`/pipeline/${pipeline.id}/execution/${result.executionId}`);
    } catch (error: any) {
      console.error("Error executing pipeline:", error);
      setError(error.message || "Failed to execute pipeline");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleStepUpdate = (index: number, updatedStep: Step) => {
    if (!pipeline) return;
    
    const updatedSteps = [...pipeline.spec.steps];
    updatedSteps[index] = updatedStep;
    setPipeline({
      ...pipeline,
      spec: { ...pipeline.spec, steps: updatedSteps },
    });
  };

  const handleSave = async () => {
    if (!pipeline) return;
    
    try {
      // Validate pipeline
      validatePipelineSync(pipeline.spec);
      
      // Save to Supabase
      const { error } = await supabase
        .from("pipelines")
        .update({
          spec: pipeline.spec,
          pwa_config: pipeline.pwa_config,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pipeline.id);
      
      if (error) {
        throw error;
      }
      
      // Show success message
      setError("Pipeline saved successfully!");
      setTimeout(() => setError(null), 3000);
    } catch (error: any) {
      console.error("Error saving pipeline:", error);
      setError(error.message || "Failed to save pipeline");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="text-center py-8 text-red-500">{error || "Pipeline not found"}</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{pipeline.spec.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Save Pipeline
          </button>
          <button
            onClick={handleExecute}
            disabled={isExecuting}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isExecuting ? "Executing..." : "Run Pipeline"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Intent</h2>
        <p className="text-gray-600">{pipeline.spec.intent}</p>
        <h2 className="text-xl font-semibold mb-2 mt-4">Summary</h2>
        <p className="text-gray-600">{pipeline.spec.summary}</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Steps ({pipeline.spec.steps.length})</h2>
        {pipeline.spec.steps.map((step: Step, index: number) => (
          <div key={step.id} className="border rounded-lg p-4 bg-white text-black">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-medium">{step.title}</h3>
              <span className="text-sm text-gray-500">{step.type}</span>
            </div>
            <div className="mb-2">
              <strong>Prompt:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-x-auto">{step.prompt}</pre>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Expected Output:</strong> {step.expectedOutput}
              </div>
              <div>
                <strong>Output Key:</strong> {step.outputKey}
              </div>
              <div>
                <strong>Input Keys:</strong> {step.inputKeys.join(", ")}
              </div>
              {step.pwaConfig && (
                <div>
                  <strong>PWA Config:</strong> {JSON.stringify(step.pwaConfig)}
                </div>
              )}
            </div>
            
            {/* Step editor would go here */}
            <div className="mt-4">
              <button
                onClick={() => handleStepUpdate(index, step)}
                className="text-blue-600 text-sm hover:underline"
              >
                Edit Step
              </button>
            </div>
          </div>
        ))}
      </div>

      {pipeline.pwa_config && (
        <div className="mt-8 p-4 border rounded-lg bg-gray-50">
          <h3 className="font-semibold mb-2">PWA Configuration</h3>
          <pre className="text-sm overflow-x-auto">{JSON.stringify(pipeline.pwa_config, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
