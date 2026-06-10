-- 1. Extend existing tables
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'umum';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- Allow donations row to be updated by edge function (service role bypasses RLS anyway, but explicit policy = none needed for client UPDATE). No client UPDATE policy added on purpose.

-- 2. campaign_updates table
CREATE TABLE public.campaign_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaign_updates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_updates TO authenticated;
GRANT ALL ON public.campaign_updates TO service_role;
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Updates viewable by everyone" ON public.campaign_updates FOR SELECT USING (true);
CREATE POLICY "Admins create updates" ON public.campaign_updates FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete updates" ON public.campaign_updates FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 3. campaign_comments table
CREATE TABLE public.campaign_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaign_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_comments TO authenticated;
GRANT ALL ON public.campaign_comments TO service_role;
ALTER TABLE public.campaign_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by everyone" ON public.campaign_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users create comments" ON public.campaign_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or admin deletes comment" ON public.campaign_comments FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.donations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_updates;