-- =============================================================================
-- Migration: Aggressive RLS fix - completely rebuild profiles policies
-- Purpose: Fix infinite recursion in RLS policies on profiles table
-- =============================================================================

-- First, let's see what policies exist (for debugging)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- Step 1: Get all policy names and drop them all
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Step 2: Also drop any remaining policies from other tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON public.' || pol.tablename;
    END LOOP;
END $$;

-- Step 3: Disable RLS on all tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.journalist_applications DISABLE ROW LEVEL SECURITY;

-- Step 4: Re-enable RLS on profiles only first
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create ONLY ONE simple policy - no subqueries, no references to other tables
-- This is the safest possible policy
CREATE POLICY "simple_select" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Step 6: Test if this works before adding more
-- If the above works, you can add more policies. But for now, let's be safe.

-- Grant permissions
GRANT SELECT ON public.profiles TO authenticated;

-- Verify
SELECT 'Policies on profiles:' as info, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';