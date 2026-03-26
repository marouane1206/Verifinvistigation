-- =============================================================================
-- Fix journalist registration - correct roles for users who registered as journalists
-- =============================================================================
-- This script finds users who have journalist applications but 'user' role,
-- and updates their profiles to have the correct role and status.
-- =============================================================================

-- First, let's see which users have journalist applications but 'user' role
SELECT 
    p.id as user_id,
    p.email,
    p.username,
    p.role as current_role,
    p.status as current_status,
    ja.id as application_id,
    ja.status as application_status,
    ja.full_name,
    ja.media_outlet
FROM public.profiles p
JOIN public.journalist_applications ja ON p.id = ja.user_id
WHERE p.role = 'user' 
AND ja.status IN ('pending', 'approved')
ORDER BY ja.created_at DESC;

-- Update profiles for users with pending journalist applications
-- Set role to 'journalist' and status to 'pending'
UPDATE public.profiles
SET role = 'journalist', status = 'pending'
WHERE id IN (
    SELECT p.id
    FROM public.profiles p
    JOIN public.journalist_applications ja ON p.id = ja.user_id
    WHERE p.role = 'user' 
    AND ja.status = 'pending'
);

-- Update profiles for users with approved journalist applications
-- Set role to 'journalist' and status to 'active'
UPDATE public.profiles
SET role = 'journalist', status = 'active'
WHERE id IN (
    SELECT p.id
    FROM public.profiles p
    JOIN public.journalist_applications ja ON p.id = ja.user_id
    WHERE p.role = 'user' 
    AND ja.status = 'approved'
);

-- Verify the changes
SELECT 
    id,
    email,
    username,
    role,
    status
FROM public.profiles
WHERE role = 'journalist'
ORDER BY updated_at DESC
LIMIT 20;
