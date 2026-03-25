-- =============================================================================
-- Migration: create_journalist_applications_and_fix_rls
-- Purpose: Create journalist_applications table and fix RLS policies
-- =============================================================================

-- Step 1: Create the journalist_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.journalist_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    media_outlet TEXT,
    journalist_id_number TEXT,
    years_experience INTEGER,
    specialization TEXT,
    portfolio_url TEXT,
    previous_work_samples TEXT,
    motivation TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add indexes
CREATE INDEX IF NOT EXISTS idx_journalist_applications_user_id ON public.journalist_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_journalist_applications_status ON public.journalist_applications(status);
CREATE INDEX IF NOT EXISTS idx_journalist_applications_reviewed_by ON public.journalist_applications(reviewed_by);

-- Step 3: Create timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_journalist_application_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger
DROP TRIGGER IF EXISTS update_journalist_application_timestamp ON public.journalist_applications;
CREATE TRIGGER update_journalist_application_timestamp
    BEFORE UPDATE ON public.journalist_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_journalist_application_timestamp();

-- Step 5: Enable RLS
ALTER TABLE public.journalist_applications ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies
-- Allow users to read their own applications
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leur propre demande" ON public.journalist_applications;
CREATE POLICY "Les utilisateurs peuvent lire leur propre demande"
    ON public.journalist_applications FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to read all applications
DROP POLICY IF EXISTS "Les admins peuvent lire toutes les demandes" ON public.journalist_applications;
CREATE POLICY "Les admins peuvent lire toutes les demandes"
    ON public.journalist_applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow users to insert their own applications
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur propre demande" ON public.journalist_applications;
CREATE POLICY "Les utilisateurs peuvent créer leur propre demande"
    ON public.journalist_applications FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Allow admins to update applications
DROP POLICY IF EXISTS "Les admins peuvent mettre à jour les demandes" ON public.journalist_applications;
CREATE POLICY "Les admins peuvent mettre à jour les demandes"
    ON public.journalist_applications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 7: Grant permissions
GRANT SELECT, INSERT ON public.journalist_applications TO authenticated;
GRANT SELECT ON public.journalist_applications TO anon;

-- =============================================================================
-- End of migration
-- =============================================================================