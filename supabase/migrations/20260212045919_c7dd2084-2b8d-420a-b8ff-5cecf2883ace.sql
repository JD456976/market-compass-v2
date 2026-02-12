
-- Agent branding table for custom report styling
CREATE TABLE public.agent_branding (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  logo_url text,
  headshot_url text,
  primary_color text DEFAULT '#2d3a4a',
  accent_color text DEFAULT '#c8842e',
  footer_text text,
  social_links jsonb DEFAULT '{}',
  report_template text DEFAULT 'modern',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own branding" ON public.agent_branding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own branding" ON public.agent_branding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own branding" ON public.agent_branding FOR UPDATE USING (auth.uid() = user_id);

-- Report feedback table
CREATE TABLE public.report_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL,
  share_token text NOT NULL,
  viewer_id text NOT NULL,
  rating text NOT NULL CHECK (rating IN ('helpful', 'not_helpful')),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.report_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback" ON public.report_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Session owners can view feedback" ON public.report_feedback FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sessions s 
    WHERE s.id = report_feedback.report_id 
    AND (s.owner_user_id = auth.uid() OR s.owner_device_id IS NOT NULL)
  ));
CREATE POLICY "Admins can view all feedback" ON public.report_feedback FOR SELECT USING (is_admin_user());

-- Storage bucket for agent assets (logos, headshots)
INSERT INTO storage.buckets (id, name, public) VALUES ('agent-assets', 'agent-assets', true);

CREATE POLICY "Users can upload own agent assets" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'agent-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own agent assets" ON storage.objects FOR UPDATE
  USING (bucket_id = 'agent-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Agent assets are publicly accessible" ON storage.objects FOR SELECT
  USING (bucket_id = 'agent-assets');

-- Trigger for updated_at on agent_branding
CREATE TRIGGER update_agent_branding_updated_at
  BEFORE UPDATE ON public.agent_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
