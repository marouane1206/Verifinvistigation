-- Emergency fix: Disable RLS on profiles table temporarily to isolate the issue
-- Run this in Supabase SQL Editor

-- First, let's check what policies exist
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- Drop ALL policies on profiles
DROP POLICY IF EXISTS "Les profils sont lisibles par tous" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent modifier tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Seul un admin peut insérer des profils" ON public.profiles;
DROP POLICY IF EXISTS "profiles_readable_by_authenticated_users" ON public.profiles;
DROP POLICY IF EXISTS " profiles_are_readable_by_authenticated_users" ON public.profiles;
DROP POLICY IF EXISTS "profiles_are_readable_by_authenticated_users" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_do_anything" ON public.profiles;
DROP POLICY IF EXISTS "profiles_readable_by_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_can_be_read" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_manage_profiles" ON public.profiles;

-- Disable RLS temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable with a simple permissive policy
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple policy: everyone can read, only owner can insert/update
CREATE POLICY "public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "owner_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "owner_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Check the profile exists and is valid
SELECT id, email, role, status, created_at 
FROM public.profiles 
WHERE id = '9139e0b8-d7a2-47ed-aa64-a244ff063d93';

-- If not found, check if auth.users record exists
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE id = '9139e0b8-d7a2-47ed-aa64-a244ff063d93';
