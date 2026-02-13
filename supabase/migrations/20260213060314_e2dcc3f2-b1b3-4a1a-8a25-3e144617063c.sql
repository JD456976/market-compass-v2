-- Add name fields to client_invitations for pre-populating signup
ALTER TABLE public.client_invitations
ADD COLUMN client_first_name text,
ADD COLUMN client_last_name text;