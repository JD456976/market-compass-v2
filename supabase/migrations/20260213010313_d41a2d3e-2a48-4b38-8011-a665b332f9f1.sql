-- Allow authenticated and anonymous uploads to agent-assets bucket
-- Since this app uses beta access (not Supabase Auth), we need permissive policies

-- Drop any existing restrictive policies on agent-assets
DROP POLICY IF EXISTS "Allow authenticated uploads to agent-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to agent-assets" ON storage.objects;

-- Allow anyone to upload to agent-assets (the app controls access via beta session)
CREATE POLICY "Allow uploads to agent-assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'agent-assets');

-- Allow anyone to update (upsert) files in agent-assets
CREATE POLICY "Allow updates to agent-assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'agent-assets');

-- Allow anyone to read from agent-assets (it's a public bucket, but explicit policy helps)
CREATE POLICY "Allow reads from agent-assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'agent-assets');

-- Allow deleting old assets
CREATE POLICY "Allow deletes from agent-assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'agent-assets');