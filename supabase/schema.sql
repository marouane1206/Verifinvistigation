-- =============================================================================
-- Schema SQL pour Verifinvestigation.org
-- =============================================================================
-- Ce fichier contient la configuration complète de la base de données Supabase
-- incluant les tables, les contraintes, les index, les triggers et les politiques RLS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extension UUID
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: profiles
-- =============================================================================
-- Table des profils utilisateurs liée à auth.users
-- -----------------------------------------------------------------------------

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,  -- Added email field to match auth.users
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'journalist', 'admin')),
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les recherches par username
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Index pour optimiser les recherches par role
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- =============================================================================
-- TABLE: reports
-- =============================================================================
-- Table des signalements et demandes de vérification
-- -----------------------------------------------------------------------------

CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('signalement', 'verification')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours', 'termine')),
    is_anonymous BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les recherches par utilisateur créateur
CREATE INDEX idx_reports_created_by ON public.reports(created_by);

-- Index pour optimiser les recherches par utilisateur assigné
CREATE INDEX idx_reports_assigned_to ON public.reports(assigned_to);

-- Index pour optimiser les recherches par status
CREATE INDEX idx_reports_status ON public.reports(status);

-- Index pour optimiser les recherches par type
CREATE INDEX idx_reports_type ON public.reports(type);

-- =============================================================================
-- TABLE: documents
-- =============================================================================
-- Table des documents joints aux signalements
-- -----------------------------------------------------------------------------

CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les recherches par report_id
CREATE INDEX idx_documents_report_id ON public.documents(report_id);

-- Index pour optimiser les recherches par utilisateur uploadé
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);

-- =============================================================================
-- TABLE: investigations
-- =============================================================================
-- Table des résultats d'investigation
-- -----------------------------------------------------------------------------

CREATE TABLE public.investigations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
    journalist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    findings TEXT,
    is_public BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les recherches par report_id
CREATE INDEX idx_investigations_report_id ON public.investigations(report_id);

-- Index pour optimiser les recherches par journaliste
CREATE INDEX idx_investigations_journalist_id ON public.investigations(journalist_id);

-- Index pour optimiser les recherches des investigations publiées
CREATE INDEX idx_investigations_is_public ON public.investigations(is_public) WHERE is_public = true;

-- =============================================================================
-- TRIGGER: Création automatique du profil lors de l'inscription
-- =============================================================================
-- Fonction permettant de créer automatiquement un profil lors de la création
-- d'un utilisateur dans auth.users
-- -----------------------------------------------------------------------------

-- Fonction pour créer le profil automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
    -- Déterminer le rôle basé sur le flag is_journalist
    DECLARE
        user_role TEXT := 'user';
        is_journalist_val BOOLEAN;
    BEGIN
        -- Extract is_journalist as boolean (handles both string 'true' and boolean true)
        is_journalist_val := NEW.raw_user_meta_data->>'is_journalist';
        
        -- If the flag is_journalist is true (boolean or string), set role as journalist
        IF is_journalist_val = 'true' OR is_journalist_val = true THEN
            user_role := 'journalist';
        -- Sinon, utiliser le rôle spécifié dans les métadonnées (si présent)
        ELSIF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
            user_role := NEW.raw_user_meta_data->>'role';
        END IF;
        
        INSERT INTO public.profiles (id, email, username, role)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
            user_role
        );
        RETURN NEW;
    END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger qui exécute la fonction après chaque insertion dans auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- TRIGGER: Mise à jour automatique du timestamp
-- =============================================================================
-- Fonction pour mettre à jour automatiquement les colonnes updated_at
-- -----------------------------------------------------------------------------

-- Fonction pour les profiles
CREATE OR REPLACE FUNCTION public.update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour les profiles
CREATE TRIGGER update_profile_timestamp
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_profile_timestamp();

-- Fonction pour les reports
CREATE OR REPLACE FUNCTION public.update_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour les reports
CREATE TRIGGER update_report_timestamp
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.update_report_timestamp();

