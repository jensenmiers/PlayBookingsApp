-- Verification for migration 20261125000100_protect_users_privileged_columns.sql
--
-- Safe to run on production. Part 1 is read-only. Part 2 changes rows inside a
-- DO block that ALWAYS ends with RAISE EXCEPTION, so Postgres rolls back every
-- change it made. The exception message is the result:
--   "VERIFY PASSED ..."  -> the trigger works
--   "VERIFY FAILED ..."  -> lists what went wrong
--   "VERIFY ABORTED ..." -> no suitable user to test with
-- An "ERROR" status from the SQL editor or client is expected; read the message.


-- ─── Part 1: read-only checks ────────────────────────────────────────────────

-- Expect exactly one row, tgenabled = 'O' (enabled), BEFORE INSERT OR UPDATE.
SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'public.users'::regclass
  AND tgname = 'protect_users_privileged_columns';

-- Snapshot. Run again after Part 2; the numbers must be identical (proves the rollback).
SELECT count(*) FILTER (WHERE is_admin)       AS admins,
       count(*) FILTER (WHERE is_venue_owner) AS venue_owners,
       count(*)                               AS total_users
FROM public.users;


-- ─── Part 2: behaviour test (always rolled back) ─────────────────────────────

DO $verify$
DECLARE
  normal_id uuid;
  admin_id  uuid;
  admin_owner boolean;
  touched   integer;
  rec       record;
  failures  text := '';
BEGIN
  SELECT id INTO normal_id FROM public.users
  WHERE NOT is_admin AND NOT is_venue_owner ORDER BY created_at LIMIT 1;
  SELECT id, is_venue_owner INTO admin_id, admin_owner FROM public.users
  WHERE is_admin ORDER BY created_at LIMIT 1;

  IF normal_id IS NULL THEN
    RAISE EXCEPTION 'VERIFY ABORTED: no user with is_admin = false and is_venue_owner = false to test with';
  END IF;

  -- Test 1: a signed-in user tries to make themselves admin + venue owner while editing their phone.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', normal_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', normal_id::text, true);
  SET LOCAL ROLE authenticated;
  UPDATE public.users SET is_admin = true, is_venue_owner = true, phone = 'VERIFY-555' WHERE id = auth.uid();
  GET DIAGNOSTICS touched = ROW_COUNT;
  RESET ROLE;

  SELECT is_admin, is_venue_owner, phone INTO rec FROM public.users WHERE id = normal_id;
  IF touched <> 1 THEN
    failures := failures || format(' [T1: expected the update to reach 1 row as the user, got %s - test setup problem, not a trigger result]', touched);
  ELSE
    IF rec.is_admin THEN failures := failures || ' [T1: user made themselves admin]'; END IF;
    IF rec.is_venue_owner THEN failures := failures || ' [T1: user made themselves venue owner]'; END IF;
    IF rec.phone IS DISTINCT FROM 'VERIFY-555' THEN failures := failures || ' [T1: normal column (phone) did not save]'; END IF;
  END IF;

  -- Test 2: an admin signs in. The app's login upsert (src/services/authSessionService.ts)
  -- sends is_admin = false; the admin must keep their flags.
  IF admin_id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
    SET LOCAL ROLE authenticated;
    INSERT INTO public.users (id, email, is_renter, is_venue_owner, is_admin, updated_at)
    SELECT admin_id, u.email, true, false, false, now() FROM public.users u WHERE u.id = admin_id
    ON CONFLICT (id) DO UPDATE SET
      is_renter = EXCLUDED.is_renter,
      is_venue_owner = EXCLUDED.is_venue_owner,
      is_admin = EXCLUDED.is_admin,
      updated_at = EXCLUDED.updated_at;
    RESET ROLE;

    SELECT is_admin, is_venue_owner INTO rec FROM public.users WHERE id = admin_id;
    IF NOT rec.is_admin THEN failures := failures || ' [T2: admin lost is_admin on sign-in]'; END IF;
    IF rec.is_venue_owner IS DISTINCT FROM admin_owner THEN failures := failures || ' [T2: admin is_venue_owner changed on sign-in]'; END IF;
  END IF;

  -- Test 3: privileged roles (this session: postgres / service role) can still change the flags.
  UPDATE public.users SET is_venue_owner = true WHERE id = normal_id;
  SELECT is_venue_owner INTO rec FROM public.users WHERE id = normal_id;
  IF NOT rec.is_venue_owner THEN failures := failures || ' [T3: privileged role could not set is_venue_owner]'; END IF;

  IF failures = '' THEN
    RAISE EXCEPTION 'VERIFY PASSED (T1 escalation blocked, T2 %, T3 privileged update works). All changes rolled back.',
      CASE WHEN admin_id IS NULL THEN 'skipped: no admin user' ELSE 'admin kept flags on sign-in' END;
  ELSE
    RAISE EXCEPTION 'VERIFY FAILED:%. All changes rolled back.', failures;
  END IF;
END
$verify$;
