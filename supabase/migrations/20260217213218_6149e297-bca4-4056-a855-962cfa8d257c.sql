
-- Add recipient_email and claimed_by_user_id to sessions for report claiming
ALTER TABLE public.sessions 
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS claimed_by_user_id uuid;

-- Create index for fast lookups by recipient email
CREATE INDEX IF NOT EXISTS idx_sessions_recipient_email ON public.sessions (recipient_email) WHERE recipient_email IS NOT NULL;

-- Function: claim shared reports after login/signup
-- Matches user email to recipient_email OR client_name on shared sessions
-- Also creates agent_clients link if not exists
CREATE OR REPLACE FUNCTION public.claim_shared_reports(p_user_id uuid, p_email text, p_session_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session RECORD;
  v_claimed_count int := 0;
BEGIN
  p_email := lower(trim(p_email));

  -- If a specific session_id is provided, try to claim that one
  IF p_session_id IS NOT NULL THEN
    SELECT * INTO v_session
    FROM public.sessions
    WHERE id = p_session_id
      AND share_link_created = true
      AND share_token_revoked = false
      AND claimed_by_user_id IS NULL
      AND owner_user_id IS DISTINCT FROM p_user_id;

    IF FOUND THEN
      UPDATE public.sessions
      SET claimed_by_user_id = p_user_id
      WHERE id = v_session.id;
      
      v_claimed_count := v_claimed_count + 1;

      -- Create agent-client link if not exists
      INSERT INTO public.agent_clients (agent_user_id, client_user_id)
      VALUES (v_session.owner_user_id, p_user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Also claim any sessions where recipient_email matches
  FOR v_session IN
    SELECT * FROM public.sessions
    WHERE lower(trim(recipient_email)) = p_email
      AND share_link_created = true
      AND share_token_revoked = false
      AND claimed_by_user_id IS NULL
      AND owner_user_id IS DISTINCT FROM p_user_id
  LOOP
    UPDATE public.sessions
    SET claimed_by_user_id = p_user_id
    WHERE id = v_session.id;
    
    v_claimed_count := v_claimed_count + 1;

    -- Create agent-client link if not exists
    INSERT INTO public.agent_clients (agent_user_id, client_user_id)
    VALUES (v_session.owner_user_id, p_user_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'claimed_count', v_claimed_count);
END;
$$;
