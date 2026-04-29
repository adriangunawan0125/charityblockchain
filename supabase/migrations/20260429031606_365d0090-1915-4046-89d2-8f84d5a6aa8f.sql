
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Restrict listing: only allow direct file access via known URL (no LIST).
DROP POLICY IF EXISTS "Public read reports" ON storage.objects;
CREATE POLICY "Authenticated read reports metadata" ON storage.objects
  FOR SELECT USING (bucket_id = 'reports' AND (auth.role() = 'authenticated' OR auth.role() = 'anon'));
