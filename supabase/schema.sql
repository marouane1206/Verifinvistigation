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
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'journalist', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected')),
    username TEXT UNIQUE NOT NULL,
    -- Extended journalist fields
    phone TEXT,
    media_outlet TEXT,
    journalist_id_number TEXT,
    years_experience INTEGER,
    specialization TEXT,
    portfolio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les recherches par username
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Index pour optimiser les recherches par role
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Index pour optimiser les recherches par status
CREATE INDEX idx_profiles_status ON public.profiles(status);

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
    -- Déterminer le rôle et le statut basé sur le flag is_journalist
    DECLARE
        user_role TEXT := 'user';
        user_status TEXT := 'active';
        is_journalist_val BOOLEAN;
    BEGIN
        -- Extract is_journalist as boolean (handles both string 'true' and boolean true)
        is_journalist_val := NEW.raw_user_meta_data->>'is_journalist';
        
        -- If the flag is_journalist is true (boolean or string), set role as journalist and status as pending
        IF is_journalist_val = 'true' OR is_journalist_val = true THEN
            user_role := 'journalist';
            user_status := 'pending';
        -- Sinon, utiliser le rôle spécifié dans les métadonnées (si présent)
        ELSIF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
            user_role := NEW.raw_user_meta_data->>'role';
        END IF;
        
        INSERT INTO public.profiles (id, email, username, role, status)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
            user_role,
            user_status
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
-- TABLE: journalist_applications
-- =============================================================================
-- Table des demandes d'inscription des journalistes en attente d'approbation
-- -----------------------------------------------------------------------------

CREATE TABLE public.journalist_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    media_outlet TEXT,
    journalist_id_number TEXT,
    years_experience INTEGER,
    specialization TEXT,
    portfolio_url TEXT,
    previous_work_samples TEXT,
    motivation TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les recherches par user_id
CREATE INDEX idx_journalist_applications_user_id ON public.journalist_applications(user_id);

-- Index pour optimiser les recherches par status
CREATE INDEX idx_journalist_applications_status ON public.journalist_applications(status);

-- Index pour optimiser les recherches par reviewed_by
CREATE INDEX idx_journalist_applications_reviewed_by ON public.journalist_applications(reviewed_by);

-- =============================================================================
-- TRIGGER: Mise à jour automatique du timestamp pour journalist_applications
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_journalist_application_timestamp()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_journalist_application_timestamp
    BEFORE UPDATE ON public.journalist_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_journalist_application_timestamp();

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

-- Politique: Les admins peuvent modifier tous les profils
CREATE POLICY "Les admins peuvent modifier tous les profils"
    ON public.profiles FOR UPDATE
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

-- -----------------------------------------------------------------------------
-- RLS pour la table journalist_applications
-- -----------------------------------------------------------------------------
ALTER TABLE public.journalist_applications ENABLE ROW LEVEL SECURITY;

-- Politique: Anyone can read (for public registration - viewing own application status)
CREATE POLICY "Les utilisateurs peuvent lire leur propre demande"
    ON public.journalist_applications FOR SELECT
    USING (user_id = auth.uid());

-- Politique: Only admins can read all applications
CREATE POLICY "Les admins peuvent lire toutes les demandes"
    ON public.journalist_applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politique: Only the user can insert their own application
CREATE POLICY "Les utilisateurs peuvent créer leur propre demande"
    ON public.journalist_applications FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Politique: Only admins can update (approve/reject)
CREATE POLICY "Les admins peuvent mettre à jour les demandes"
    ON public.journalist_applications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
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
-- FONCTIONS DE GESTION DES DEMANDES DE JOURNALISTES
-- =============================================================================

