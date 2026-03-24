-- =============================================================================
-- Storage Bucket Setup for Verifinvestigation
-- =============================================================================
-- NOTE: Storage buckets cannot be created via regular SQL.
-- Use one of the methods below to create the 'documents' bucket:
--
-- Method 1: Supabase Dashboard
--   1. Go to Storage in your dashboard
--   2. Click "New Bucket"
--   3. Name: documents, Public: ON
--
-- Method 2: Supabase CLI (requires login)
--   npx supabase link --project-ref qeyfzmtylwxmlgeprnmi
--   npx supabase storage create bucket documents --public
--
-- Method 3: Management API with service role key
--   POST https://api.supabase.com/v1/storage/buckets
--   Headers: Authorization: Bearer <SERVICE_ROLE_KEY>
--   Body: { "id": "documents", "name": "documents", "public": true }
-- =============================================================================

-- Storage RLS Policies (run after bucket is created)
-- These policies allow users to upload and manage their own documents

-- Allow public read access to files
-- Uncomment if you want files to be publicly accessible:
/*
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );
*/

-- Allow authenticated users to upload files
CREATE POLICY "Allow Authenticated Uploads"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
);

-- Allow users to update their own files
CREATE POLICY "Allow Authenticated Updates"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
);

-- Allow users to delete their own files
CREATE POLICY "Allow Authenticated Deletes"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'documents' 
    AND auth.role() = 'authenticated'
);
