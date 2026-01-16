# Database Structure - Live Query Results

This document contains the actual database structure as queried via Supabase MCP on **2025-01-15**.
Last updated: **2026-01-16** (added weekend_rate column to venues).

## 📊 Database Overview

- **Total Tables**: 10 tables in `public` schema
- **RLS Status**: 8 tables with RLS enabled, 2 tables with RLS disabled ⚠️
- **Extensions**: 
  - `uuid-ossp` (1.1) - UUID generation
  - `pgcrypto` (1.3) - Cryptographic functions
  - `pg_stat_statements` (1.11) - Query statistics
  - `pg_graphql` (1.5.11) - GraphQL support
  - `supabase_vault` (0.3.1) - Vault extension

## 🔴 Critical Security Issues

### RLS Disabled Tables
1. **`recurring_bookings`** - RLS is **DISABLED** ⚠️
2. **`payments`** - RLS is **DISABLED** ⚠️

**Action Required**: Enable RLS on these tables immediately!

### Function Security Issues
Most functions have mutable `search_path` which is a security risk:
- `check_booking_conflicts`
- `check_recurring_booking_conflicts`
- `check_insurance_requirements`
- `update_updated_at_column`
- `log_audit_trail`
- ~~`handle_new_user`~~ ✅ Fixed (2026-01-09)
- `generate_recurring_bookings`
- `check_cancellation_policy`

**Remediation**: Add `SET search_path = public` to all functions.

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

### 5. `recurring_bookings` (RLS: ❌ **DISABLED**, Rows: 0) ⚠️

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

**⚠️ SECURITY ISSUE**: RLS is disabled on this table!

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

### 7. `payments` (RLS: ❌ **DISABLED**, Rows: 0) ⚠️

**Columns:**
- `id` (uuid, PK, DEFAULT: uuid_generate_v4())
- `booking_id` (uuid, NOT NULL) → References `bookings.id`
- `renter_id` (uuid, NOT NULL) → References `users.id`
- `venue_id` (uuid, NOT NULL) → References `venues.id`
- `stripe_payment_intent_id` (text, nullable, UNIQUE)
- `stripe_transfer_id` (text, nullable)
- `amount` (numeric, NOT NULL)
- `platform_fee` (numeric, NOT NULL, DEFAULT: 0)
- `venue_owner_amount` (numeric, NOT NULL)
- `status` (payment_status enum: 'pending' | 'paid' | 'refunded' | 'failed', DEFAULT: 'pending')
- `paid_at` (timestamptz, nullable)
- `refunded_at` (timestamptz, nullable)
- `refund_amount` (numeric, nullable)
- `created_at` (timestamptz, DEFAULT: now())
- `updated_at` (timestamptz, DEFAULT: now())

**⚠️ SECURITY ISSUE**: RLS is disabled on this table!

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

## 🔧 Database Functions (from migration files)

Based on migration files, these functions should exist:

1. **`update_updated_at_column()`** - Auto-updates `updated_at` timestamps
2. **`check_booking_conflicts()`** - Validates booking time conflicts (deprecated, moved to API)
3. **`check_recurring_booking_conflicts()`** - Validates recurring booking conflicts (deprecated, moved to API)
4. **`log_audit_trail()`** - Creates audit log entries
5. **`handle_new_user()`** - Creates user profile after auth signup ✅ **Fixed 2026-01-09**
6. **`generate_recurring_bookings()`** - Generates recurring booking instances (deprecated, moved to API)
7. **`check_cancellation_policy()`** - Validates 48-hour cancellation window (deprecated, moved to API)
8. **`check_insurance_requirements()`** - Ensures insurance approval before confirmation (deprecated, moved to API)

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

## ⚠️ Security Advisors Summary

### Critical Issues:
1. **RLS Disabled**: `recurring_bookings`, `payments` tables
2. **Function Search Path**: 7 of 8 functions have mutable search_path (1 fixed: `handle_new_user`)
3. **Postgres Version**: Security patches available (17.4.1.074)

### Warnings:
1. **Auth OTP Expiry**: Email OTP expiry exceeds 1 hour
2. **Leaked Password Protection**: Disabled
3. **Postgres Version**: Has outstanding security patches

## ✅ Recent Fixes

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

1. **URGENT**: Enable RLS on `recurring_bookings` and `payments` tables
2. Fix function security by adding `SET search_path = public` to remaining 7 functions
3. Review and update RLS policies for the two disabled tables
4. Consider moving business logic from triggers to application code (as discussed)

