-- Migration: Fix handle_new_user function to use boolean columns instead of deprecated role column
-- This fixes the "column 'role' of relation 'users' does not exist" error during new user signup

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create or replace the handle_new_user function with corrected schema
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    is_renter,
    is_venue_owner,
    is_admin,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULLIF(regexp_replace(NEW.raw_user_meta_data->>'full_name', '^[^ ]+ ', ''), '')),
    true,  -- Default: is_renter = true
    false, -- Default: is_venue_owner = false
    false, -- Default: is_admin = false
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add a comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a user profile in public.users when a new auth user is created. Updated to use boolean role flags (is_renter, is_venue_owner, is_admin) instead of deprecated role enum column.';;
