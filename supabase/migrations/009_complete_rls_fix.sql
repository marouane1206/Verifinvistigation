-- Complete fix for profiles RLS - drop all and recreate cleanly
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing policies
DROP POLICY IF EXISTS "Les profils sont lisibles par tous" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent modifier tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Seul un admin peut insérer des profils" ON public.profiles;
DROP POLICY IF EXISTS "profiles_readable_by_authenticated_users" ON public.profiles;
DROP POLICY IF EXISTS " profiles_are_readable_by_authenticated_users" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_do_anything" ON public.profiles;
DROP POLICY IF EXISTS "profiles_readable_by_authenticated" ON public.profiles;

-- Step 2: Create clean policies
-- Allow authenticated users to read profiles
CREATE POLICY "profiles_can_be_read"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Allow users to insert their own profile (for signup triggers)
CREATE POLICY "users_can_insert_own_profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "users_can_update_own_profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Allow admins to manage all profiles
CREATE POLICY "admins_can_manage_profiles"
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
