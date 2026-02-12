
-- Create report_messages table
CREATE TABLE public.report_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('client', 'agent')),
  sender_id text NOT NULL,
  body text NOT NULL,
  read_by_client_at timestamp with time zone,
  read_by_agent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.report_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can view messages on shared reports
CREATE POLICY "Anyone can view messages on shared reports"
ON public.report_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_messages.report_id
      AND s.share_token IS NOT NULL
      AND s.share_link_created = true
      AND s.share_token_revoked = false
  )
);

-- Agents can manage messages on own reports
CREATE POLICY "Agents can manage messages on own reports"
ON public.report_messages FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_messages.report_id
      AND (s.owner_user_id = auth.uid() OR s.owner_device_id IS NOT NULL)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_messages.report_id
      AND (s.owner_user_id = auth.uid() OR s.owner_device_id IS NOT NULL)
  )
);

-- Clients can insert messages on shared reports
CREATE POLICY "Clients can insert messages on shared reports"
ON public.report_messages FOR INSERT
WITH CHECK (
  sender_role = 'client'
  AND EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_messages.report_id
      AND s.share_token IS NOT NULL
      AND s.share_link_created = true
      AND s.share_token_revoked = false
  )
);

-- Clients can update read status on shared reports
CREATE POLICY "Clients can update read status on shared reports"
ON public.report_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_messages.report_id
      AND s.share_token IS NOT NULL
      AND s.share_link_created = true
      AND s.share_token_revoked = false
  )
);

-- Create report_scenarios table
CREATE TABLE public.report_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  created_by_role text NOT NULL CHECK (created_by_role IN ('client', 'agent')),
  created_by_id text NOT NULL,
  title text,
  note_to_agent text,
  scenario_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_to_agent boolean NOT NULL DEFAULT false,
  submitted_at timestamp with time zone,
  reviewed_status text CHECK (reviewed_status IN ('pending', 'reviewed', 'accepted', 'needs_changes')),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.report_scenarios ENABLE ROW LEVEL SECURITY;

-- Anyone can view scenarios on shared reports
CREATE POLICY "Anyone can view scenarios on shared reports"
ON public.report_scenarios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_scenarios.report_id
      AND s.share_token IS NOT NULL
      AND s.share_link_created = true
      AND s.share_token_revoked = false
  )
);

-- Agents can manage scenarios on own reports
CREATE POLICY "Agents can manage scenarios on own reports"
ON public.report_scenarios FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_scenarios.report_id
      AND (s.owner_user_id = auth.uid() OR s.owner_device_id IS NOT NULL)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_scenarios.report_id
      AND (s.owner_user_id = auth.uid() OR s.owner_device_id IS NOT NULL)
  )
);

-- Clients can insert scenarios on shared reports
CREATE POLICY "Clients can insert scenarios on shared reports"
ON public.report_scenarios FOR INSERT
WITH CHECK (
  created_by_role = 'client'
  AND EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_scenarios.report_id
      AND s.share_token IS NOT NULL
      AND s.share_link_created = true
      AND s.share_token_revoked = false
  )
);

-- Clients can update own scenarios on shared reports
CREATE POLICY "Clients can update own scenarios on shared reports"
ON public.report_scenarios FOR UPDATE
USING (
  created_by_role = 'client'
  AND EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = report_scenarios.report_id
      AND s.share_token IS NOT NULL
      AND s.share_link_created = true
      AND s.share_token_revoked = false
  )
);

-- Create email_queue table for queuing emails when provider isn't configured
CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  sent_at timestamp with time zone,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Only admins can view email queue
CREATE POLICY "Admins can manage email queue"
ON public.email_queue FOR ALL
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- Create indexes for performance
CREATE INDEX idx_report_messages_report_id ON public.report_messages(report_id);
CREATE INDEX idx_report_messages_created_at ON public.report_messages(created_at DESC);
CREATE INDEX idx_report_scenarios_report_id ON public.report_scenarios(report_id);
CREATE INDEX idx_report_scenarios_submitted ON public.report_scenarios(submitted_to_agent, reviewed_status);
CREATE INDEX idx_email_queue_status ON public.email_queue(status);