-- Fonction pour approuver une demande de journaliste
-- Met à jour le statut de la demande, les informations du profil et crée une nouvelle demande
CREATE OR REPLACE FUNCTION public.approve_journalist_application(
    p_application_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS void AS $
DECLARE
    v_application RECORD;
    v_admin_user_id UUID;
BEGIN
    -- Get the current admin user ID
    v_admin_user_id := auth.uid();
    
    -- Get the application details
    SELECT * INTO v_application
    FROM public.journalist_applications
    WHERE id = p_application_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    IF v_application.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not in pending status';
    END IF;
    
    -- Update the application status to approved
    UPDATE public.journalist_applications
    SET 
        status = 'approved',
        admin_notes = p_admin_notes,
        reviewed_by = v_admin_user_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_application_id;
    
    -- Update the user's profile to set role to journalist and status to active
    UPDATE public.profiles
    SET 
        role = 'journalist',
        status = 'active',
        updated_at = NOW()
    WHERE id = v_application.user_id;
    
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour rejeter une demande de journaliste
CREATE OR REPLACE FUNCTION public.reject_journalist_application(
    p_application_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS void AS $
DECLARE
    v_application RECORD;
    v_admin_user_id UUID;
BEGIN
    -- Get the current admin user ID
    v_admin_user_id := auth.uid();
    
    -- Get the application details
    SELECT * INTO v_application
    FROM public.journalist_applications
    WHERE id = p_application_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    IF v_application.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not in pending status';
    END IF;
    
    -- Update the application status to rejected
    UPDATE public.journalist_applications
    SET 
        status = 'rejected',
        admin_notes = p_admin_notes,
        reviewed_by = v_admin_user_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_application_id;
    
    -- Update the user's profile status to rejected
    UPDATE public.profiles
    SET 
        status = 'rejected',
        updated_at = NOW()
    WHERE id = v_application.user_id;
    
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le nombre de demandes en attente
CREATE OR REPLACE FUNCTION public.get_pending_applications_count()
RETURNS BIGINT AS $
    SELECT COUNT(*)::BIGINT
    FROM public.journalist_applications
    WHERE status = 'pending';
$ LANGUAGE sql STABLE;

-- =============================================================================
-- TABLE: journalist_approval_tokens
-- =============================================================================
-- Table des jetons d'approbation pour les demandes de journaliste
-- -----------------------------------------------------------------------------

CREATE TABLE public.journalist_approval_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES public.journalist_applications(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les recherches par token
CREATE INDEX idx_journalist_approval_tokens_token ON public.journalist_approval_tokens(token);

-- Index pour optimiser les recherches par application_id
CREATE INDEX idx_journalist_approval_tokens_application_id ON public.journalist_approval_tokens(application_id);

-- =============================================================================
-- TRIGGER: Mise à jour automatique du timestamp pour journalist_approval_tokens
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_journalist_approval_token_timestamp()
RETURNS TRIGGER AS $
BEGIN
    -- No update timestamp needed for this table, but keeping the function pattern
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- =============================================================================
-- RLS pour la table journalist_approval_tokens
-- =============================================================================

ALTER TABLE public.journalist_approval_tokens ENABLE ROW LEVEL SECURITY;

-- Politique: Les admins peuvent lire tous les jetons
CREATE POLICY "Les admins peuvent lire tous les jetons d'approbation"
    ON public.journalist_approval_tokens FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politique: Les admins peuvent insérer des jetons
CREATE POLICY "Les admins peuvent créer des jetons d'approbation"
    ON public.journalist_approval_tokens FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politique: Les admins peuvent mettre à jour les jetons
CREATE POLICY "Les admins peuvent mettre à jour les jetons d'approbation"
    ON public.journalist_approval_tokens FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================================================
-- FONCTIONS DE GESTION DES JETONS D'APPROBATION
-- =============================================================================

-- Fonction pour générer un jeton d'approbation
CREATE OR REPLACE FUNCTION public.create_approval_token(
    p_application_id UUID
)
RETURNS TEXT AS $
DECLARE
    v_token TEXT;
    v_token_record RECORD;
BEGIN
    -- Generate a secure random token
    v_token := encode(gen_random_bytes(32), 'hex');
    
    -- Insert the token with 7 days expiration
    INSERT INTO public.journalist_approval_tokens (
        application_id,
        token,
        expires_at
    )
    VALUES (
        p_application_id,
        v_token,
        NOW() + INTERVAL '7 days'
    )
    RETURNING id INTO v_token_record;
    
    RETURN v_token;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour valider un jeton d'approbation
CREATE OR REPLACE FUNCTION public.validate_approval_token(
    p_token TEXT
)
RETURNS UUID AS $
DECLARE
    v_application_id UUID;
BEGIN
    -- Find the token and check if it's valid
    SELECT id INTO v_application_id
    FROM public.journalist_approval_tokens
    WHERE token = p_token
      AND expires_at > NOW()
      AND used_at IS NULL;
    
    IF v_application_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired token';
    END IF;
    
    RETURN v_application_id;
END;
$ LANGUAGE plpgsql;

-- Fonction pour marquer un jeton comme utilisé
CREATE OR REPLACE FUNCTION public.mark_token_as_used(
    p_token TEXT
)
RETURNS void AS $
BEGIN
    UPDATE public.journalist_approval_tokens
    SET used_at = NOW()
    WHERE token = p_token;
END;
$ LANGUAGE plpgsql;

-- =============================================================================
-- FONCTION D'APPROBATION AVEC JETON (pour une-click approval)
-- =============================================================================

-- Fonction pour approuver une demande de journaliste via jeton
CREATE OR REPLACE FUNCTION public.approve_journalist_application_by_token(
    p_token TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS void AS $
DECLARE
    v_application RECORD;
    v_token_record RECORD;
    v_admin_user_id UUID;
BEGIN
    -- Get the current admin user ID if available
    BEGIN
        v_admin_user_id := auth.uid();
    EXCEPTION
        WHEN OTHERS THEN
            v_admin_user_id := NULL;
    END;
    
    -- Validate the token
    SELECT jat.application_id INTO v_token_record
    FROM public.journalist_approval_tokens jat
    WHERE jat.token = p_token
      AND jat.expires_at > NOW()
      AND jat.used_at IS NULL;
    
    IF v_token_record IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired token';
    END IF;
    
    -- Get the application details
    SELECT * INTO v_application
    FROM public.journalist_applications
    WHERE id = v_token_record.application_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    IF v_application.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not in pending status';
    END IF;
    
    -- Update the application status to approved
    UPDATE public.journalist_applications
    SET 
        status = 'approved',
        admin_notes = p_admin_notes,
        reviewed_by = v_admin_user_id,
        reviewed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_application.id;
    
    -- Update the user's profile to set role to journalist and status to active
    UPDATE public.profiles
    SET 
        role = 'journalist',
        status = 'active',
        updated_at = NOW()
    WHERE id = v_application.user_id;
    
    -- Mark the token as used
    UPDATE public.journalist_approval_tokens
    SET used_at = NOW()
    WHERE token = p_token;
    
END;
$ LANGUAGE plpgsql;

-- =============================================================================
-- FIN DU SCHÉMA
-- =============================================================================