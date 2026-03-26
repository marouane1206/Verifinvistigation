-- Complete fix for ALL RLS policies
-- Run this in Supabase SQL Editor

-- ============================================
-- Fix profiles table
-- ============================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_readable" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insertable" ON public.profiles;
DROP POLICY IF EXISTS "profiles_updatable" ON public.profiles;

CREATE POLICY "p_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "p_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "p_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- Fix reports table
-- ============================================
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_readable" ON public.reports;
DROP POLICY IF EXISTS "reports_insertable" ON public.reports;
DROP POLICY IF EXISTS "reports_updatable" ON public.reports;

CREATE POLICY "r_read" ON public.reports FOR SELECT USING (true);
CREATE POLICY "r_insert" ON public.reports FOR INSERT WITH CHECK (auth.uid() = created_by OR created_by IS NULL);
CREATE POLICY "r_update" ON public.reports FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = assigned_to);

-- ============================================
-- Fix documents table
-- ============================================
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_readable" ON public.documents;
DROP POLICY IF EXISTS "documents_insertable" ON public.documents;
DROP POLICY IF EXISTS "documents_deletable" ON public.documents;

CREATE POLICY "d_read" ON public.documents FOR SELECT USING (true);
CREATE POLICY "d_insert" ON public.documents FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "d_delete" ON public.documents FOR DELETE USING (auth.uid() = uploaded_by);

-- ============================================
-- Fix investigations table
-- ============================================
ALTER TABLE public.investigations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investigations_readable" ON public.investigations;
DROP POLICY IF EXISTS "investigations_insertable" ON public.investigations;
DROP POLICY IF EXISTS "investigations_updatable" ON public.investigations;

CREATE POLICY "i_read" ON public.investigations FOR SELECT USING (true);
CREATE POLICY "i_insert" ON public.investigations FOR INSERT WITH CHECK (true);
CREATE POLICY "i_update" ON public.investigations FOR UPDATE USING (true);

-- ============================================
-- Fix journalist_applications table
-- ============================================
ALTER TABLE public.journalist_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.journalist_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_readable" ON public.journalist_applications;
DROP POLICY IF EXISTS "applications_insertable" ON public.journalist_applications;
DROP POLICY IF EXISTS "applications_updatable" ON public.journalist_applications;

CREATE POLICY "a_read" ON public.journalist_applications FOR SELECT USING (true);
CREATE POLICY "a_insert" ON public.journalist_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "a_update" ON public.journalist_applications FOR UPDATE USING (auth.uid() = user_id);
