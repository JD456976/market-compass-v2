-- Create table for tracking shared report views (privacy-safe)
CREATE TABLE public.shared_report_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_token TEXT NOT NULL,
  report_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewer_id TEXT NOT NULL,
  user_agent TEXT NULL,
  device_type TEXT NULL,
  referrer TEXT NULL
);

-- Create index for efficient lookups
CREATE INDEX idx_shared_report_views_share_token ON public.shared_report_views(share_token);
CREATE INDEX idx_shared_report_views_report_id ON public.shared_report_views(report_id);
CREATE INDEX idx_shared_report_views_viewed_at ON public.shared_report_views(viewed_at DESC);
CREATE INDEX idx_shared_report_views_viewer_report ON public.shared_report_views(viewer_id, report_id);

-- Enable Row Level Security
ALTER TABLE public.shared_report_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert view events (anonymous tracking)
CREATE POLICY "Anyone can insert view events"
ON public.shared_report_views
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can view all view events
CREATE POLICY "Admins can view all events"
ON public.shared_report_views
FOR SELECT
USING (is_admin_user());

-- Policy: Session owners can view events for their reports
CREATE POLICY "Session owners can view their report events"
ON public.shared_report_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = report_id
    AND (s.owner_user_id = auth.uid() OR s.owner_device_id IS NOT NULL)
  )
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_report_views;