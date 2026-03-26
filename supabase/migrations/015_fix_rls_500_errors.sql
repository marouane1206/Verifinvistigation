-- =============================================================================
-- Migration: Fix RLS policies causing 500 errors
-- Purpose: Simplify RLS policies to avoid circular references and 500 errors
-- =============================================================================

-- Drop existing problematic policies on profiles (use IF EXISTS to be safe)
DROP POLICY IF EXISTS "Les profils sont lisibles par tous" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Les admins peuvent modifier tous les profils" ON public.profiles;
DROP POLICY IF EXISTS "Seul un admin peut insérer des profils" ON public.profiles;

-- Drop existing problematic policies on reports
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leurs propres rapports" ON public.reports;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leurs propres rapports" ON public.reports;
DROP POLICY IF EXISTS "Seul un admin peut modifier le statut et l'assignation" ON public.reports;
DROP POLICY IF EXISTS "Les journalistes peuvent lire tous les rapports assignés" ON public.reports;

-- Drop existing problematic policies on documents
DROP POLICY IF EXISTS "Inserción de documentos permitida" ON public.documents;
DROP POLICY IF EXISTS "Lecture des documents" ON public.documents;
DROP POLICY IF EXISTS "Suppression des documents" ON public.documents;

-- Drop existing problematic policies on investigations
DROP POLICY IF EXISTS "Lecture des investigations" ON public.investigations;
DROP POLICY IF EXISTS "Création d'investigation" ON public.investigations;
DROP POLICY IF EXISTS "Mise à jour d'investigation" ON public.investigations;

-- Drop existing problematic policies on journalist_applications
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leur propre demande" ON public.journalist_applications;
DROP POLICY IF EXISTS "Les admins peuvent lire toutes les demandes" ON public.journalist_applications;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur propre demande" ON public.journalist_applications;
DROP POLICY IF EXISTS "Les admins peuvent mettre à jour les demandes" ON public.journalist_applications;

-- Only drop journalist_approval_tokens policies if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'journalist_approval_tokens' AND schemaname = 'public') THEN
        DROP POLICY IF EXISTS "Les admins peuvent lire tous les jetons d'approbation" ON public.journalist_approval_tokens;
        DROP POLICY IF EXISTS "Les admins peuvent créer des jetons d'approbation" ON public.journalist_approval_tokens;
        DROP POLICY IF EXISTS "Les admins peuvent mettre à jour les jetons d'approbation" ON public.journalist_approval_tokens;
    END IF;
END $$;

-- =============================================================================
-- Create simplified permissive RLS policies
-- =============================================================================

-- Profiles: Allow all authenticated users to read, only owner can modify
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Reports: Allow all authenticated users full access (simplified for now)
DROP POLICY IF EXISTS "reports_select" ON public.reports;
CREATE POLICY "reports_select" ON public.reports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "reports_insert" ON public.reports;
CREATE POLICY "reports_insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reports_update" ON public.reports;
CREATE POLICY "reports_update" ON public.reports FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "reports_delete" ON public.reports;
CREATE POLICY "reports_delete" ON public.reports FOR DELETE TO authenticated USING (true);

-- Documents: Allow all authenticated users full access
DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select" ON public.documents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "documents_update" ON public.documents;
CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "documents_delete" ON public.documents;
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated USING (true);

-- Investigations: Allow all authenticated users full access
DROP POLICY IF EXISTS "investigations_select" ON public.investigations;
CREATE POLICY "investigations_select" ON public.investigations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "investigations_insert" ON public.investigations;
CREATE POLICY "investigations_insert" ON public.investigations FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "investigations_update" ON public.investigations;
CREATE POLICY "investigations_update" ON public.investigations FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "investigations_delete" ON public.investigations;
CREATE POLICY "investigations_delete" ON public.investigations FOR DELETE TO authenticated USING (true);

-- Journalist Applications: Allow all authenticated users access
DROP POLICY IF EXISTS "applications_select" ON public.journalist_applications;
CREATE POLICY "applications_select" ON public.journalist_applications FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "applications_insert" ON public.journalist_applications;
CREATE POLICY "applications_insert" ON public.journalist_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "applications_update" ON public.journalist_applications;
CREATE POLICY "applications_update" ON public.journalist_applications FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "applications_delete" ON public.journalist_applications;
CREATE POLICY "applications_delete" ON public.journalist_applications FOR DELETE TO authenticated USING (true);

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify the policies are created
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;