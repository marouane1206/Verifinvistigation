-- =============================================================================
-- Migration: 008_fix_profiles_rls_policy_v2
-- Purpose: Fix RLS policy for profiles table - addresses 500 errors
-- =============================================================================

-- First, let's drop ALL existing policies on profiles to start clean
DROP POLICY IF EXISTS "Les profils sont lisibles par tous" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent modifier tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Seul un admin peut insérer des profils" ON public.profiles;
DROP POLICY IF EXISTS "profiles_are_readable_by_authenticated_users" ON public.profiles;
DROP POLICY IF EXISTS " profiles_are_readable_by_authenticated_users" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_do_anything" ON public.profiles;

-- =============================================================================
-- RLS Policies for profiles table
-- =============================================================================

-- Policy 1: Allow authenticated users to SELECT (read) their own profile and other profiles
-- This is critical for login flow - fetching user profile after authentication
CREATE POLICY "profiles_readable_by_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow anon role to read profiles (optional - for public profile viewing)
-- Uncomment if you want public access to profiles
-- CREATE POLICY "profiles_readable_by_anon"
--     ON public.profiles FOR SELECT
--     TO anon
--     USING (true);

-- Policy 3: Allow users to INSERT their own profile (for trigger-based creation)
CREATE POLICY "users_can_insert_own_profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Policy 4: Allow users to UPDATE their own profile
CREATE POLICY "users_can_update_own_profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Policy 5: Allow admins to do anything with profiles
CREATE POLICY "admins_can_manage_all_profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================================================
-- Grant permissions to service role (if needed for edge functions)
-- =============================================================================

-- Note: service_role bypasses RLS, so no grants needed

-- =============================================================================
-- End of migration
-- =============================================================================
