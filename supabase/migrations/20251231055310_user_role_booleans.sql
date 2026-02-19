-- Migration: Replace role enum with boolean capability columns
-- This enables users to have multiple roles simultaneously (e.g., both renter and venue_owner)

-- Step 1: Add new boolean columns with defaults (is_renter and is_venue_owner may already exist)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_renter BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_venue_owner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Migrate existing data from role enum to boolean columns
-- Since the database currently has 0 users, this migration is trivial
-- But we include it for safety in case there is any existing data
UPDATE users
SET 
  is_admin = (role = 'admin'),
  is_venue_owner = (role = 'venue_owner'),
  is_renter = (role = 'renter')
WHERE role IS NOT NULL;

-- Step 3: Drop and recreate RLS policies that reference the role column
-- Drop policies that check for admin role
DROP POLICY IF EXISTS "Admins can manage all availability" ON availability;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can manage all insurance documents" ON insurance_documents;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
DROP POLICY IF EXISTS "Admins can manage all recurring bookings" ON recurring_bookings;
DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;

-- Recreate policies using is_admin boolean instead of role enum
-- Note: These are recreated as permissive policies matching the original structure
-- You may need to adjust these based on your actual policy definitions

CREATE POLICY "Admins can manage all availability" ON availability
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can manage all bookings" ON bookings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can manage all insurance documents" ON insurance_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can view all subscriptions" ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can view all messages" ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can manage all recurring bookings" ON recurring_bookings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can manage all payments" ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Step 4: Drop the old role column
ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Step 5: Drop the user_role enum type (only if it exists and is not used elsewhere)
-- Note: This will fail if the enum is used in other tables/functions
-- If it fails, manually verify no other references exist
DROP TYPE IF EXISTS user_role;
;
