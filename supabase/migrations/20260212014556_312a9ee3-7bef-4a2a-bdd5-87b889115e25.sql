
-- Add archived column to sessions table
ALTER TABLE public.sessions ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.sessions ADD COLUMN archived_at timestamp with time zone;
