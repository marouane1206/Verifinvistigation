-- =============================================================================
-- Migration: 001_add_force_password_change
-- Purpose: Add force_password_change flag and password_changed_at to profiles table
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Add force_password_change column to profiles table
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT TRUE;

-- -----------------------------------------------------------------------------
-- Step 2: Add password_changed_at column to profiles table
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

-- -----------------------------------------------------------------------------
-- Step 3: Create index on force_password_change for performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_force_password_change 
ON public.profiles(force_password_change) 
WHERE force_password_change = true;

-- -----------------------------------------------------------------------------
-- Step 4: Update the handle_new_user trigger to handle force_password_change
--         from user metadata
-- -----------------------------------------------------------------------------

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with force_password_change handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
    -- Déterminer le rôle et le statut basé sur le flag is_journalist
    DECLARE
        user_role TEXT := 'user';
        user_status TEXT := 'active';
        is_journalist_val BOOLEAN;
        force_pwd_change_val BOOLEAN;
    BEGIN
        -- Extract is_journalist as boolean (handles both string 'true' and boolean true)
        is_journalist_val := NEW.raw_user_meta_data->>'is_journalist';
        
        -- Extract force_password_change from user metadata
        -- Default to true if not specified (force password change on first login)
        force_pwd_change_val := COALESCE(
            (NEW.raw_user_meta_data->>'force_password_change')::BOOLEAN,
            true
        );
        
        -- If the flag is_journalist is true (boolean or string), set role as journalist and status as pending
        IF is_journalist_val = 'true' OR is_journalist_val = true THEN
            user_role := 'journalist';
            user_status := 'pending';
        -- Sinon, utiliser le rôle spécifié dans les métadonnées (si présent)
        ELSIF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
            user_role := NEW.raw_user_meta_data->>'role';
        END IF;
        
        INSERT INTO public.profiles (id, email, username, role, status, force_password_change)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
            user_role,
            user_status,
            force_pwd_change_val
        );
        RETURN NEW;
    END;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- End of migration
-- =============================================================================