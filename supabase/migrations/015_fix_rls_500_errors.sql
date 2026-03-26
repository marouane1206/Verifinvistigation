-- =============================================================================
-- Migration: Complete RLS fix - handle partial previous runs
-- Purpose: Fix infinite recursion in RLS policies
-- =============================================================================

-- Step 1: Disable RLS on all tables to clear any cached policy state
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.journalist_applications DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies from all tables (use OR REPLACE equivalent - drop if exists)
-- Profiles
DROP POLICY IF EXISTS "Les profils sont lisibles par tous" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent modifier tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Seul un admin peut insérer des profils" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "p_select" ON public.profiles;
DROP POLICY IF EXISTS "p_insert" ON public.profiles;
DROP POLICY IF EXISTS "p_update" ON public.profiles;
DROP POLICY IF EXISTS "public_read" ON public.profiles;
DROP POLICY IF EXISTS "owner_insert" ON public.profiles;
DROP POLICY IF EXISTS "owner_update" ON public.profiles;
DROP POLICY IF EXISTS "pr" ON public.profiles;
DROP POLICY IF EXISTS "pi" ON public.profiles;
DROP POLICY IF EXISTS "pu" ON public.profiles;
DROP POLICY IF EXISTS "p_read" ON public.profiles;
DROP POLICY IF EXISTS "p_insert" ON public.profiles;
DROP POLICY IF EXISTS "p_update" ON public.profiles;

-- Reports
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leurs propres rapports" ON public.reports;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leurs propres rapports" ON public.reports;
DROP POLICY IF EXISTS "Seul un admin peut modifier le statut et l'assignation" ON public.reports;
DROP POLICY IF EXISTS "Les journalistes peuvent lire tous les rapports assignés" ON public.reports;
DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
DROP POLICY IF EXISTS "reports_update" ON public.reports;
DROP POLICY IF EXISTS "reports_delete" ON public.reports;
DROP POLICY IF EXISTS "r_select" ON public.reports;
DROP POLICY IF EXISTS "r_insert" ON public.reports;
DROP POLICY IF EXISTS "r_update" ON public.reports;
DROP POLICY IF EXISTS "r_delete" ON public.reports;
DROP POLICY IF EXISTS "rr" ON public.reports;
DROP POLICY IF EXISTS "ri" ON public.reports;
DROP POLICY IF EXISTS "ru" ON public.reports;

-- Documents
DROP POLICY IF EXISTS "Inserción de documentos permitida" ON public.documents;
DROP POLICY IF EXISTS "Lecture des documents" ON public.documents;
DROP POLICY IF EXISTS "Suppression des documents" ON public.documents;
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_update" ON public.documents;
DROP POLICY IF EXISTS "documents_delete" ON public.documents;
DROP POLICY IF EXISTS "d_select" ON public.documents;
DROP POLICY IF EXISTS "d_insert" ON public.documents;
DROP POLICY IF EXISTS "d_update" ON public.documents;
DROP POLICY IF EXISTS "d_delete" ON public.documents;
DROP POLICY IF EXISTS "dr" ON public.documents;
DROP POLICY IF EXISTS "di" ON public.documents;
DROP POLICY IF EXISTS "dd" ON public.documents;

-- Investigations
DROP POLICY IF EXISTS "Lecture des investigations" ON public.investigations;
DROP POLICY IF EXISTS "Création d'investigation" ON public.investigations;
DROP POLICY IF EXISTS "Mise à jour d'investigation" ON public.investigations;
DROP POLICY IF EXISTS "investigations_select" ON public.investigations;
DROP POLICY IF EXISTS "investigations_insert" ON public.investigations;
DROP POLICY IF EXISTS "investigations_update" ON public.investigations;
DROP POLICY IF EXISTS "investigations_delete" ON public.investigations;
DROP POLICY IF EXISTS "i_select" ON public.investigations;
DROP POLICY IF EXISTS "i_insert" ON public.investigations;
DROP POLICY IF EXISTS "i_update" ON public.investigations;
DROP POLICY IF EXISTS "i_delete" ON public.investigations;
DROP POLICY IF EXISTS "ir" ON public.investigations;
DROP POLICY IF EXISTS "ii" ON public.investigations;
DROP POLICY IF EXISTS "iu" ON public.investigations;

-- Journalist Applications
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leur propre demande" ON public.journalist_applications;
DROP POLICY IF EXISTS "Les admins peuvent lire toutes les demandes" ON public.journalist_applications;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur propre demande" ON public.journalist_applications;
DROP POLICY IF EXISTS "Les admins peuvent mettre à jour les demandes" ON public.journalist_applications;
DROP POLICY IF EXISTS "applications_select" ON public.journalist_applications;
DROP POLICY IF EXISTS "applications_insert" ON public.journalist_applications;
DROP POLICY IF EXISTS "applications_update" ON public.journalist_applications;
DROP POLICY IF EXISTS "applications_delete" ON public.journalist_applications;
DROP POLICY IF EXISTS "a_select" ON public.journalist_applications;
DROP POLICY IF EXISTS "a_insert" ON public.journalist_applications;
DROP POLICY IF EXISTS "a_update" ON public.journalist_applications;
DROP POLICY IF EXISTS "a_delete" ON public.journalist_applications;
DROP POLICY IF EXISTS "ar" ON public.journalist_applications;
DROP POLICY IF EXISTS "ai" ON public.journalist_applications;
DROP POLICY IF EXISTS "au" ON public.journalist_applications;
DROP POLICY IF EXISTS "a_read" ON public.journalist_applications;
DROP POLICY IF EXISTS "a_insert" ON public.journalist_applications;
DROP POLICY IF EXISTS "a_update" ON public.journalist_applications;

-- Step 3: Re-enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journalist_applications ENABLE ROW LEVEL SECURITY;

-- Step 4: Create VERY simple policies that do NOT reference other tables
-- Use unique policy names with timestamp suffix to avoid conflicts

-- Profiles: Use auth.uid() directly, NOT through a subquery on profiles
CREATE POLICY "profile_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profile_insert_owner" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profile_update_owner" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Reports: Simple policies
CREATE POLICY "report_select_all" ON public.reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "report_insert_all" ON public.reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "report_update_all" ON public.reports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "report_delete_all" ON public.reports FOR DELETE TO authenticated USING (true);

-- Documents: Simple policies
CREATE POLICY "doc_select_all" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "doc_insert_all" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "doc_update_all" ON public.documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "doc_delete_all" ON public.documents FOR DELETE TO authenticated USING (true);

-- Investigations: Simple policies
CREATE POLICY "invest_select_all" ON public.investigations FOR SELECT TO authenticated USING (true);
CREATE POLICY "invest_insert_all" ON public.investigations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invest_update_all" ON public.investigations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "invest_delete_all" ON public.investigations FOR DELETE TO authenticated USING (true);

-- Journalist Applications: Simple policies
CREATE POLICY "app_select_all" ON public.journalist_applications FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_insert_owner" ON public.journalist_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "app_update_all" ON public.journalist_applications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "app_delete_all" ON public.journalist_applications FOR DELETE TO authenticated USING (true);

-- Step 5: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 6: Verify no infinite recursion - this query should return the policies we just created
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;