-- =============================================================================
-- Migration: fix_journalist_application_insert_rls
-- Purpose: Fix RLS policy to allow inserting journalist applications 
--          even when user is not logged in (after signUp but before email confirmation)
-- =============================================================================

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur propre demande" ON public.journalist_applications;

-- Create a new INSERT policy that checks if the user exists in profiles table
-- This allows insertion when:
-- 1. The user is authenticated (logged in with valid session), OR
-- 2. The user_id exists in profiles (meaning they were just created via signUp)
CREATE POLICY "Les utilisateurs peuvent créer leur propre demande"
    ON public.journalist_applications FOR INSERT
    WITH CHECK (
        -- Allow if authenticated
        auth.uid() = user_id
        OR
        -- Allow if user exists in profiles (handles post-signUp, pre-email-confirmation)
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = user_id
        )
    );

-- =============================================================================
-- End of migration
-- =============================================================================
