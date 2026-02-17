# Database Structure - Live Query Results

This document contains the actual database structure as queried via Supabase MCP.
Last updated: **2026-02-16** (audit: aligned with live Supabase).

## 📊 Database Overview

- **Total Tables**: 10 tables in `public` schema
- **RLS Status**: 10 tables with RLS enabled ✅
- **Extensions**: 
  - `uuid-ossp` (1.1) - UUID generation
  - `pgcrypto` (1.3) - Cryptographic functions
  - `pg_stat_statements` (1.11) - Query statistics
  - `pg_graphql` (1.5.11) - GraphQL support
  - `supabase_vault` (0.3.1) - Vault extension
  - `postgis` (3.3.7) - Spatial types (geography/geometry) for venue location

### Function Security Issues
Some functions have mutable `search_path` (Supabase security advisor):
- `log_audit_trail`
- `check_insurance_requirements_deprecated`
- `update_updated_at_column`

**Remediation**: Add `SET search_path = public` to the above functions. `handle_new_user` and the deprecated conflict/booking functions have already been fixed.

## 📋 Table Structures

### 1. `users` (RLS: ✅ Enabled, Rows: 0)

**Columns:**
- `id` (uuid, PK) → References `auth.users.id`
- `email` (text, UNIQUE, NOT NULL)
- `is_renter` (boolean, NOT NULL, DEFAULT: true)
- `is_venue_owner` (boolean, NOT NULL, DEFAULT: false)
- `is_admin` (boolean, NOT NULL, DEFAULT: false)
- `first_name` (text, nullable)
- `last_name` (text, nullable)
- `phone` (text, nullable)
- `created_at` (timestamptz, DEFAULT: now())
- `updated_at` (timestamptz, DEFAULT: now())

**Note:** Users can have multiple capabilities simultaneously (e.g., both `is_renter` and `is_venue_owner` can be true).

**Foreign Keys:**
- Referenced by: venues, bookings, recurring_bookings, insurance_documents, payments, messages, subscriptions, audit_logs

### 2. `venues` (RLS: ✅ Enabled, Rows: 0)

**Columns:**
- `id` (uuid, PK, DEFAULT: uuid_generate_v4())
- `name` (text, NOT NULL)
- `description` (text, nullable)
- `address` (text, NOT NULL)
- `city` (text, NOT NULL)
- `state` (text, NOT NULL)
- `zip_code` (text, NOT NULL)
- `latitude` (numeric, nullable)
- `longitude` (numeric, nullable)
- `owner_id` (uuid, NOT NULL) → References `users.id`
- `hourly_rate` (numeric, NOT NULL, CHECK: > 0)
- `weekend_rate` (numeric, nullable, CHECK: > 0) — Optional rate for weekend bookings (Sat/Sun). NULL means use standard hourly_rate.
- `instant_booking` (boolean, DEFAULT: false)
- `insurance_required` (boolean, DEFAULT: true)
- `max_advance_booking_days` (integer, DEFAULT: 180, CHECK: > 0)
- `photos` (text[], DEFAULT: '{}')
- `amenities` (text[], DEFAULT: '{}')
- `is_active` (boolean, DEFAULT: true)
- `location` (geography(Point, 4326), nullable) — PostGIS point for spatial queries. Populated from latitude/longitude. Use `ST_X(location::geometry)` for longitude, `ST_Y(location::geometry)` for latitude.
- `created_at` (timestamptz, DEFAULT: now())
- `updated_at` (timestamptz, DEFAULT: now())

**Foreign Keys:**
- Referenced by: availability, bookings, recurring_bookings, payments

### 3. `availability` (RLS: ✅ Enabled, Rows: 0)

**Columns:**
- `id` (uuid, PK, DEFAULT: uuid_generate_v4())
- `venue_id` (uuid, NOT NULL) → References `venues.id`
- `date` (date, NOT NULL)
- `start_time` (time, NOT NULL)
- `end_time` (time, NOT NULL)
- `is_available` (boolean, DEFAULT: true)
- `created_at` (timestamptz, DEFAULT: now())
- `updated_at` (timestamptz, DEFAULT: now())

**Constraints:**
- UNIQUE(venue_id, date, start_time, end_time)
- CHECK: start_time < end_time

### 4. `bookings` (RLS: ✅ Enabled, Rows: 0)

**Columns:**
- `id` (uuid, PK, DEFAULT: uuid_generate_v4())
- `venue_id` (uuid, NOT NULL) → References `venues.id`
- `renter_id` (uuid, NOT NULL) → References `users.id`
- `date` (date, NOT NULL, CHECK: date <= CURRENT_DATE + 180 days)
- `start_time` (time, NOT NULL)
- `end_time` (time, NOT NULL)
- `status` (booking_status enum: 'pending' | 'confirmed' | 'cancelled' | 'completed', DEFAULT: 'pending')
- `total_amount` (numeric, NOT NULL)
- `insurance_approved` (boolean, DEFAULT: false)
- `insurance_required` (boolean, DEFAULT: true)
- `recurring_type` (recurring_type enum: 'none' | 'weekly' | 'monthly', DEFAULT: 'none')
- `recurring_end_date` (date, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz, DEFAULT: now())
- `updated_at` (timestamptz, DEFAULT: now())

