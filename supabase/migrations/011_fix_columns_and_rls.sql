-- Check what columns exist in profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- Add missing columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Check if the profile exists
SELECT id, email, username, created_at 
FROM public.profiles 
WHERE id = '9139e0b8-d7a2-47ed-aa64-a244ff063d93';

-- If not found, check auth.users
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE id = '9139e0b8-d7a2-47ed-aa64-a244ff063d93';

-- Now drop and recreate policies
DROP POLICY IF EXISTS "Les profils sont lisibles par tous" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent modifier tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Seul un admin peut insérer des profils" ON public.profiles;
DROP POLICY IF EXISTS "profiles_readable_by_authenticated_users" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admins_can_do_anything" ON public.profiles;

-- Disable and re-enable RLS cleanly
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies
CREATE POLICY "public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "owner_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "owner_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