-- Fonction pour les investigations
CREATE OR REPLACE FUNCTION public.update_investigation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour les investigations
CREATE TRIGGER update_investigation_timestamp
    BEFORE UPDATE ON public.investigations
    FOR EACH ROW EXECUTE FUNCTION public.update_investigation_timestamp();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) - Politiques de sécurité au niveau des lignes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RLS pour la table profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Politique: Tous les utilisateurs peuvent lire les profils
CREATE POLICY "Les profils sont lisibles par tous"
    ON public.profiles FOR SELECT
    USING (true);

-- Politique: Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Politique: Seul un admin peut insérer de nouveaux profils (via trigger automatique)
CREATE POLICY "Seul un admin peut insérer des profils"
    ON public.profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR auth.uid() = id
    );

-- -----------------------------------------------------------------------------
-- RLS pour la table reports
-- -----------------------------------------------------------------------------
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent lire leurs propres rapports
CREATE POLICY "Les utilisateurs peuvent lire leurs propres rapports"
    ON public.reports FOR SELECT
    USING (
        created_by = auth.uid()
        OR assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('journalist', 'admin')
        )
    );

-- Politique: Les utilisateurs peuvent créer leurs propres rapports
CREATE POLICY "Les utilisateurs peuvent créer leurs propres rapports"
    ON public.reports FOR INSERT
    WITH CHECK (
        created_by = auth.uid()
        OR created_by IS NULL
    );

-- Politique: Seul un admin peut mettre à jour le statut et l'assignation
CREATE POLICY "Seul un admin peut modifier le statut et l'assignation"
    ON public.reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politique: Les journalistes peuvent lire tous les rapports qui leur sont assignés
CREATE POLICY "Les journalistes peuvent lire tous les rapports assignés"
    ON public.reports FOR SELECT
    USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- -----------------------------------------------------------------------------
-- RLS pour la table documents
-- -----------------------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Politique: Solo el propietario del informe puede agregar documentos
-- (ユーザーは自分のレポートにドキュメントを追加できる)
CREATE POLICY "Inserción de documentos permitida"
    ON public.documents FOR INSERT
    WITH CHECK (
        uploaded_by = auth.uid()
    );

-- Politique: Les utilisateurs peuvent lire leurs propres documents
CREATE POLICY "Lecture des documents"
    ON public.documents FOR SELECT
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = report_id
            AND (r.created_by = auth.uid() OR r.assigned_to = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('journalist', 'admin')
        )
    );

-- Politique: Les utilisateurs peuvent supprimer leurs propres documents
CREATE POLICY "Suppression des documents"
    ON public.documents FOR DELETE
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- -----------------------------------------------------------------------------
-- RLS pour la table investigations
-- -----------------------------------------------------------------------------
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;

-- Politique: Allow authenticated users to read investigations
CREATE POLICY "Lecture des investigations"
    ON public.investigations FOR SELECT
    USING (
        is_public = true
        OR auth.role() = 'authenticated'
    );

-- Politique: Les journalistes et admins peuvent créer des enquêtes
CREATE POLICY "Création d'investigation"
    ON public.investigations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('journalist', 'admin')
        )
    );

-- Politique: Les journalistes et admins peuvent mettre à jour les enquêtes
CREATE POLICY "Mise à jour d'investigation"
    ON public.investigations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('journalist', 'admin')
        )
    );

-- =============================================================================
-- FONCTIONS UTILITAIRES
-- =============================================================================

-- Fonction pour obtenir le rôle de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql STABLE;

-- Fonction pour vérifier si l'utilisateur est journaliste
CREATE OR REPLACE FUNCTION public.is_journalist()
RETURNS BOOLEAN AS $
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('journalist', 'admin')
    );
$ LANGUAGE sql STABLE;

-- =============================================================================
-- FIN DU SCHÉMA
-- =============================================================================