**Constraints:**
- CHECK: start_time < end_time

**Foreign Keys:**
- Referenced by: recurring_bookings, insurance_documents, payments, messages

### 5. `recurring_bookings` (RLS: ✅ Enabled)

**Columns:**
- `id` (uuid, PK, DEFAULT: uuid_generate_v4())
- `parent_booking_id` (uuid, NOT NULL) → References `bookings.id`
- `venue_id` (uuid, NOT NULL) → References `venues.id`
- `renter_id` (uuid, NOT NULL) → References `users.id`
- `date` (date, NOT NULL)
- `start_time` (time, NOT NULL)
- `end_time` (time, NOT NULL)
- `status` (booking_status enum, DEFAULT: 'pending')
- `total_amount` (numeric, NOT NULL)
- `insurance_approved` (boolean, DEFAULT: false)
- `created_at` (timestamptz, DEFAULT: now())
- `updated_at` (timestamptz, DEFAULT: now())

**Constraints:**
- CHECK: start_time < end_time

### 6. `insurance_documents` (RLS: ✅ Enabled, Rows: 0)

**Columns:**
- `id` (uuid, PK, DEFAULT: uuid_generate_v4())
- `booking_id` (uuid, NOT NULL) → References `bookings.id`
- `renter_id` (uuid, NOT NULL) → References `users.id`
- `document_url` (text, NOT NULL)
- `policy_number` (text, nullable)
- `coverage_amount` (numeric, nullable)
- `effective_date` (date, NOT NULL)
- `expiration_date` (date, NOT NULL)
- `status` (insurance_status enum: 'pending' | 'approved' | 'rejected' | 'needs_changes', DEFAULT: 'pending')
- `rejection_reason` (text, nullable)
- `reviewed_by` (uuid, nullable) → References `users.id`
- `reviewed_at` (timestamptz, nullable)
- `created_at` (timestamptz, DEFAULT: now())
- `updated_at` (timestamptz, DEFAULT: now())

**Constraints:**
- CHECK: effective_date < expiration_date

### 7. `payments` (RLS: ✅ Enabled)

**Columns:**
- `id` (uuid, PK, DEFAULT: uuid_generate_v4())
- `booking_id` (uuid, NOT NULL) → References `bookings.id`
- `renter_id` (uuid, NOT NULL) → References `users.id`
- `venue_id` (uuid, NOT NULL) → References `venues.id`
- `stripe_payment_intent_id` (text, nullable, UNIQUE)
- `stripe_setup_intent_id` (text, nullable, UNIQUE) — Card-on-file authorization for deferred payment (SetupIntent flow)
- `stripe_transfer_id` (text, nullable)
- `amount` (numeric, NOT NULL)
- `platform_fee` (numeric, NOT NULL, DEFAULT: 0)
- `venue_owner_amount` (numeric, NOT NULL)
- `status` (payment_status enum: 'pending' | 'authorized' | 'paid' | 'refunded' | 'failed', DEFAULT: 'pending')
- `paid_at` (timestamptz, nullable)
- `refunded_at` (timestamptz, nullable)
- `refund_amount` (numeric, nullable)
- `created_at` (timestamptz, DEFAULT: now())
- `updated_at` (timestamptz, DEFAULT: now())

### 8. `audit_logs` (RLS: ✅ Enabled, Rows: 0)

**Columns:**
- `id` (uuid, PK, DEFAULT: uuid_generate_v4())
- `table_name` (text, NOT NULL)
- `record_id` (uuid, NOT NULL)
- `action` (text, NOT NULL, CHECK: IN ('create', 'update', 'delete'))
- `old_values` (jsonb, nullable)
- `new_values` (jsonb, nullable)
- `user_id` (uuid, NOT NULL) → References `users.id`
- `created_at` (timestamptz, DEFAULT: now())

### 9. `subscriptions` (RLS: ✅ Enabled, Rows: 0)

**Columns:**
- `id` (uuid, PK, DEFAULT: uuid_generate_v4())
- `user_id` (uuid, NOT NULL) → References `users.id`
- `stripe_subscription_id` (text, nullable, UNIQUE)
- `stripe_customer_id` (text, nullable)
- `status` (text, NOT NULL)
- `current_period_start` (timestamptz, NOT NULL)
- `current_period_end` (timestamptz, NOT NULL)
- `trial_end` (timestamptz, nullable)
- `created_at` (timestamptz, DEFAULT: now())
- `updated_at` (timestamptz, DEFAULT: now())

