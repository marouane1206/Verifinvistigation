-- Ultra-simple RLS fix - just adds minimal permissive policies
-- Run this in Supabase SQL Editor

-- 1. Check current policies on profiles
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';

-- 2. Fix profiles - add permissive policy if none exists
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Fix reports - same approach
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 4. Fix documents
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 5. Fix investigations
ALTER TABLE public.investigations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;

-- 6. Fix journalist_applications
ALTER TABLE public.journalist_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.journalist_applications ENABLE ROW LEVEL SECURITY;

-- 7. Add permissive policies (will work because RLS is now enabled)
-- These are short unique names
CREATE POLICY "pr" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "pi" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "pu" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "rr" ON public.reports FOR SELECT USING (true);
CREATE POLICY "ri" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "ru" ON public.reports FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "dr" ON public.documents FOR SELECT USING (true);
CREATE POLICY "di" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "dd" ON public.documents FOR DELETE USING (true);

CREATE POLICY "ir" ON public.investigations FOR SELECT USING (true);
CREATE POLICY "ii" ON public.investigations FOR INSERT WITH CHECK (true);
CREATE POLICY "iu" ON public.investigations FOR UPDATE USING (true);

CREATE POLICY "ar" ON public.journalist_applications FOR SELECT USING (true);
CREATE POLICY "ai" ON public.journalist_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "au" ON public.journalist_applications FOR UPDATE USING (true);
