
CREATE TABLE public.pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  query TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  initial_input TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipelines public read" ON public.pipelines FOR SELECT USING (true);
CREATE POLICY "pipelines public insert" ON public.pipelines FOR INSERT WITH CHECK (true);
CREATE POLICY "pipelines public update" ON public.pipelines FOR UPDATE USING (true);
CREATE POLICY "pipelines public delete" ON public.pipelines FOR DELETE USING (true);

CREATE POLICY "executions public read" ON public.executions FOR SELECT USING (true);
CREATE POLICY "executions public insert" ON public.executions FOR INSERT WITH CHECK (true);
CREATE POLICY "executions public update" ON public.executions FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.executions;
ALTER TABLE public.executions REPLICA IDENTITY FULL;