**Constraints:**
- CHECK: current_period_start < current_period_end

### 10. `messages` (RLS: ✅ Enabled, Rows: 0)

**Columns:**
- `id` (uuid, PK, DEFAULT: uuid_generate_v4())
- `sender_id` (uuid, NOT NULL) → References `users.id`
- `recipient_id` (uuid, NOT NULL) → References `users.id`
- `booking_id` (uuid, nullable) → References `bookings.id`
- `subject` (text, nullable)
- `content` (text, NOT NULL)
- `is_read` (boolean, DEFAULT: false)
- `created_at` (timestamptz, DEFAULT: now())

## 🔧 Database Functions (from live DB)

Functions in `public` schema:

1. **`update_updated_at_column()`** - Auto-updates `updated_at` timestamps
2. **`log_audit_trail()`** - Creates audit log entries
3. **`handle_new_user()`** - Creates user profile after auth signup ✅ **Fixed 2026-01-09**
4. **`get_venues_with_next_available()`** - Returns active venues with coordinates and next available slot. Supports optional date and radius filtering via PostGIS.
5. **Deprecated (no longer used by triggers)** - `check_booking_conflicts_deprecated`, `check_recurring_booking_conflicts_deprecated`, `check_insurance_requirements_deprecated`, `check_cancellation_policy_deprecated`, `generate_recurring_bookings_deprecated`

### `handle_new_user()` Function Details

**Trigger**: `on_auth_user_created` (AFTER INSERT on `auth.users`)

This function automatically creates a user profile in `public.users` when a new user signs up via Supabase Auth (including Google OAuth).

**Current Implementation** (fixed 2026-01-09):
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, first_name, last_name,
    is_renter, is_venue_owner, is_admin,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 
             split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 
             NULLIF(regexp_replace(NEW.raw_user_meta_data->>'full_name', '^[^ ]+ ', ''), '')),
    true,   -- is_renter (default)
    false,  -- is_venue_owner
    false,  -- is_admin
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;
```

**Fix Applied**: The previous version referenced a non-existent `role` column (which was replaced by boolean flags in migration `20251231055310_user_role_booleans`). This caused "Database error saving new user" errors for all new user signups.

## ⚠️ Security Advisors Summary (as of 2026-02-16)

### Resolved:
- **RLS**: All 10 tables now have RLS enabled with policies ✅

### Warnings:
1. **Function Search Path**: 3 functions have mutable search_path — `log_audit_trail`, `check_insurance_requirements_deprecated`, `update_updated_at_column`
2. **Auth OTP Expiry**: Email OTP expiry exceeds 1 hour
3. **Leaked Password Protection**: Disabled
4. **Postgres Version**: Security patches available (17.4.1.074)

## ✅ Recent Fixes

### 2026-02-10: Payment status `authorized` and `stripe_setup_intent_id`
**Migration**: `add_authorized_payment_status_and_setup_intent`

- Added `authorized` to `payment_status` enum (for card-on-file / SetupIntent flow before capture)
- Added `stripe_setup_intent_id` column (text, nullable, UNIQUE) to `payments` for deferred payment flows

### 2026-01-21: Venue location (PostGIS) and `get_venues_with_next_available`
**Migrations**: `enable_postgis`, `add_venue_location_geography`, `create_get_venues_with_next_available`

- PostGIS extension enabled
- `venues.location` column (geography) added for spatial queries; populated from latitude/longitude
- `get_venues_with_next_available()` function for radius/distance filtering

### 2026-01-16: Added `weekend_rate` Column to Venues
**Migration**: `add_weekend_rate_to_venues`

**Purpose**: Allow venues to charge different rates on weekends (Saturday/Sunday).

**Change**: Added `weekend_rate` column (numeric, nullable, CHECK > 0) to the `venues` table.

**Usage**: If `weekend_rate` is NULL, the venue uses the standard `hourly_rate` for all days. If set, bookings on Saturday or Sunday use this rate instead.

### 2026-01-09: `handle_new_user()` Trigger Fix
**Migration**: `fix_handle_new_user_trigger`

**Problem**: The `handle_new_user()` function was referencing a `role` column that no longer exists (removed in `20251231055310_user_role_booleans` migration). This caused all new user signups via Google OAuth to fail with "Database error saving new user".

**Solution**: Updated the function to use the new boolean columns (`is_renter`, `is_venue_owner`, `is_admin`) and added `SET search_path = public` for security.

**Impact**: New users can now successfully sign up via Google OAuth. Users are created with `is_renter=true` by default.

## 📝 Next Steps

1. Fix function security: add `SET search_path = public` to `log_audit_trail`, `check_insurance_requirements_deprecated`, `update_updated_at_column`
2. Consider enabling Auth OTP expiry < 1 hour and leaked password protection in Supabase dashboard
3. Plan Postgres upgrade when security patches are available

