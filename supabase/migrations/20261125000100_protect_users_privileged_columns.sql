-- Stop users from granting themselves admin or venue-owner rights.
--
-- The "Users can update own profile" / "Users can insert own profile" RLS policies
-- only check that the row is the caller's, so any signed-in user could set
-- is_admin or is_venue_owner on their own row from the browser.
--
-- A column-level REVOKE would break sign-in, because finalizeAuthenticatedUser
-- upserts the row with is_admin/is_venue_owner on every login using the user's
-- session. Instead, for requests made as anon/authenticated, this trigger keeps
-- the existing values on UPDATE and forces them to false on INSERT.
-- service_role, postgres (SQL editor, migrations) and SECURITY DEFINER functions
-- such as handle_new_user() are not affected.

CREATE OR REPLACE FUNCTION public.protect_users_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_admin := false;
    NEW.is_venue_owner := false;
  ELSE
    NEW.is_admin := OLD.is_admin;
    NEW.is_venue_owner := OLD.is_venue_owner;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_users_privileged_columns ON public.users;

CREATE TRIGGER protect_users_privileged_columns
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_users_privileged_columns();
