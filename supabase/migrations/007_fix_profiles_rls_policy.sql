-- =============================================================================
-- Migration: 007_fix_profiles_rls_policy
-- Purpose: Fix RLS policy for profiles table to ensure users can read their own profile
-- This addresses potential 400 errors when fetching profiles
-- =============================================================================

-- Drop existing policies on profiles table
DROP POLICY IF EXISTS "Les profils sont lisibles par tous" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent modifier tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Seul un admin peut insérer des profils" ON public.profiles;

-- Recreate RLS policies with simpler, more permissive rules
-- -----------------------------------------------------------------------------
-- Policy: Allow all authenticated users to read profiles
-- This is needed for the frontend to fetch user data on login
-- -----------------------------------------------------------------------------
CREATE POLICY " profiles_are_readable_by_authenticated_users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- -----------------------------------------------------------------------------
-- Policy: Allow users to insert their own profile (needed for signup trigger)
-- The trigger uses SECURITY DEFINER so this is mainly for safety
-- -----------------------------------------------------------------------------
CREATE POLICY "users_can_insert_own_profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- Policy: Allow users to update their own profile
-- -----------------------------------------------------------------------------
CREATE POLICY "users_can_update_own_profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- Policy: Allow admins to do anything
-- -----------------------------------------------------------------------------
CREATE POLICY "admins_can_do_anything"
    ON public.profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================================================
-- Add anon role permissions (for public access if needed)
-- =============================================================================

-- Allow anonymous users to read profiles (read-only)
-- Comment this out if you only want authenticated users to read profiles
-- CREATE POLICY "profiles_are_publicly_readable"
--     ON public.profiles FOR SELECT
--     TO anon
--     USING (true);

-- =============================================================================
-- End of migration
-- =============================================================================