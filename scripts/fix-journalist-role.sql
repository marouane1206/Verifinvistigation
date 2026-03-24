-- Script to fix journalist role registration
-- Run this in your Supabase SQL Editor

-- 1. First, let's see all current users and their roles
SELECT id, email, username, role, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- 2. Update ALL users with 'user' role to 'journalist' (for testing)
UPDATE profiles 
SET role = 'journalist' 
WHERE role = 'user';

-- 3. Verify the update
SELECT id, email, username, role, created_at 
FROM profiles 
ORDER BY created_at DESC;

-- 4. Update the database trigger to properly handle is_journalist flag
-- This ensures NEW registrations work correctly
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