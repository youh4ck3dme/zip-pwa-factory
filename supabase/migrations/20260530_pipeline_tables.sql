-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns to pipelines
ALTER TABLE public.pipelines
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users,
  ADD COLUMN IF NOT EXISTS spec JSONB,
  ADD COLUMN IF NOT EXISTS pwa_config JSONB;

-- Add missing columns to executions
ALTER TABLE public.executions
  ADD COLUMN IF NOT EXISTS pwa_assets JSONB;

-- RLS Policies
DROP POLICY IF EXISTS "RLS pipelines" ON public.pipelines;
CREATE POLICY "RLS pipelines" ON public.pipelines FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "RLS executions" ON public.executions;
CREATE POLICY "RLS executions" ON public.executions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.pipelines WHERE public.pipelines.id = public.executions.pipeline_id AND public.pipelines.owner_id = auth.uid())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipelines_owner_id ON public.pipelines(owner_id);
CREATE INDEX IF NOT EXISTS idx_executions_pipeline_id ON public.executions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON public.executions(status);

-- Update updated_at timestamp on pipelines
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pipelines_updated_at ON public.pipelines;
CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
