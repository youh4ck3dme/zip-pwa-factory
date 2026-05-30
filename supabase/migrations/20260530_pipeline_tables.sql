-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  spec JSONB NOT NULL,
  pwa_config JSONB,  -- PWA-specific configurations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Executions table
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id UUID REFERENCES pipelines ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('queued', 'running', 'failed', 'completed')),
  logs JSONB,
  artifacts JSONB,
  pwa_assets JSONB,  -- Generated PWA assets (manifest, service worker, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
CREATE POLICY "RLS pipelines" ON pipelines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "RLS executions" ON executions FOR ALL USING (
  EXISTS (SELECT 1 FROM pipelines WHERE pipelines.id = executions.pipeline_id AND pipelines.user_id = auth.uid())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipelines_user_id ON pipelines(user_id);
CREATE INDEX IF NOT EXISTS idx_executions_pipeline_id ON executions(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);

-- Update updated_at timestamp on pipelines
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
