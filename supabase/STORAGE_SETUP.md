# Storage Bucket Setup

## Problem

The application is failing to upload documents with error: `StorageApiError: Bucket not found`

This means the "documents" storage bucket doesn't exist in your Supabase project.

## Solution

### Option 1: Create via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `qeyfzmtylwxmlgeprnmi`
3. Navigate to **Storage** (left sidebar)
4. Click **New Bucket** button
5. Configure:
   - **Name**: `documents`
   - **Public bucket**: Enable (toggle on)
   - **File size limit**: 50MB (recommended)
6. Click **Create Bucket**

### Option 2: Create via Supabase CLI

First, login to Supabase CLI:

```bash
npx supabase login
```

Then link to your project and create the bucket:

```bash
npx supabase link --project-ref qeyfzmtylwxmlgeprnmi
npx supabase storage create bucket documents --public
```

### Option 3: Using Service Role Key (Advanced)

If you have a service role key, you can use the Supabase Management API:

```bash
curl -X POST 'https://api.supabase.com/v1/storage/buckets' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "documents",
    "name": "documents",
    "public": true
  }'
```

## After Creating the Bucket

Once the bucket is created, you may need to add RLS policies for the storage bucket:

### RLS Policies for Storage

In Supabase Dashboard → Storage → Select "documents" bucket → Edit policies:

1. **Allow public reads** (if files should be publicly accessible):

   ```sql
   -- Allow anyone to view files
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'documents' );
   ```

2. **Allow authenticated users to upload**:

   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Authenticated Upload"
   ON storage.objects FOR INSERT
   WITH CHECK ( bucket_id = 'documents' AND auth.role() = 'authenticated' );
   ```

3. **Allow users to delete their own files**:
   ```sql
   -- Allow users to delete their own files
   CREATE POLICY "Delete Own Files"
   ON storage.objects FOR DELETE
   USING ( bucket_id = 'documents' AND auth.uid() = owner );
   ```

## Database Schema & RLS Fixes

If you encounter "400 Bad Request" or "406 Not Acceptable" errors, you may need to fix the database schema and RLS policies. Run this SQL in the Supabase SQL Editor:

### Fix 1: Add missing columns to investigations table

```sql
-- Add missing columns to investigations table
ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS journalist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Investigation';
ALTER TABLE public.investigations ADD COLUMN IF NOT EXISTS findings TEXT;

-- Add index for journalist_id
CREATE INDEX IF NOT EXISTS idx_investigations_journalist_id ON public.investigations(journalist_id);
```

### Fix 2: Update documents RLS policies

```sql
-- Drop existing documents policies
DROP POLICY IF EXISTS "Lecture des documents restreinte" ON public.documents;
DROP POLICY IF EXISTS "Insertion des documents restreinte au propriétaire" ON public.documents;
DROP POLICY IF EXISTS "Suppression des documents restreinte" ON public.documents;

-- Create simplified INSERT policy
CREATE POLICY "Inserción de documentos permitida"
    ON public.documents FOR INSERT
    WITH CHECK (uploaded_by = auth.uid());

-- Create SELECT policy
CREATE POLICY "Lecture des documents"
    ON public.documents FOR SELECT
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = report_id
            AND (r.created_by = auth.uid() OR r.assigned_to = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('journalist', 'admin')
        )
    );

-- Create DELETE policy
CREATE POLICY "Suppression des documents"
    ON public.documents FOR DELETE
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

### Fix 3: Update investigations RLS policies

```sql
-- Drop ALL existing investigations policies (use IF EXISTS to avoid errors)
DROP POLICY IF EXISTS "Le public peut lire les investigations publiées" ON public.investigations;
DROP POLICY IF EXISTS "Lecture complète des investigations" ON public.investigations;
DROP POLICY IF EXISTS "Lecture des investigations" ON public.investigations;
DROP POLICY IF EXISTS "Création d'investigation restreinte" ON public.investigations;
DROP POLICY IF EXISTS "Création d'investigation" ON public.investigations;
DROP POLICY IF EXISTS "Mise à jour d'investigation restreinte" ON public.investigations;
DROP POLICY IF EXISTS "Mise à jour d'investigation" ON public.investigations;

-- Recreate policies
CREATE POLICY "Lecture des investigations"
    ON public.investigations FOR SELECT
    USING (
        is_public = true
        OR auth.role() = 'authenticated'
    );

CREATE POLICY "Création d'investigation"
    ON public.investigations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('journalist', 'admin')
        )
    );

CREATE POLICY "Mise à jour d'investigation"
    ON public.investigations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('journalist', 'admin')
        )
    );
```

## Verify

After applying the fixes:

1. Refresh your application
2. Try submitting a report with an attachment
3. Try viewing investigation details
4. Check browser console - the errors should now be resolved
