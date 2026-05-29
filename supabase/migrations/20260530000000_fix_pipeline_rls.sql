-- Drop old permissive policies on pipelines
DROP POLICY IF EXISTS "Pipelines readable by authenticated" ON public.pipelines;

-- New pipelines policy
CREATE POLICY "Pipelines readable by authenticated"
  ON public.pipelines FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
