
-- Report notes for agent-client communication
CREATE TABLE public.report_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  author_type text NOT NULL CHECK (author_type IN ('agent', 'client')),
  author_name text,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_notes ENABLE ROW LEVEL SECURITY;

-- Agents can manage notes on their own reports
CREATE POLICY "Agents can manage notes on own reports"
ON public.report_notes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_notes.report_id
    AND (s.owner_user_id = auth.uid() OR s.owner_device_id IS NOT NULL)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_notes.report_id
    AND (s.owner_user_id = auth.uid() OR s.owner_device_id IS NOT NULL)
  )
);

-- Clients can view notes on shared reports
CREATE POLICY "Anyone can view notes on shared reports"
ON public.report_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_notes.report_id
    AND s.share_token IS NOT NULL
    AND s.share_link_created = true
    AND s.share_token_revoked = false
  )
);

-- Clients can insert notes (feedback) on shared reports
CREATE POLICY "Anyone can add client notes on shared reports"
ON public.report_notes
FOR INSERT
WITH CHECK (
  author_type = 'client'
  AND EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_notes.report_id
    AND s.share_token IS NOT NULL
    AND s.share_link_created = true
    AND s.share_token_revoked = false
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_report_notes_updated_at
BEFORE UPDATE ON public.report_notes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
