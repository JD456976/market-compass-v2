
-- Fix 5: Harden agent-assets storage bucket
-- Add file size limit (5MB) and restrict to image MIME types only
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
WHERE id = 'agent-assets';

-- Drop the overly permissive upload policy
DROP POLICY IF EXISTS "Authenticated users can upload agent assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload agent assets" ON storage.objects;

-- Replace with user-folder-scoped upload policy
CREATE POLICY "Users can only upload to own folder in agent-assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agent-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add update/delete policies scoped to own folder (in case they're missing)
DROP POLICY IF EXISTS "Users can update own agent assets" ON storage.objects;
CREATE POLICY "Users can update own agent assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'agent-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own agent assets" ON storage.objects;
CREATE POLICY "Users can delete own agent assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'agent-assets'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
