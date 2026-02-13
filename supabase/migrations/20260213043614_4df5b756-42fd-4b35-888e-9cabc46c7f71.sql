
-- Phase 1b: Client invitations, agent_clients, updated trigger

-- 1. Create client_invitations table
CREATE TABLE public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_email text NOT NULL,
  invite_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_user_id, client_email)
);

ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can manage own invitations"
  ON public.client_invitations FOR ALL
  USING (agent_user_id = auth.uid())
  WITH CHECK (agent_user_id = auth.uid());

CREATE POLICY "Anyone can view invitation by token"
  ON public.client_invitations FOR SELECT
  USING (true);

-- 2. Create agent_clients junction table
CREATE TABLE public.agent_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitation_id uuid REFERENCES public.client_invitations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_user_id, client_user_id)
);

ALTER TABLE public.agent_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own clients"
  ON public.agent_clients FOR SELECT
  USING (agent_user_id = auth.uid());

CREATE POLICY "Agents can manage own client links"
  ON public.agent_clients FOR ALL
  USING (agent_user_id = auth.uid())
  WITH CHECK (agent_user_id = auth.uid());

CREATE POLICY "Clients can view own agent links"
  ON public.agent_clients FOR SELECT
  USING (client_user_id = auth.uid());

-- 3. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_role app_role;
BEGIN
  SELECT * INTO v_invitation
  FROM public.client_invitations
  WHERE lower(trim(client_email)) = lower(trim(NEW.email))
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_role := 'client';
    
    UPDATE public.client_invitations
    SET status = 'accepted',
        accepted_by_user_id = NEW.id,
        accepted_at = now()
    WHERE id = v_invitation.id;
    
    INSERT INTO public.agent_clients (agent_user_id, client_user_id, invitation_id)
    VALUES (v_invitation.agent_user_id, NEW.id, v_invitation.id);
  ELSE
    v_role := 'agent';
  END IF;

  INSERT INTO public.profiles (user_id, email, full_name, brokerage)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'brokerage', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);
  
  RETURN NEW;
END;
$$;

-- 4. Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Updated_at trigger for client_invitations
CREATE TRIGGER update_client_invitations_updated_at
  BEFORE UPDATE ON public.client_invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Backfill existing users to 'agent' role where they only have 'user'
UPDATE public.user_roles SET role = 'agent' WHERE role = 'user';
