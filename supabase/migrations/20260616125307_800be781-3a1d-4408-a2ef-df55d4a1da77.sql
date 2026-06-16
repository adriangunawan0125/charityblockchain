CREATE TABLE public.campaign_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, campaign_id)
);

GRANT SELECT, INSERT, DELETE ON public.campaign_bookmarks TO authenticated;
GRANT ALL ON public.campaign_bookmarks TO service_role;

ALTER TABLE public.campaign_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
  ON public.campaign_bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON public.campaign_bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON public.campaign_bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_campaign_bookmarks_user ON public.campaign_bookmarks(user_id);
CREATE INDEX idx_campaign_bookmarks_campaign ON public.campaign_bookmarks(campaign_id);